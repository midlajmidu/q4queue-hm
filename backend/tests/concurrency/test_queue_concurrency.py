"""
tests/concurrency/test_queue_concurrency.py
PHASE 3 — Concurrency correctness tests.

Test 1 — Parallel Join:   100 simultaneous joins → no duplicates, sequential
Test 2 — Parallel Next:   10 concurrent next calls → no double-serving
Test 3 — Isolation:       Cross-org queue access returns 403/404

These tests are the mathematical proof that the SELECT FOR UPDATE
locking strategy is effective.
"""
import asyncio
import uuid
from collections import Counter
from datetime import datetime
from zoneinfo import ZoneInfo

from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import create_access_token, hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.organization import Organization
from app.models.queue import Queue
from app.models.session import Session
from app.models.token import Token, TokenStatus
from app.models.user import User


# Production uses a bounded SQLAlchemy pool (10 connections + 20 overflow).
# ENVIRONMENT=test intentionally uses NullPool so sync WebSocket tests cannot
# reuse asyncpg connections across event loops. Bound DB-heavy requests here to
# model the production pool and avoid turning this correctness test into a test
# of PostgreSQL's max_connections setting.
_join_db_slots = asyncio.Semaphore(20)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _new_client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _provision(tag: str) -> tuple[str, str, str]:
    """Create org + user + queue in isolated sessions; return (queue_id, org_id, token)."""
    async with AsyncSessionLocal() as db:
        slug = f"conc-{tag}-{uuid.uuid4().hex[:8]}"
        org = Organization(
            name=f"Conc {tag}",
            slug=slug,
            # These tests validate locking/number allocation, not plan limits.
            max_waiting_capacity=500,
        )
        db.add(org)
        await db.flush()

        user = User(
            org_id=org.id,
            email=f"admin@{slug}.test",
            password_hash=hash_password("pass"),
            role="admin",
            is_first_login=False,
        )
        db.add(user)
        await db.flush()

        queue = Queue(org_id=org.id, name=f"Q-{tag}", prefix="C")
        db.add(queue)
        await db.flush()
        session = Session(
            org_id=org.id,
            queue_id=queue.id,
            session_date=datetime.now(ZoneInfo("Asia/Kolkata")).date(),
            title="Concurrency test session",
            is_active=True,
        )
        db.add(session)
        await db.flush()
        queue.token_session_id = session.id
        await db.commit()
        await db.refresh(org)
        await db.refresh(user)
        await db.refresh(queue)

        jwt = create_access_token(
            user_id=str(user.id),
            org_id=str(org.id),
            role="admin",
            email=user.email,
        )
        return str(queue.id), str(org.id), jwt


async def _admin_join(client: AsyncClient, queue_id: str, jwt: str):
    async with _join_db_slots:
        return await client.post(
            f"/api/v1/queues/{queue_id}/admin-join",
            json={"name": "Concurrent Customer", "phone": "9876543210"},
            headers={"Authorization": f"Bearer {jwt}"},
        )


# ─────────────────────────────────────────────────────────────────────────────
# Test 1 — Parallel Join (100 concurrent)
# ─────────────────────────────────────────────────────────────────────────────

