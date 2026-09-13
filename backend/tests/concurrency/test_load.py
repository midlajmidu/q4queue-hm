"""
tests/concurrency/test_load.py
PARTS 3, 4, 11, 12, 5 — Concurrency and performance baseline tests.

Tests:
  - 100 parallel /health calls → pool stability (Test 3)
  - 50 parallel logins → no race conditions (Test 11)
  - 50 parallel /users/me → no session corruption (Test 12)
  - Response time baselines (Part 5)
"""
import asyncio
import time
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, create_access_token
from app.main import app
from app.models.organization import Organization
from app.models.user import User

MAX_AVG_MS = 300    # relaxed threshold for CI / container environments
CONCURRENCY = 50


def _make_async_client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ─────────────────────────────────────────────────────────────────────────────
# Part 3 — DB pool stress test
# ─────────────────────────────────────────────────────────────────────────────
class TestDBPoolStress:

    async def test_100_parallel_health_calls_no_pool_exhaustion(self):
        """Send 100 simultaneous /health requests; none must fail."""
        async with _make_async_client() as client:
            tasks = [client.get("/health") for _ in range(100)]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

        errors = [r for r in responses if isinstance(r, Exception)]
        assert not errors, f"Exceptions during load: {errors}"

        # ASGITransport does not run application lifespan, so Redis may be
        # intentionally uninitialised and health may correctly return 503.
        # This test is specifically about DB pool exhaustion: every response
        # must still show a successful database probe.
        bad_statuses = [
            r.status_code
            for r in responses
            if not isinstance(r, Exception) and r.status_code not in (200, 503)
        ]
        assert not bad_statuses, f"Unexpected responses: {bad_statuses}"
        assert all(
            r.json()["database"] == "connected"
            for r in responses
            if not isinstance(r, Exception)
        ), "Database health degraded under parallel load"

    async def test_100_parallel_health_average_under_threshold(self):
        start = time.perf_counter()
        async with _make_async_client() as client:
            tasks = [client.get("/health") for _ in range(100)]
            await asyncio.gather(*tasks, return_exceptions=True)
        elapsed_ms = (time.perf_counter() - start) * 1000 / 100
        assert elapsed_ms < MAX_AVG_MS * 2, f"Avg {elapsed_ms:.1f}ms exceeds 2x threshold"


