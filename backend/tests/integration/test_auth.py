"""
tests/integration/test_auth.py
PART 2 — Authentication system integration tests.

Tests:
  - Multi-tenant login isolation (Test 4)
  - Generic error messages — enumeration protection (Test 10)
  - SQL injection in login (Test 9)
  - Deactivated org/user rejection (Test 7)
"""
import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.user import User
from app.core.security import hash_password


# ─────────────────────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────────────────────
async def _create_org_and_user(
    db: AsyncSession,
    *,
    slug: str,
    email: str,
    password: str,
    role: str = "admin",
    org_active: bool = True,
    user_active: bool = True,
) -> tuple[Organization, User]:
    org = Organization(name=f"Org {slug}", slug=slug, is_active=org_active)
    db.add(org)
    await db.flush()
    user = User(
        org_id=org.id,
        email=email,
        password_hash=hash_password(password),
        role=role,
        is_active=user_active,
        is_first_login=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(org)
    await db.refresh(user)
    return org, user


# ─────────────────────────────────────────────────────────────────────────────
# Test 4 — Multi-tenant login isolation
# ─────────────────────────────────────────────────────────────────────────────
class TestMultiTenantLoginIsolation:

    async def test_login_org_a_succeeds(self, client: AsyncClient, db: AsyncSession):
        slug = f"isolation-a-{uuid.uuid4().hex[:6]}"
        org, user = await _create_org_and_user(
            db, slug=slug, email="shared@test.com", password="passA1"
        )

        resp = await client.post("/api/v1/auth/login", json={
            "email": "shared@test.com",
            "password": "passA1",
            "organization_slug": slug,
        })
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_org_b_same_email_different_password(
        self, client: AsyncClient, db: AsyncSession
    ):
        slug_a = f"iso-aa-{uuid.uuid4().hex[:6]}"
        slug_b = f"iso-bb-{uuid.uuid4().hex[:6]}"
        org_a, _ = await _create_org_and_user(
            db, slug=slug_a, email="dual@test.com", password="passOrgA"
        )
        org_b, _ = await _create_org_and_user(
            db, slug=slug_b, email="dual@test.com", password="passOrgB"
        )

        # Login to Org B
        resp = await client.post("/api/v1/auth/login", json={
            "email": "dual@test.com",
            "password": "passOrgB",
            "organization_slug": slug_b,
        })
        assert resp.status_code == 200

    async def test_org_b_password_rejected_in_org_a(
        self, client: AsyncClient, db: AsyncSession
    ):
        """Test 4C — Using org B password with org A slug must fail."""
        slug_a = f"cross-aa-{uuid.uuid4().hex[:6]}"
        slug_b = f"cross-bb-{uuid.uuid4().hex[:6]}"
        await _create_org_and_user(
            db, slug=slug_a, email="cross@test.com", password="passA1"
        )
        await _create_org_and_user(
            db, slug=slug_b, email="cross@test.com", password="passB1"
        )

        resp = await client.post("/api/v1/auth/login", json={
            "email": "cross@test.com",
            "password": "passB1",         # ← Org B password
            "organization_slug": slug_a,  # ← Org A slug
        })
        assert resp.status_code == 401

    async def test_token_org_id_matches_org(
        self, client: AsyncClient, db: AsyncSession
    ):
        """JWT org_id claim must match the org that was logged into."""
        import base64
        import json

        slug = f"orgid-chk-{uuid.uuid4().hex[:6]}"
        org, _ = await _create_org_and_user(
            db, slug=slug, email="orgcheck@test.com", password="validpass"
        )
        resp = await client.post("/api/v1/auth/login", json={
            "email": "orgcheck@test.com",
            "password": "validpass",
            "organization_slug": slug,
        })
        assert resp.status_code == 200
        token = resp.json()["access_token"]

        # Decode payload (middle segment)
        padding = 4 - len(token.split(".")[1]) % 4
        payload_json = base64.urlsafe_b64decode(token.split(".")[1] + "=" * padding)
        payload = json.loads(payload_json)
        assert payload["org_id"] == str(org.id)


# ─────────────────────────────────────────────────────────────────────────────
# Test 9 — SQL injection in login body
# ─────────────────────────────────────────────────────────────────────────────
class TestSQLInjectionLogin:

    async def test_sql_injection_email_returns_401(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "anything@x.com",
            "password": "' OR 1=1 --",
            "organization_slug": "any-org",
        })
        assert resp.status_code == 401

    async def test_sql_injection_slug_returns_401(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "test@test.com",
            "password": "validpass",
            "organization_slug": "'; DROP TABLE organizations; --",
        })
        assert resp.status_code == 401

    async def test_sql_injection_does_not_expose_internal_error(
        self, client: AsyncClient
    ):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "x@x.com",
            "password": "x",
            "organization_slug": "' UNION SELECT 1,2,3 --",
        })
        data = resp.json()
        # Must not contain any DB error details
        detail = str(data.get("detail", "")).lower()
        assert "sql" not in detail
        assert "table" not in detail
        assert "syntax" not in detail


