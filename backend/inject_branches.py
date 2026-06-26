import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from app.models.user import User
from app.models.queue import Queue
from app.models.session import Session
from app.models.token import Token
from sqlalchemy import select

async def inject():
    async with AsyncSessionLocal() as db:
        # 1. Find a parent org
        from app.models.parent_organization import ParentOrganization
        res = await db.execute(select(ParentOrganization).limit(1))
        parent_org = res.scalars().first()
        if not parent_org:
            print("No parent organization found.")
            return

        # 2. Create 2 branches
        b1_id = uuid.uuid4()
        b2_id = uuid.uuid4()

        res = await db.execute(select(Organization).where(Organization.slug == "mumbai-downtown"))
        b1 = res.scalars().first()
        if not b1:
            b1 = Organization(
                id=b1_id,
                name="Mumbai Downtown",
                slug="mumbai-downtown",
                address="123 Dalal Street, Mumbai",
                phone_number="+91-22-12345678",
                contact_email="mumbai@q4queue.com",
                manager_name="Amit Shah",
                is_active=True,
                parent_organization_id=parent_org.id
            )
            db.add(b1)

        res = await db.execute(select(Organization).where(Organization.slug == "delhi-central"))
        b2 = res.scalars().first()
        if not b2:
            b2 = Organization(
                id=b2_id,
                name="Delhi Central",
                slug="delhi-central",
                address="45 Connaught Place, New Delhi",
                phone_number="+91-11-87654321",
                contact_email="delhi@q4queue.com",
                manager_name="Neha Gupta",
                is_active=True,
                parent_organization_id=parent_org.id
            )
            db.add(b2)
        await db.commit()
        b1_id = b1.id
        b2_id = b2.id

        # 3. Create Queues for branches
        q1_id = uuid.uuid4()
        q2_id = uuid.uuid4()

        res = await db.execute(select(Queue).where(Queue.org_id == b1_id))
        q1 = res.scalars().first()
        if not q1:
            q1 = Queue(id=q1_id, org_id=b1_id, name="General Checkup", prefix="A", is_active=True, starting_sequence=1, current_token_number=10)
            db.add(q1)
            
        res = await db.execute(select(Queue).where(Queue.org_id == b2_id))
        q2 = res.scalars().first()
        if not q2:
            q2 = Queue(id=q2_id, org_id=b2_id, name="Premium Service", prefix="B", is_active=True, starting_sequence=1, current_token_number=5)
            db.add(q2)
            
        await db.commit()
        q1_id = q1.id
        q2_id = q2.id

        # 4. Create Sessions for today
        today = datetime.now(timezone.utc).date()
        s1_id = uuid.uuid4()
        s2_id = uuid.uuid4()

        res = await db.execute(select(Session).where(Session.org_id == b1_id))
        s1 = res.scalars().first()
        if not s1:
            s1 = Session(id=s1_id, org_id=b1_id, session_date=today, title="Morning Shift")
            db.add(s1)
            
        res = await db.execute(select(Session).where(Session.org_id == b2_id))
        s2 = res.scalars().first()
        if not s2:
            s2 = Session(id=s2_id, org_id=b2_id, session_date=today, title="Full Day Shift")
            db.add(s2)

        await db.commit()
        s1_id = s1.id
        s2_id = s2.id

        # 5. Create tokens (customers)
        # Delete existing tokens for these branches to prevent duplicates
        await db.execute(Token.__table__.delete().where(Token.org_id.in_([b1_id, b2_id])))
        await db.commit()
        
        # 6. Create Users (Branch Admin & Staff)
        from app.core.security import hash_password
        
        mumbai_admin_email = "admin@mumbai.q4queue.com"
        res = await db.execute(select(User).where(User.email == mumbai_admin_email))
        mumbai_admin = res.scalars().first()
        if not mumbai_admin:
            mumbai_admin = User(
                id=uuid.uuid4(),
                org_id=b1_id,
                parent_organization_id=parent_org.id,
                email=mumbai_admin_email,
                first_name="Mumbai",
                last_name="Admin",
                password_hash=hash_password("password123"),
                role="branch_admin",
                is_active=True
            )
            db.add(mumbai_admin)
            
        delhi_admin_email = "admin@delhi.q4queue.com"
        res = await db.execute(select(User).where(User.email == delhi_admin_email))
        delhi_admin = res.scalars().first()
        if not delhi_admin:
            delhi_admin = User(
                id=uuid.uuid4(),
                org_id=b2_id,
                parent_organization_id=parent_org.id,
                email=delhi_admin_email,
                first_name="Delhi",
                last_name="Admin",
                password_hash=hash_password("password123"),
                role="branch_admin",
                is_active=True
            )
            db.add(delhi_admin)
            
        await db.commit()
        
        now = datetime.now(timezone.utc)
        tokens = []
        for i in range(10): # 10 tokens for Mumbai
            status = "done" if i < 5 else ("serving" if i == 5 else "waiting")
            t = Token(
                id=uuid.uuid4(),
                org_id=b1_id,
                queue_id=q1_id,
                session_id=s1_id,
                token_number=i+1,
                status=status,
                created_at=now - timedelta(minutes=60-i*5),
                served_at=now - timedelta(minutes=30-i*5) if status in ["done", "serving"] else None,
                completed_at=now - timedelta(minutes=20-i*5) if status == "done" else None,
                customer_name=f"Customer {i+1} (Mumbai)",
                customer_phone=f"987654321{i}"
            )
            tokens.append(t)

        for i in range(5): # 5 tokens for Delhi
            status = "done" if i < 2 else ("serving" if i == 2 else "waiting")
            t = Token(
                id=uuid.uuid4(),
                org_id=b2_id,
                queue_id=q2_id,
                session_id=s2_id,
                token_number=i+1,
                status=status,
                created_at=now - timedelta(minutes=60-i*10),
                served_at=now - timedelta(minutes=30-i*10) if status in ["done", "serving"] else None,
                completed_at=now - timedelta(minutes=20-i*10) if status == "done" else None,
                customer_name=f"Customer {i+1} (Delhi)",
                customer_phone=f"123456789{i}"
            )
            tokens.append(t)

        db.add_all(tokens)
        await db.commit()
        print("Successfully injected 2 new branches with queues, sessions, and customer tokens.")

if __name__ == "__main__":
    asyncio.run(inject())
