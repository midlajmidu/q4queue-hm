import asyncio
import uuid
import random
from datetime import datetime, timedelta, date

from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from app.models.session import Session
from app.models.queue import Queue
from app.models.token import Token
from sqlalchemy import select

async def inject_data():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Organization).where(Organization.name.ilike('%XYZ%')))
        org = result.scalars().first()
        
        if not org:
            print("Could not find XYZ clinic in the database!")
            return

        print(f"Injecting time-distributed data for branch: {org.name} (ID: {org.id})")
        
        now = datetime.utcnow()
        today = now.date()
        
        # Find or create a session for today's diverse graph data
        result = await db.execute(select(Session).where(
            Session.org_id == org.id,
            Session.session_date == today
        ))
        s = result.scalars().first()
        
        if not s:
            s = Session(
                id=uuid.uuid4(),
                org_id=org.id,
                title=f"Graph Data Session {now.strftime('%H:%M:%S')}",
                session_date=today
            )
            db.add(s)
            await db.flush()
        
        statuses = ['waiting', 'serving', 'done', 'skipped']
        
        # 10 queues for today
        for q_idx in range(10):
            q = Queue(
                id=uuid.uuid4(),
                org_id=org.id,
                session_id=s.id,
                name=f"Graph Queue {q_idx+1}",
                prefix="G",
                is_active=True,
                current_token_number=50,
                total_served=40
            )
            db.add(q)
            await db.flush()
            
            # Inject 50 users spread across the last 8 hours
            for u_idx in range(50):
                # Pick a random hour offset from 0 to 8 hours ago
                hour_offset = random.randint(0, 8)
                minute_offset = random.randint(0, 59)
                
                # Base time for this token
                base_time = now - timedelta(hours=hour_offset, minutes=minute_offset)
                
                status = random.choice(statuses)
                
                served_time = None
                completed_time = None
                
                if status in ['serving', 'done']:
                    # Wait time between 5 and 45 minutes
                    wait_mins = random.randint(5, 45)
                    served_time = base_time + timedelta(minutes=wait_mins)
                
                if status == 'done':
                    # Service time between 10 and 30 minutes
                    service_mins = random.randint(10, 30)
                    completed_time = served_time + timedelta(minutes=service_mins)
                    
                t = Token(
                    id=uuid.uuid4(),
                    org_id=org.id,
                    queue_id=q.id,
                    session_id=s.id,
                    token_number=u_idx + 1,
                    status=status,
                    created_at=base_time,
                    served_at=served_time,
                    completed_at=completed_time,
                    customer_name=f"Graph User {u_idx+1}",
                    customer_phone=f"+1555{random.randint(1000000, 9999999)}"
                )
                db.add(t)

        await db.commit()
        print("Time-distributed data injection complete!")

if __name__ == "__main__":
    asyncio.run(inject_data())
