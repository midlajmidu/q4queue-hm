import asyncio
import uuid
import random
from datetime import datetime, timedelta

from app.db.session import AsyncSessionLocal
from app.models.parent_organization import ParentOrganization
from app.models.organization import Organization
from app.models.user import User
from app.audit.models import AuditLog
from sqlalchemy import select

async def inject_audit_logs():
    async with AsyncSessionLocal() as db:
        # Get the first parent organization
        result = await db.execute(select(ParentOrganization))
        parent_org = result.scalars().first()
        
        if not parent_org:
            print("No parent organization found!")
            return

        # Get all branches
        result = await db.execute(select(Organization).where(Organization.parent_organization_id == parent_org.id))
        branches = result.scalars().all()
        
        if not branches:
            print("No branches found!")
            return

        # Get all users in this org
        result = await db.execute(select(User).where(User.parent_organization_id == parent_org.id))
        users = result.scalars().all()

        if not users:
            print("No users found!")
            return

        print(f"Injecting 35 realistic Audit Logs for {parent_org.name}...")

        actions = [
            ("USER_LOGIN", "user", "Logged into the system"),
            ("CREATE_QUEUE", "queue", "Created a new queue for VIP patients"),
            ("UPDATE_BRANCH", "organization", "Updated branch operating hours"),
            ("DELETE_SESSION", "session", "Deleted accidental duplicate session"),
            ("CREATE_STAFF", "user", "Added new branch receptionist"),
            ("UPDATE_QUEUE_CAPACITY", "queue", "Increased max queue capacity to 100"),
            ("USER_LOGOUT", "user", "Logged out of the system")
        ]

        now = datetime.utcnow()

        for i in range(35):
            branch = random.choice(branches)
            user = random.choice(users)
            action, entity, reason = random.choice(actions)
            
            # Distribute the logs over the past 3 days
            hours_ago = random.randint(0, 72)
            mins_ago = random.randint(0, 59)
            log_time = now - timedelta(hours=hours_ago, minutes=mins_ago)
            
            # Dummy JSON details
            details = {
                "ip": f"192.168.1.{random.randint(10, 255)}",
                "browser": "Chrome 114.0.0.0",
                "reason": reason
            }
            if "UPDATE" in action:
                details["old_value"] = random.randint(10, 50)
                details["new_value"] = random.randint(51, 100)

            log = AuditLog(
                id=uuid.uuid4(),
                event_type=action,
                org_id=branch.id,
                parent_organization_id=parent_org.id,
                user_id=user.id,
                ip_address=details["ip"],
                resource_type=entity,
                resource_id=str(uuid.uuid4()),
                details=details,
            )
            # Override created_at to simulate history
            log.created_at = log_time

            db.add(log)

        await db.commit()
        print("Success! 35 Audit Logs injected.")

if __name__ == "__main__":
    asyncio.run(inject_audit_logs())