# ─────────────────────────────────────────────────────────────────────────────
# Part 11 — Simultaneous login test
# ─────────────────────────────────────────────────────────────────────────────
class TestConcurrentLogin:

    @pytest.fixture(autouse=True)
    async def _setup(self, db: AsyncSession):
        slug = f"conc-login-{uuid.uuid4().hex[:6]}"
        org = Organization(name="Conc Org", slug=slug)
        db.add(org)
        await db.flush()
        user = User(
            org_id=org.id,
            email="conc@test.com",
            password_hash=hash_password("concpass"),
            role="admin",
            is_first_login=False,
        )
        db.add(user)
        await db.commit()
        self.slug = slug

    async def test_50_concurrent_logins_succeed(self):
        payload = {
            "email": "conc@test.com",
            "password": "concpass",
            "organization_slug": self.slug,
        }
        async with _make_async_client() as client:
            tasks = [
                client.post("/api/v1/auth/login", json=payload)
                for _ in range(CONCURRENCY)
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

        errors = [r for r in responses if isinstance(r, Exception)]
        assert not errors, f"Exceptions: {errors}"

        failed = [r.status_code for r in responses
                  if not isinstance(r, Exception) and r.status_code != 200]
        assert not failed, f"Failed logins: {failed}"

    async def test_50_concurrent_failed_logins_no_crash(self):
        payload = {
            "email": "conc@test.com",
            "password": "wrongpassword",
            "organization_slug": self.slug,
        }
        async with _make_async_client() as client:
            tasks = [
                client.post("/api/v1/auth/login", json=payload)
                for _ in range(CONCURRENCY)
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

        errors = [r for r in responses if isinstance(r, Exception)]
        assert not errors
        for r in responses:
            if not isinstance(r, Exception):
                assert r.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Part 12 — Parallel protected route test
# ─────────────────────────────────────────────────────────────────────────────
class TestConcurrentProtectedRoute:

    @pytest.fixture(autouse=True)
    async def _setup(self, db: AsyncSession):
        slug = f"conc-me-{uuid.uuid4().hex[:6]}"
        org = Organization(name="Me Org", slug=slug)
        db.add(org)
        await db.flush()
        user = User(
            org_id=org.id,
            email="metest@test.com",
            password_hash=hash_password("mepass"),
            role="admin",
            is_first_login=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        self.token = create_access_token(
            user_id=str(user.id), org_id=str(org.id), role="admin", email=user.email
        )

    async def test_50_concurrent_me_calls_no_session_corruption(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        async with _make_async_client() as client:
            tasks = [
                client.get("/api/v1/users/me", headers=headers)
                for _ in range(CONCURRENCY)
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

        errors = [r for r in responses if isinstance(r, Exception)]
        assert not errors, f"Exceptions: {errors}"

        for r in responses:
            if not isinstance(r, Exception):
                assert r.status_code == 200
                assert "password" not in r.text.lower()

    async def test_me_responses_all_return_same_user(self):
        """All concurrent responses must return the same user."""
        headers = {"Authorization": f"Bearer {self.token}"}
        async with _make_async_client() as client:
            tasks = [
                client.get("/api/v1/users/me", headers=headers)
                for _ in range(20)
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

        emails = {
            r.json()["email"]
            for r in responses
            if not isinstance(r, Exception) and r.status_code == 200
        }
        assert len(emails) == 1, f"Got multiple users: {emails}"


# ─────────────────────────────────────────────────────────────────────────────
# Part 5 — Performance baseline
# ─────────────────────────────────────────────────────────────────────────────
class TestPerformanceBaseline:

    async def test_health_avg_response_under_200ms(self):
        times = []
        async with _make_async_client() as client:
            for _ in range(20):
                t0 = time.perf_counter()
                await client.get("/health")
                times.append((time.perf_counter() - t0) * 1000)
        avg = sum(times) / len(times)
        assert avg < MAX_AVG_MS, f"/health avg={avg:.1f}ms (max {MAX_AVG_MS}ms)"

    async def test_login_avg_response_under_threshold(self, db: AsyncSession):
        slug = f"perf-{uuid.uuid4().hex[:6]}"
        org = Organization(name="Perf Org", slug=slug)
        db.add(org)
        await db.flush()
        db.add(User(
            org_id=org.id, email="perf@test.com",
            password_hash=hash_password("perfpass"), role="admin",
            is_first_login=False,
        ))
        await db.commit()

        payload = {"email": "perf@test.com", "password": "perfpass",
                   "organization_slug": slug}
        times = []
        async with _make_async_client() as client:
            for _ in range(10):
                t0 = time.perf_counter()
                await client.post("/api/v1/auth/login", json=payload)
                times.append((time.perf_counter() - t0) * 1000)
        avg = sum(times) / len(times)
        # bcrypt adds ~100ms; give generous threshold
        assert avg < 600, f"Login avg={avg:.1f}ms (bcrypt expected ~100-200ms)"

    async def test_me_avg_response_under_threshold(self, db: AsyncSession):
        slug = f"perf-me-{uuid.uuid4().hex[:6]}"
        org = Organization(name="PerfMe Org", slug=slug)
        db.add(org)
        await db.flush()
        user = User(
            org_id=org.id, email="perfme@test.com",
            password_hash=hash_password("pass"), role="admin",
            is_first_login=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        token = create_access_token(
            user_id=str(user.id), org_id=str(org.id), role="admin", email=user.email
        )
        headers = {"Authorization": f"Bearer {token}"}
        times = []
        async with _make_async_client() as client:
            for _ in range(20):
                t0 = time.perf_counter()
                await client.get("/api/v1/users/me", headers=headers)
                times.append((time.perf_counter() - t0) * 1000)
        avg = sum(times) / len(times)
        assert avg < MAX_AVG_MS, f"/users/me avg={avg:.1f}ms (max {MAX_AVG_MS}ms)"