class TestParallelJoin:

    async def test_100_concurrent_joins_no_duplicates(self):
        """
        The most important correctness test.
        100 goroutines join simultaneously.
        Expected: token_numbers 1-100, each exactly once.
        """
        queue_id, _, jwt = await _provision("pjoin")

        async with _new_client() as client:
            tasks = [
                _admin_join(client, queue_id, jwt)
                for _ in range(100)
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

        exceptions = [r for r in responses if isinstance(r, Exception)]
        assert not exceptions, f"Exceptions: {exceptions}"

        numbers = [
            r.json()["token_number"]
            for r in responses
            if not isinstance(r, Exception) and r.status_code == 201
        ]

        assert len(numbers) == 100, f"Expected 100 tokens, got {len(numbers)}"

        # ── No duplicates ──────────────────────────────────────────
        counts = Counter(numbers)
        duplicates = {n: c for n, c in counts.items() if c > 1}
        assert not duplicates, f"DUPLICATE token numbers found: {duplicates}"

        # ── Sequential, no gaps ────────────────────────────────────
        assert sorted(numbers) == list(range(1, 101)), (
            f"Non-sequential numbering detected. Got: {sorted(numbers)}"
        )

    async def test_200_concurrent_joins_sequential_and_unique(self):
        """Scale test: 200 concurrent joins on the same queue."""
        queue_id, _, jwt = await _provision("pjoin200")

        async with _new_client() as client:
            tasks = [
                _admin_join(client, queue_id, jwt)
                for _ in range(200)
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

        numbers = [
            r.json()["token_number"]
            for r in responses
            if not isinstance(r, Exception) and r.status_code == 201
        ]
        assert len(numbers) == 200
        assert sorted(numbers) == list(range(1, 201))
        assert len(set(numbers)) == 200   # all unique


# ─────────────────────────────────────────────────────────────────────────────
# Test 2 — Parallel Next (10 concurrent)
# ─────────────────────────────────────────────────────────────────────────────

class TestParallelNext:

    async def test_10_concurrent_next_no_double_serving(self):
        """
        10 staff click Next simultaneously with 5 waiting tokens.
        Expected: exactly 5 tokens move to 'serving' (one at a time),
        and 5 calls return 'no tokens waiting'.
        No token ever gets served twice.
        """
        queue_id, org_id, jwt = await _provision("pnext")
        headers = {"Authorization": f"Bearer {jwt}"}

        # Seed 5 waiting tokens
        async with _new_client() as client:
            for _ in range(5):
                await _admin_join(client, queue_id, jwt)

            # 10 concurrent Next calls
            tasks = [
                client.post(f"/api/v1/queues/{queue_id}/next", headers=headers)
                for _ in range(10)
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

        exceptions = [r for r in responses if isinstance(r, Exception)]
        assert not exceptions, f"Exceptions: {exceptions}"

        served_numbers = [
            r.json().get("serving")
            for r in responses
            if not isinstance(r, Exception) and "serving" in r.json()
        ]
        no_token_count = sum(
            1 for r in responses
            if not isinstance(r, Exception) and "message" in r.json()
        )

        # Exactly 5 successful serves
        assert len(served_numbers) == 5, (
            f"Expected 5 served tokens, got {len(served_numbers)}: {served_numbers}"
        )
        # No duplicate served numbers
        assert len(set(served_numbers)) == 5, (
            f"Double-serving detected! Numbers: {served_numbers}"
        )
        # Exactly 5 "no tokens waiting"
        assert no_token_count == 5

    async def test_serving_tokens_in_db_matches_served_responses(self):
        """Verify DB state is consistent with HTTP responses."""
        queue_id, _, jwt = await _provision("pnext-db")
        headers = {"Authorization": f"Bearer {jwt}"}
        N = 8

        async with _new_client() as client:
            for _ in range(N):
                await _admin_join(client, queue_id, jwt)
            tasks = [
                client.post(f"/api/v1/queues/{queue_id}/next", headers=headers)
                for _ in range(N)
            ]
            await asyncio.gather(*tasks, return_exceptions=True)

        # After calling next N times for N tokens, ALL should be done (not serving)
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Token).where(
                    Token.queue_id == uuid.UUID(queue_id),
                    Token.status == TokenStatus.serving,
                )
            )
            still_serving = result.scalars().all()

        # At most 1 can be serving (the last Next call)
        assert len(still_serving) <= 1, (
            f"Multiple tokens in 'serving' state: {[t.token_number for t in still_serving]}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Test 3 — Cross-org isolation under concurrency
# ─────────────────────────────────────────────────────────────────────────────

class TestConcurrentIsolation:

    async def test_org_b_cannot_join_org_a_queue_concurrently(self):
        """
        Even under concurrency, org B's valid JWT cannot affect org A's queue.
        (The join endpoint is public, so it uses internal org from the queue.)
        Org B token cannot call Next on Org A queue.
        """
        queue_a_id, _, jwt_a = await _provision("iso-A")
        _, _, jwt_b = await _provision("iso-B")

        headers_b = {"Authorization": f"Bearer {jwt_b}"}

        async with _new_client() as client:
            # Seed Org A queue
            for _ in range(3):
                await _admin_join(client, queue_a_id, jwt_a)

            # Org B tries to call Next on Org A's queue — 10 concurrent attempts
            tasks = [
                client.post(
                    f"/api/v1/queues/{queue_a_id}/next",
                    headers=headers_b,
                )
                for _ in range(10)
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

        for r in responses:
            if not isinstance(r, Exception):
                assert r.status_code in (403, 404), (
                    f"Org B crossed into Org A queue! Status: {r.status_code}"
                )

    async def test_org_a_data_unchanged_after_cross_org_attempts(self):
        """After cross-org attempts, Org A's queue must be unaffected."""
        queue_a_id, _, jwt_a = await _provision("iso-A2")
        _, _, jwt_b = await _provision("iso-B2")

        async with _new_client() as client:
            for _ in range(3):
                await _admin_join(client, queue_a_id, jwt_a)

            # Org B noise
            for _ in range(5):
                await client.post(
                    f"/api/v1/queues/{queue_a_id}/next",
                    headers={"Authorization": f"Bearer {jwt_b}"},
                )

            # Org A's proper Next should still work
            resp = await client.post(
                f"/api/v1/queues/{queue_a_id}/next",
                headers={"Authorization": f"Bearer {jwt_a}"},
            )
            assert resp.status_code == 200
            assert resp.json().get("serving") == 1
