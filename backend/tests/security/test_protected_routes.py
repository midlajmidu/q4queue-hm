"""
tests/security/test_protected_routes.py
PART 3 — Protected route security tests.

Tests:
  - No token → 401 (Test 6)
  - Invalid token → 401
  - Tampered payload → 401 (Test 5)
  - Expired token → 401 (Test 6)
  - Valid token → 200
  - Deactivated user mid-session → 403 (Test 7)
  - Cross-tenant token rejected (Test 6 / Tenant Leak)
"""
import base64
import json
import uuid
from datetime import timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models.organization import Organization
from app.models.user import User


async def _quick_user(db: AsyncSession) -> tuple[Organization, User, str]:
    """Create org + user + valid token in one call."""
    slug = f"route-sec-{uuid.uuid4().hex[:6]}"
    org = Organization(name="Sec Org", slug=slug)
    db.add(org)
    await db.flush()
    user = User(
        org_id=org.id,
        email="sec@test.com",
        password_hash=hash_password("secpass"),
        role="admin",
        is_first_login=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(org)
    await db.refresh(user)
    token = create_access_token(
        user_id=str(user.id), org_id=str(org.id), role=user.role, email=user.email
    )
    return org, user, token


class TestProtectedRoute:

    async def test_no_token_returns_401(self, client: AsyncClient):
        resp = await client.get("/api/v1/users/me")
        assert resp.status_code == 401

    async def test_malformed_token_returns_401(self, client: AsyncClient):
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer this.is.not.a.jwt"},
        )
        assert resp.status_code == 401

    async def test_empty_bearer_returns_401(self, client: AsyncClient):
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer "},
        )
        assert resp.status_code == 401

    async def test_valid_token_returns_200(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, user, token = await _quick_user(db)
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "sec@test.com"
        assert "password_hash" not in data   # CRITICAL: never leaked

    async def test_me_response_contains_required_fields(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, user, token = await _quick_user(db)
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        data = resp.json()
        for field in ("id", "email", "org_id", "role", "is_active"):
            assert field in data, f"Missing field: {field}"

    async def test_tampered_payload_returns_401(
        self, client: AsyncClient, db: AsyncSession
    ):
        """Test 5 — Manually alter payload, signature must fail."""
        _, _, token = await _quick_user(db)
        parts = token.split(".")
        fake = base64.urlsafe_b64encode(
            json.dumps({
                "sub": str(uuid.uuid4()),
                "org_id": str(uuid.uuid4()),
                "role": "superadmin",
                "exp": 9999999999,
            }).encode()
        ).rstrip(b"=").decode()
        tampered = f"{parts[0]}.{fake}.{parts[2]}"
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {tampered}"},
        )
        assert resp.status_code == 401

    async def test_expired_token_returns_401(
        self, client: AsyncClient, db: AsyncSession
    ):
        """Test 6 — Token already expired at creation time."""
        _, user, _ = await _quick_user(db)
        expired_token = create_access_token(
            user_id=str(user.id),
            org_id=str(user.org_id),
            role=user.role,
            email=user.email,
            expires_delta=timedelta(seconds=-10),
        )
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert resp.status_code == 401

    async def test_deactivated_user_token_rejected(
        self, client: AsyncClient, db: AsyncSession
    ):
        """Test 7 — Deactivate mid-session; existing token must be rejected."""
        org, user, token = await _quick_user(db)

        # Deactivate the user in DB
        user.is_active = False
        db.add(user)
        await db.commit()

        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code in (401, 403)

    async def test_cross_org_token_rejected(
        self, client: AsyncClient, db: AsyncSession
    ):
        """Test 6 (Tenant Leak) — Token with wrong org_id gets 401."""
        _, user, _ = await _quick_user(db)
        # Issue token with a fake org_id not matching the user's actual org
        forged_org_id = str(uuid.uuid4())
        bad_token = create_access_token(
            user_id=str(user.id),
            org_id=forged_org_id,  # ← wrong org
            role=user.role,
            email=user.email,
        )
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {bad_token}"},
        )
        assert resp.status_code == 401

    async def test_password_hash_never_in_response(
        self, client: AsyncClient, db: AsyncSession
    ):
        """Password must NEVER appear in any response."""
        _, _, token = await _quick_user(db)
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        response_str = resp.text.lower()
        assert "password" not in response_str
        assert "$2" not in response_str   # bcrypt hash prefix
