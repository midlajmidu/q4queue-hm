"""
tests/integration/test_messages.py
Integration tests for messages (notifications) endpoints:
  - Create message
  - List messages
  - Mark message as read
  - Mark all messages as read
  - Delete (clear) all messages
"""
import uuid
import pytest
import asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models.organization import Organization
from app.models.user import User
from app.main import app

@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

async def _make_org_user_token(db: AsyncSession, tag: str) -> tuple[Organization, User, str]:
    slug = f"msgtest-{tag}-{uuid.uuid4().hex[:6]}"
    org = Organization(name=f"Msg Org {tag}", slug=slug)
    db.add(org)
    await db.flush()
    email = f"admin-{tag}@msg.test"
    user = User(
        org_id=org.id,
        email=email,
        password_hash=hash_password("pass"),
        role="admin",
    )
    db.add(user)
    await db.commit()
    await db.refresh(org)
    await db.refresh(user)
    token = create_access_token(
        user_id=str(user.id), org_id=str(org.id), role="admin", email=email
    )
    return org, user, token

class TestMessagesAPI:
    async def test_create_message(self, db: AsyncSession):
        org, user, token = await _make_org_user_token(db, "create")
        headers = {"Authorization": f"Bearer {token}"}
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as local_client:
            resp = await local_client.post(
                "/api/v1/messages",
                json={"content": "Test Alert Message", "message_type": "warning"},
                headers=headers
            )
            assert resp.status_code == 201
            data = resp.json()
            assert data["content"] == "Test Alert Message"
            assert data["message_type"] == "warning"
            assert data["is_read"] is False
        
    async def test_list_messages(self, db: AsyncSession):
        org, user, token = await _make_org_user_token(db, "list")
        headers = {"Authorization": f"Bearer {token}"}
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as local_client:
            # Create a message
            await local_client.post(
                "/api/v1/messages",
                json={"content": "Alert 1", "message_type": "info"},
                headers=headers
            )
            
            resp = await local_client.get("/api/v1/messages", headers=headers)
            assert resp.status_code == 200
            data = resp.json()
            assert len(data) >= 1
            assert data[0]["content"] == "Alert 1"

    async def test_mark_message_read(self, db: AsyncSession):
        org, user, token = await _make_org_user_token(db, "read")
        headers = {"Authorization": f"Bearer {token}"}
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as local_client:
            resp = await local_client.post(
                "/api/v1/messages",
                json={"content": "Alert to read", "message_type": "info"},
                headers=headers
            )
            msg_id = resp.json()["id"]
            
            patch_resp = await local_client.patch(
                f"/api/v1/messages/{msg_id}/read",
                headers=headers
            )
            assert patch_resp.status_code == 200
            assert patch_resp.json()["is_read"] is True

    async def test_mark_all_read(self, db: AsyncSession):
        org, user, token = await _make_org_user_token(db, "readall")
        headers = {"Authorization": f"Bearer {token}"}
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as local_client:
            await local_client.post(
                "/api/v1/messages",
                json={"content": "Alert 1", "message_type": "info"},
                headers=headers
            )
            await local_client.post(
                "/api/v1/messages",
                json={"content": "Alert 2", "message_type": "warning"},
                headers=headers
            )
            
            patch_resp = await local_client.patch(
                "/api/v1/messages/read-all",
                headers=headers
            )
            assert patch_resp.status_code == 200
            assert patch_resp.json()["updated_count"] == 2
            
            get_resp = await local_client.get("/api/v1/messages", headers=headers)
            for msg in get_resp.json():
                assert msg["is_read"] is True

    async def test_delete_all_messages(self, db: AsyncSession):
        org, user, token = await _make_org_user_token(db, "delete")
        headers = {"Authorization": f"Bearer {token}"}
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as local_client:
            await local_client.post(
                "/api/v1/messages",
                json={"content": "Alert to clear", "message_type": "info"},
                headers=headers
            )
            
            get_resp = await local_client.get("/api/v1/messages", headers=headers)
            assert len(get_resp.json()) == 1
            
            del_resp = await local_client.delete("/api/v1/messages", headers=headers)
            assert del_resp.status_code == 204
            
            get_resp_empty = await local_client.get("/api/v1/messages", headers=headers)
            assert len(get_resp_empty.json()) == 0
