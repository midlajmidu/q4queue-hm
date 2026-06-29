import sys
import os
import asyncio

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.models.user import User
from app.db.session import SessionLocal
from sqlalchemy import select

async def run_test():
    async with SessionLocal() as db:
        # Get an admin user
        res = await db.execute(select(User).where(User.role == 'admin').limit(1))
        user = res.scalar_one_or_none()
        
        if not user:
            print("No admin user found")
            return
            
        token = create_access_token(user.id)
        
    client = TestClient(app)
    
    print("Testing /api/v1/organization-admin/dashboard ...")
    response = client.get("/api/v1/organization-admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    print(f"Status: {response.status_code}")
    if response.status_code >= 400:
        print(response.text)

if __name__ == "__main__":
    asyncio.run(run_test())
