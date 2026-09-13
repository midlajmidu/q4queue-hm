"""
tests/security/test_tenant_isolation.py
PART 6 — Multi-tenant data leak test.

Validates that:
  - User A cannot access User B's data
  - Token with forged org_id is rejected
  - DB queries are always org-scoped
"""
import uuid

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models.organization import Organization
from app.models.user import User


async def _make_tenant(db: AsyncSession, tag: str) -> tuple[Organization, User, str]:
    slug = f"tenant-{tag}-{uuid.uuid4().hex[:6]}"
    org = Organization(name=f"Org {tag}", slug=slug)
    db.add(org)
    await db.flush()
    user = User(
        org_id=org.id,
        email=f"admin-{tag}@test.com",
        password_hash=hash_password("pass"),
        role="admin",
        is_first_login=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(org)
    await db.refresh(user)
    token = create_access_token(
        user_id=str(user.id), org_id=str(org.id), role="admin", email=user.email
    )
    return org, user, token


class TestTenantIsolation:

    async def test_user_a_cannot_see_user_b_via_me(
        self, client: AsyncClient, db: AsyncSession
    ):
        """Token of Org A user must only return Org A user data."""
        org_a, user_a, token_a = await _make_tenant(db, "X")
        org_b, user_b, token_b = await _make_tenant(db, "Y")

        resp_a = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        data_a = resp_a.json()
        assert resp_a.status_code == 200
        assert data_a["org_id"] == str(org_a.id)
        assert data_a["id"] != str(user_b.id)

    async def test_org_b_token_cannot_authenticate_as_org_a(
        self, client: AsyncClient, db: AsyncSession
    ):
        """Org B's valid token must not resolve to Org A user."""
        org_a, user_a, _ = await _make_tenant(db, "OA")
        org_b, user_b, token_b = await _make_tenant(db, "OB")

        # Forge a token using Org B user's ID but Org A's org_id
        forged = create_access_token(
            user_id=str(user_b.id),
            org_id=str(org_a.id),   # ← wrong org
            role="admin",
            email=user_b.email,
        )
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {forged}"},
        )
        assert resp.status_code == 401

    async def test_db_query_scoped_to_org(self, db: AsyncSession):
        """Direct DB test: querying with wrong org_id returns nothing."""
        org_a, user_a, _ = await _make_tenant(db, "DB-A")
        org_b, user_b, _ = await _make_tenant(db, "DB-B")

        # query user_a's id but with org_b's org_id → must return None
        result = await db.execute(
            select(User).where(
                User.id == user_a.id,
                User.org_id == org_b.id,   # ← wrong org
            )
        )
        found = result.scalar_one_or_none()
        assert found is None, "Cross-org query returned a user — ISOLATION BREACH!"

    async def test_same_email_different_orgs_distinct_users(
        self, db: AsyncSession
    ):
        """Same email in two orgs must resolve to two completely separate users."""
        SHARED_EMAIL = "shared@isolation.test"
        slug_1 = f"shared-iso-1-{uuid.uuid4().hex[:6]}"
        slug_2 = f"shared-iso-2-{uuid.uuid4().hex[:6]}"

        org1 = Organization(name="Iso Org 1", slug=slug_1)
        org2 = Organization(name="Iso Org 2", slug=slug_2)
        db.add_all([org1, org2])
        await db.flush()

        u1 = User(org_id=org1.id, email=SHARED_EMAIL,
                  password_hash=hash_password("pass1"), role="admin")
        u2 = User(org_id=org2.id, email=SHARED_EMAIL,
                  password_hash=hash_password("pass2"), role="admin")
        db.add_all([u1, u2])
        await db.commit()

        result = await db.execute(
            select(User).where(
                User.email == SHARED_EMAIL,
                User.org_id.in_([org1.id, org2.id]),
            )
        )
        users = result.scalars().all()

        assert len(users) == 2
        ids = {str(u.id) for u in users}
        assert len(ids) == 2  # distinct records
        org_ids = {str(u.org_id) for u in users}
        assert len(org_ids) == 2  # belong to different orgs
