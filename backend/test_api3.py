import asyncio
import uuid
from httpx import AsyncClient
from datetime import datetime, timezone, timedelta
from app.main import app
from app.core.security import create_access_token
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, text
from app.models.user import User
from app.models.organization import Organization
from app.models.parent_organization import ParentOrganization
from app.models.session import Session
from app.models.queue import Queue
from app.models.token import Token, TokenStatus
import traceback

async def test():
    async with AsyncSessionLocal() as db:
        # Create parent org
        parent_org_id = uuid.uuid4()
        await db.execute(text(f"INSERT INTO parent_organizations (id, name, slug, is_active) VALUES ('{parent_org_id}', 'Test Parent', 'test-parent', true)"))
        
        # Create org admin
        admin_id = uuid.uuid4()
        await db.execute(text(f"INSERT INTO users (id, email, first_name, last_name, role, is_active, parent_organization_id, password_hash) VALUES ('{admin_id}', 'admin@test.com', 'Admin', 'User', 'organization_admin', true, '{parent_org_id}', 'hash')"))
        
        # Create child org (branch)
        org_id = uuid.uuid4()
        await db.execute(text(f"INSERT INTO organizations (id, name, slug, is_active, parent_organization_id) VALUES ('{org_id}', 'Test Branch', 'test-branch', true, '{parent_org_id}')"))
        
        # Create session
        session_id = uuid.uuid4()
        today = datetime.now(timezone.utc).date()
        await db.execute(text(f"INSERT INTO sessions (id, org_id, session_date, title) VALUES ('{session_id}', '{org_id}', '{today}', 'Test Session')"))
        
        # Create queue
        queue_id = uuid.uuid4()
        await db.execute(text(f"INSERT INTO queues (id, org_id, session_id, name, prefix, is_active) VALUES ('{queue_id}', '{org_id}', '{session_id}', 'Test Queue', 'TQ', true)"))
        
        # Create token
        token_id = uuid.uuid4()
        await db.execute(text(f"INSERT INTO tokens (id, queue_id, status, token_number, current_status) VALUES ('{token_id}', '{queue_id}', 'waiting', 'TQ-1', 'waiting')"))
        
        await db.commit()
        
        print("Data inserted")

        # Generate token
        token = create_access_token(
            user_id=str(admin_id),
            org_id=None,
            parent_org_id=str(parent_org_id),
            role='organization_admin',
            email='admin@test.com',
            first_name='Admin',
            last_name='User',
            is_first_login=False,
        )

    async with AsyncClient(app=app, base_url="http://test") as ac:
        try:
            print("Calling sessions endpoint...")
            response = await ac.get(f"/api/v1/organization-admin/monitoring/sessions?target_date={today}", headers={"Authorization": f"Bearer {token}"})
            print("Sessions status:", response.status_code)
            if response.status_code != 200:
                print(response.text)
                
            print("Calling queues endpoint...")
            response = await ac.get(f"/api/v1/organization-admin/monitoring/queues?target_date={today}", headers={"Authorization": f"Bearer {token}"})
            print("Queues status:", response.status_code)
            if response.status_code != 200:
                print(response.text)
        except Exception as e:
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
