import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.organization import Organization
from app.models.user import User
from sqlalchemy import select
import json
from app.core.security import create_access_token

async def get_token():
    async with SessionLocal() as db:
        user = await db.scalar(select(User).limit(1))
        org = await db.scalar(select(Organization).where(Organization.id == user.org_id))
        token = create_access_token(
            user_id=str(user.id),
            org_id=str(user.org_id),
            role=user.role,
            email=user.email,
            org_slug=org.slug,
            org_name=org.name,
            org_logo_url=None,
            first_name=user.first_name,
            last_name=user.last_name,
            is_first_login=user.is_first_login
        )
        return token

token = asyncio.run(get_token())
client = TestClient(app)
response = client.get("/api/v1/organization/settings", headers={"Authorization": f"Bearer {token}"})
print(response.status_code)
print(response.json())
