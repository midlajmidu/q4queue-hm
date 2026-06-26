import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.endpoints.organization_admin import get_branch_details
from app.models.user import User
import uuid

async def test():
    async with AsyncSessionLocal() as db:
        # Mock a user
        current_user = User(
            id=uuid.uuid4(),
            email="test@test.com",
            parent_organization_id=uuid.UUID("9b3ca0ca-b6c9-4e16-9dfb-ad0436ac30b6") # Doesn't matter
        )
        
        # Let's get a valid branch from the DB
        from sqlalchemy import select
        from app.models.organization import Organization
        res = await db.execute(select(Organization).where(Organization.parent_organization_id.is_not(None)).limit(1))
        org = res.scalars().first()
        if not org:
            print("No branches found")
            return
            
        current_user.parent_organization_id = org.parent_organization_id
        branch_id = org.id
        
        try:
            from app.api.v1.endpoints.organization_admin_operations import (
                get_branch_summary, get_branch_performance, get_branch_queues, 
                get_branch_sessions, get_branch_staff, get_branch_admins, 
                get_branch_whatsapp, get_branch_health, get_branch_timeline, 
                get_branch_alerts, get_branch_contact
            )
            endpoints = [
                ("get_branch_summary", get_branch_summary),
                ("get_branch_performance", get_branch_performance),
                ("get_branch_queues", get_branch_queues),
                ("get_branch_sessions", get_branch_sessions),
                ("get_branch_staff", get_branch_staff),
                ("get_branch_admins", get_branch_admins),
                ("get_branch_whatsapp", get_branch_whatsapp),
                ("get_branch_health", get_branch_health),
                ("get_branch_timeline", get_branch_timeline),
                ("get_branch_alerts", get_branch_alerts),
                ("get_branch_contact", get_branch_contact)
            ]
            for name, func in endpoints:
                print(f"Testing {name}...")
                try:
                    async with AsyncSessionLocal() as db_fresh:
                        await func(branch_id=branch_id, db=db_fresh, current_user=current_user)
                except Exception as e:
                    import traceback
                    traceback.print_exc()
            print("Done testing modular endpoints.")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
