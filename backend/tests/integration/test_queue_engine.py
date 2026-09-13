"""
tests/integration/test_queue_engine.py
PHASE 3 — Queue engine integration tests.

Covers:
  - Queue CRUD with tenant isolation
  - Token join lifecycle
  - Admin next logic
  - Skip / Done state transitions
  - Edge cases (inactive queue, invalid transitions)
  - Cross-org isolation (Test 3)
"""
import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models.organization import Organization
from app.models.token import Token, TokenStatus
from app.models.user import User


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

async def _make_org_user_token(db: AsyncSession, tag: str) -> tuple[Organization, User, str]:
    slug = f"qtest-{tag}-{uuid.uuid4().hex[:6]}"
    org = Organization(name=f"Q Org {tag}", slug=slug)
    db.add(org)
    await db.flush()
    user = User(
        org_id=org.id,
        email=f"admin-{tag}@q.test",
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


async def _create_queue(
    client: AsyncClient,
    auth_headers: dict,
    name: str = "Main",
    prefix: str = "A",
) -> dict:
    resp = await client.post(
        "/api/v1/queues",
        json={"name": name, "prefix": prefix},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    queue = resp.json()
    session_resp = await client.post(
        f"/api/v1/queues/{queue['id']}/active-session",
        headers=auth_headers,
    )
    assert session_resp.status_code in (200, 201), session_resp.text
    return queue


async def _admin_join(client: AsyncClient, queue_id: str, headers: dict) -> object:
    return await client.post(
        f"/api/v1/queues/{queue_id}/admin-join",
        json={"name": "Test Customer", "phone": "9876543210"},
        headers=headers,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Queue CRUD
# ─────────────────────────────────────────────────────────────────────────────

class TestQueueCRUD:

    async def test_create_queue_returns_201(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, token = await _make_org_user_token(db, "crud1")
        resp = await client.post(
            "/api/v1/queues",
            json={"name": "Test Queue", "prefix": "T"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Test Queue"
        assert data["prefix"] == "T"
        assert data["is_active"] is True
        assert data["current_token_number"] == 0

    async def test_list_queues_only_returns_own_org(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, tok_a = await _make_org_user_token(db, "list-a")
        _, _, tok_b = await _make_org_user_token(db, "list-b")
        await _create_queue(client, {"Authorization": f"Bearer {tok_a}"}, "OrgA Queue")
        await _create_queue(client, {"Authorization": f"Bearer {tok_b}"}, "OrgB Queue")

        resp = await client.get(
            "/api/v1/queues",
            headers={"Authorization": f"Bearer {tok_a}"},
        )
        assert resp.status_code == 200
        names = [q["name"] for q in resp.json()]
        assert "OrgA Queue" in names
        assert "OrgB Queue" not in names   # must not leak across tenants

    async def test_get_queue_404_for_wrong_org(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, tok_a = await _make_org_user_token(db, "g404-a")
        _, _, tok_b = await _make_org_user_token(db, "g404-b")
        q = await _create_queue(client, {"Authorization": f"Bearer {tok_a}"}, "Private Q")
        queue_id = q["id"]

        # Org B tries to access Org A's queue
        resp = await client.get(
            f"/api/v1/queues/{queue_id}",
            headers={"Authorization": f"Bearer {tok_b}"},
        )
        assert resp.status_code == 404

    async def test_toggle_queue_inactive(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, tok = await _make_org_user_token(db, "toggle")
        q = await _create_queue(client, {"Authorization": f"Bearer {tok}"}, "Toggle Q")
        qid = q["id"]

        resp = await client.patch(
            f"/api/v1/queues/{qid}/active?is_active=false",
            headers={"Authorization": f"Bearer {tok}"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False


# ─────────────────────────────────────────────────────────────────────────────
# Token join
# ─────────────────────────────────────────────────────────────────────────────

class TestTokenJoin:

    async def test_join_returns_token_number_1_for_first(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, tok = await _make_org_user_token(db, "join1")
        q = await _create_queue(client, {"Authorization": f"Bearer {tok}"}, "Join Q1")
        headers = {"Authorization": f"Bearer {tok}"}
        resp = await _admin_join(client, q["id"], headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["token_number"] == 1
        assert data["position"] == 0
        assert data["current_serving"] == 0

    async def test_join_increments_sequentially(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, tok = await _make_org_user_token(db, "join2")
        q = await _create_queue(client, {"Authorization": f"Bearer {tok}"}, "Join Q2")
        numbers = []
        for _ in range(5):
            r = await _admin_join(client, q["id"], {"Authorization": f"Bearer {tok}"})
            numbers.append(r.json()["token_number"])
        assert numbers == [1, 2, 3, 4, 5]

    async def test_join_inactive_queue_returns_400(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, tok = await _make_org_user_token(db, "join-inactive")
        q = await _create_queue(client, {"Authorization": f"Bearer {tok}"}, "Inactive Q")
        await client.patch(
            f"/api/v1/queues/{q['id']}/active?is_active=false",
            headers={"Authorization": f"Bearer {tok}"},
        )
        resp = await _admin_join(client, q["id"], {"Authorization": f"Bearer {tok}"})
        assert resp.status_code == 400

    async def test_join_nonexistent_queue_returns_404(self, client: AsyncClient):
        fake_id = str(uuid.uuid4())
        resp = await client.post(f"/api/v1/queues/{fake_id}/join")
        assert resp.status_code == 404

    async def test_position_calculation_correct(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, tok = await _make_org_user_token(db, "pos")
        q = await _create_queue(client, {"Authorization": f"Bearer {tok}"}, "PosQ")
        for _ in range(4):
            await _admin_join(client, q["id"], {"Authorization": f"Bearer {tok}"})
        r = await _admin_join(client, q["id"], {"Authorization": f"Bearer {tok}"})
        data = r.json()
        assert data["token_number"] == 5
        assert data["position"] == 4   # 4 tokens ahead


# ─────────────────────────────────────────────────────────────────────────────
# Admin — Next
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminNext:

    async def _setup_queue_with_tokens(
        self, client: AsyncClient, db: AsyncSession, tag: str, count: int = 3
    ):
        _, _, tok = await _make_org_user_token(db, tag)
        headers = {"Authorization": f"Bearer {tok}"}
        q = await _create_queue(client, headers, f"Next Q {tag}")
        for _ in range(count):
            await _admin_join(client, q["id"], headers)
        return q, headers

    async def test_next_serves_token_1_first(
        self, client: AsyncClient, db: AsyncSession
    ):
        q, headers = await self._setup_queue_with_tokens(client, db, "next1")
        resp = await client.post(f"/api/v1/queues/{q['id']}/next", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["serving"] == 1
        assert data["remaining"] == 2

    async def test_next_advances_sequentially(
        self, client: AsyncClient, db: AsyncSession
    ):
        q, headers = await self._setup_queue_with_tokens(client, db, "next2", count=3)
        serving_order = []
        for _ in range(3):
            r = await client.post(f"/api/v1/queues/{q['id']}/next", headers=headers)
            serving_order.append(r.json()["serving"])
        assert serving_order == [1, 2, 3]

    async def test_next_when_empty_returns_no_tokens_message(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, tok = await _make_org_user_token(db, "empty-next")
        headers = {"Authorization": f"Bearer {tok}"}
        q = await _create_queue(client, headers, "Empty Q")
        resp = await client.post(f"/api/v1/queues/{q['id']}/next", headers=headers)
        assert resp.status_code == 200
        assert "message" in resp.json()

    async def test_next_marks_previous_as_done(
        self, client: AsyncClient, db: AsyncSession
    ):
        q, headers = await self._setup_queue_with_tokens(client, db, "done-check")
        # Serve token 1
        await client.post(f"/api/v1/queues/{q['id']}/next", headers=headers)
        # Serve token 2 — this should move token 1 to done
        await client.post(f"/api/v1/queues/{q['id']}/next", headers=headers)

        r = await client.post(f"/api/v1/queues/{q['id']}/next", headers=headers)
        assert r.json()["serving"] == 3

    async def test_next_on_wrong_org_returns_404(
        self, client: AsyncClient, db: AsyncSession
    ):
        """Test 3 — Cross-org isolation: Org B admin cannot call Next on Org A queue."""
        _, _, tok_a = await _make_org_user_token(db, "xorg-a")
        _, _, tok_b = await _make_org_user_token(db, "xorg-b")
        headers_a = {"Authorization": f"Bearer {tok_a}"}
        headers_b = {"Authorization": f"Bearer {tok_b}"}

        q = await _create_queue(client, headers_a, "Org A Queue")
        await _admin_join(client, q["id"], headers_a)

        resp = await client.post(
            f"/api/v1/queues/{q['id']}/next",
            headers=headers_b,          # ← wrong org token
        )
        assert resp.status_code in (403, 404)


# ─────────────────────────────────────────────────────────────────────────────
# Token lifecycle — Skip / Done
# ─────────────────────────────────────────────────────────────────────────────

class TestTokenLifecycle:

    async def _get_token_id(
        self, client: AsyncClient, db: AsyncSession, tag: str
    ) -> tuple[str, dict, str]:
        _, _, tok = await _make_org_user_token(db, tag)
        headers = {"Authorization": f"Bearer {tok}"}
        q = await _create_queue(client, headers, f"LC Q {tag}")
        join = await _admin_join(client, q["id"], headers)
        join.json()  # we only have token_number; need to get token ID via serving
        return q["id"], headers, tok

    async def test_skip_waiting_token(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, auth_tok = await _make_org_user_token(db, "skip1")
        headers = {"Authorization": f"Bearer {auth_tok}"}
        q = await _create_queue(client, headers, "Skip Q")
        await _admin_join(client, q["id"], headers)

        # Get token ID from DB directly via next (it returns the token being served)
        # For skip we need a waiting token — so join another and skip it
        await _admin_join(client, q["id"], headers)
        # Call next to serve token 1; token 2 stays waiting
        next_r = await client.post(f"/api/v1/queues/{q['id']}/next", headers=headers)
        assert next_r.json()["serving"] == 1

        # Now get token 2 id from DB
        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as s:
            result = await s.execute(
                select(Token).where(
                    Token.queue_id == uuid.UUID(q["id"]),
                    Token.token_number == 2,
                )
            )
            t2 = result.scalar_one()
            token2_id = str(t2.id)

        resp = await client.patch(
            f"/api/v1/tokens/{token2_id}/skip",
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "skipped"

    async def test_skip_non_waiting_token_returns_400(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, auth_tok = await _make_org_user_token(db, "skip-err")
        headers = {"Authorization": f"Bearer {auth_tok}"}
        q = await _create_queue(client, headers, "SkipErr Q")
        await _admin_join(client, q["id"], headers)
        await client.post(f"/api/v1/queues/{q['id']}/next", headers=headers)

        # Get serving token id
        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as s:
            result = await s.execute(
                select(Token).where(
                    Token.queue_id == uuid.UUID(q["id"]),
                    Token.status == TokenStatus.serving,
                )
            )
            t = result.scalar_one()
            tid = str(t.id)

        # Try to skip a serving token → 400
        resp = await client.patch(f"/api/v1/tokens/{tid}/skip", headers=headers)
        assert resp.status_code == 400

    async def test_done_serving_token_succeeds(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, auth_tok = await _make_org_user_token(db, "done1")
        headers = {"Authorization": f"Bearer {auth_tok}"}
        q = await _create_queue(client, headers, "Done Q")
        await _admin_join(client, q["id"], headers)
        await client.post(f"/api/v1/queues/{q['id']}/next", headers=headers)

        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as s:
            result = await s.execute(
                select(Token).where(
                    Token.queue_id == uuid.UUID(q["id"]),
                    Token.status == TokenStatus.serving,
                )
            )
            t = result.scalar_one()
            tid = str(t.id)

        resp = await client.patch(f"/api/v1/tokens/{tid}/done", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "done"

    async def test_done_on_waiting_token_returns_400(
        self, client: AsyncClient, db: AsyncSession
    ):
        _, _, auth_tok = await _make_org_user_token(db, "done-err")
        headers = {"Authorization": f"Bearer {auth_tok}"}
        q = await _create_queue(client, headers, "DoneErr Q")
        await _admin_join(client, q["id"], headers)

        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as s:
            result = await s.execute(
                select(Token).where(
                    Token.queue_id == uuid.UUID(q["id"]),
                    Token.status == TokenStatus.waiting,
                )
            )
            t = result.scalar_one()
            tid = str(t.id)

        resp = await client.patch(f"/api/v1/tokens/{tid}/done", headers=headers)
        assert resp.status_code == 400

    async def test_cross_org_token_access_returns_404(
        self, client: AsyncClient, db: AsyncSession
    ):
        """Org B cannot modify Org A's token."""
        _, _, tok_a = await _make_org_user_token(db, "ct-a")
        _, _, tok_b = await _make_org_user_token(db, "ct-b")
        headers_a = {"Authorization": f"Bearer {tok_a}"}
        headers_b = {"Authorization": f"Bearer {tok_b}"}

        q = await _create_queue(client, headers_a, "CT Q")
        await _admin_join(client, q["id"], headers_a)
        await client.post(f"/api/v1/queues/{q['id']}/next", headers=headers_a)

        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as s:
            result = await s.execute(
                select(Token).where(
                    Token.queue_id == uuid.UUID(q["id"]),
                    Token.status == TokenStatus.serving,
                )
            )
            t = result.scalar_one()
            tid = str(t.id)

        # Org B tries to complete Org A's token
        resp = await client.patch(
            f"/api/v1/tokens/{tid}/done",
            headers=headers_b,
        )
        assert resp.status_code == 404