# ─────────────────────────────────────────────────────────────────────────────
# Test 10 — Enumeration protection
# ─────────────────────────────────────────────────────────────────────────────
class TestEnumerationProtection:

    async def test_nonexistent_email_generic_401(
        self, client: AsyncClient, db: AsyncSession
    ):
        slug = f"enum-a-{uuid.uuid4().hex[:6]}"
        await _create_org_and_user(db, slug=slug, email="real@test.com", password="pass")

        resp = await client.post("/api/v1/auth/login", json={
            "email": "doesnotexist@nowhere.com",
            "password": "anything",
            "organization_slug": slug,
        })
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid credentials"

    async def test_correct_email_wrong_password_generic_401(
        self, client: AsyncClient, db: AsyncSession
    ):
        slug = f"enum-b-{uuid.uuid4().hex[:6]}"
        await _create_org_and_user(
            db, slug=slug, email="real2@test.com", password="correctpass"
        )

        resp = await client.post("/api/v1/auth/login", json={
            "email": "real2@test.com",
            "password": "wrongpassword",
            "organization_slug": slug,
        })
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid credentials"

    async def test_wrong_org_slug_generic_401(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "someone@test.com",
            "password": "validpass",
            "organization_slug": "org-that-does-not-exist",
        })
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid credentials"

    async def test_all_failures_return_same_detail(
        self, client: AsyncClient, db: AsyncSession
    ):
        """All failure paths must return the exact same message."""
        slug = f"enum-c-{uuid.uuid4().hex[:6]}"
        await _create_org_and_user(
            db, slug=slug, email="real3@test.com", password="rightpass"
        )
        cases = [
            {"email": "real3@test.com", "password": "wrongpass", "organization_slug": slug},
            {"email": "nobody@test.com", "password": "rightpass", "organization_slug": slug},
            {"email": "real3@test.com", "password": "rightpass", "organization_slug": "bad-slug"},
        ]
        details = set()
        for body in cases:
            r = await client.post("/api/v1/auth/login", json=body)
            assert r.status_code == 401
            details.add(r.json()["detail"])
        assert len(details) == 1, f"Multiple error messages returned: {details}"


# ─────────────────────────────────────────────────────────────────────────────
# Test 7 — Deactivated user
# ─────────────────────────────────────────────────────────────────────────────
class TestDeactivatedUser:

    async def test_inactive_user_login_rejected(
        self, client: AsyncClient, db: AsyncSession
    ):
        slug = f"inactive-{uuid.uuid4().hex[:6]}"
        _, user = await _create_org_and_user(
            db, slug=slug, email="inactive@test.com",
            password="validpass", user_active=False,
        )
        resp = await client.post("/api/v1/auth/login", json={
            "email": "inactive@test.com",
            "password": "validpass",
            "organization_slug": slug,
        })
        assert resp.status_code == 401

    async def test_inactive_org_login_rejected(
        self, client: AsyncClient, db: AsyncSession
    ):
        slug = f"inactiveorg-{uuid.uuid4().hex[:6]}"
        await _create_org_and_user(
            db, slug=slug, email="orgadmin@test.com",
            password="validpass", org_active=False,
        )
        resp = await client.post("/api/v1/auth/login", json={
            "email": "orgadmin@test.com",
            "password": "validpass",
            "organization_slug": slug,
        })
        assert resp.status_code == 401
