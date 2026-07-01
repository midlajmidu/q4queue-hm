import asyncio
from httpx import AsyncClient
from app.main import app
from app.core.security import create_access_token
from app.db.session import async_session_maker
from sqlalchemy import select
from app.models.user import User
import sys

async def test():
    async with async_session_maker() as db:
        res = await db.execute(select(User).where(User.role == "organization_admin").limit(1))
        user = res.scalar_one_or_none()
        if not user:
            print("No user found")
            return
        
        token = create_access_token(
            subject=str(user.id),
            extra_claims={
                "org_id": str(user.org_id) if user.org_id else None,
                "parent_org_id": str(user.parent_organization_id) if user.parent_organization_id else None,
                "role": user.role
            }
        )
        print("Generated token")

    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/organization-admin/monitoring/sessions?target_date=2026-07-01", headers={"Authorization": f"Bearer {token}"})
        print("Status code:", response.status_code)
        if response.status_code == 500:
            print("Error:", response.text)
        else:
            print("Success")

if __name__ == "__main__":
    asyncio.run(test())
