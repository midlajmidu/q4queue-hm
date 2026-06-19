import asyncio
import os
import sys
import random
import uuid
from datetime import datetime, timedelta, date, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from app.db.session import AsyncSessionLocal, connect_db
from app.models.organization import Organization
from app.models.session import Session
from app.models.queue import Queue
from app.models.token import Token, TokenStatus

# Realistic data choices
SESSION_TITLES = ['Morning Shift', 'Afternoon Peak', 'Weekend Rush', 'Night Ops', 'Holiday Overflow', 'Standard Clinic', 'VIP Support']
QUEUE_NAMES = ['General Support', 'Billing', 'VIP Desk', 'New Registration', 'Returns', 'Specialist Consult', 'Account Management', 'Technical Support']

async def seed_dashboard() -> None:
    try:
        await connect_db()
    except Exception as e:
        print(f"❌ Failed to connect to DB: {e}")
        sys.exit(1)

    try:
        async with AsyncSessionLocal() as db:
            # 1. Get or create an organization
            res = await db.execute(select(Organization).limit(1))
            org = res.scalar_one_or_none()
            if not org:
                org = Organization(name="Test Org", slug="test-org")
                db.add(org)
                await db.commit()
                await db.refresh(org)
            
            print(f"Using Organization: {org.name} (ID: {org.id})")

            # 2. Delete existing test data to ensure clean slate if needed (optional)
            # We'll just append for now, but 100 sessions is a lot.
            
            # Generate exactly 100 distinct Session records
            print("Generating 100 Sessions over the last 50 days...")
            sessions_to_insert = []
            now = datetime.now(timezone.utc)
            
            # 2 sessions per day for 50 days = 100 sessions
            for i in range(100):
                days_ago = i // 2
                session_time = now - timedelta(days=days_ago)
                if i % 2 == 0:
                    session_time = session_time.replace(hour=9, minute=0, second=0)
                else:
                    session_time = session_time.replace(hour=14, minute=0, second=0)
                
                # SQLAlchemy model instance
                sess_id = uuid.uuid4()
                # To avoid unique constraint on (org_id, session_date), we need distinct dates or just one session per date?
                # Ah, Session has UniqueConstraint("org_id", "session_date"). 
                # If we need 100 sessions, we need 100 different dates for the same org!
                # So we spread them over 100 days, not 50. Wait, the prompt said "(roughly 2 sessions per day)".
                # If schema enforces 1 session per date per org, we MUST spread over 100 days.
                session_date = (now - timedelta(days=i)).date()

                title = random.choice(SESSION_TITLES)
                sessions_to_insert.append({
                    "id": sess_id,
                    "org_id": org.id,
                    "session_date": session_date,
                    "title": title,
                    "created_at": session_time
                })
            
            # Batch insert Sessions using mappings
            await db.execute(Session.__table__.insert().values(sessions_to_insert))
            
            print("Generating 20 Queues per session (2,000 total)...")
            queues_to_insert = []
            queue_ids = []
            for sess in sessions_to_insert:
                for q_idx in range(20):
                    q_id = uuid.uuid4()
                    is_active = random.choice([True, True, True, False])
                    is_paused = random.choice([True, False]) if is_active else False
                    
                    queues_to_insert.append({
                        "id": q_id,
                        "org_id": org.id,
                        "session_id": sess["id"],
                        "token_session_id": uuid.uuid4(),
                        "name": f"{random.choice(QUEUE_NAMES)} {q_idx+1}",
                        "prefix": chr(65 + (q_idx % 26)),
                        "announcement": "",
                        "current_token_number": 0,
                        "is_active": is_active,
                        "is_paused": is_paused,
                        "created_at": sess["created_at"]
                    })
                    queue_ids.append((q_id, sess["id"], sess["created_at"]))
            
            # Batch insert Queues in chunks
            chunk_size = 500
            for i in range(0, len(queues_to_insert), chunk_size):
                await db.execute(Queue.__table__.insert().values(queues_to_insert[i:i+chunk_size]))
                
            print("Generating Tokens (Visitors, Served, Wait Time) for 2,000 queues...")
            tokens_to_insert = []
            
            for q_id, sess_id, sess_created_at in queue_ids:
                visitors = random.randint(0, 150)
                if visitors == 0:
                    continue
                
                served = random.randint(0, visitors)
                
                for t_idx in range(visitors):
                    status = TokenStatus.waiting
                    served_at = None
                    completed_at = None
                    
                    # Distribute statuses
                    if t_idx < served:
                        status = TokenStatus.done
                        # Wait time: 2 to 45 mins
                        wait_mins = random.randint(2, 45)
                        serve_mins = random.randint(1, 15)
                        
                        created_at = sess_created_at + timedelta(minutes=t_idx*2)
                        served_at = created_at + timedelta(minutes=wait_mins)
                        completed_at = served_at + timedelta(minutes=serve_mins)
                    else:
                        # Sometimes skip or leave waiting
                        if random.random() < 0.1:
                            status = TokenStatus.skipped
                        else:
                            status = TokenStatus.waiting
                            
                        created_at = sess_created_at + timedelta(minutes=t_idx*2)
                    
                    tokens_to_insert.append({
                        "id": uuid.uuid4(),
                        "org_id": org.id,
                        "queue_id": q_id,
                        "session_id": sess_id,
                        "token_number": t_idx + 1,
                        "status": status,
                        "created_at": created_at,
                        "served_at": served_at,
                        "completed_at": completed_at,
                        "customer_name": f"Customer {t_idx+1}",
                        "customer_phone": f"555-{random.randint(1000,9999)}"
                    })
            
            print(f"Total Tokens to insert: {len(tokens_to_insert)}")
            
            # Insert tokens in chunks of 5000 to be safe
            t_chunk_size = 5000
            for i in range(0, len(tokens_to_insert), t_chunk_size):
                await db.execute(Token.__table__.insert().values(tokens_to_insert[i:i+t_chunk_size]))
                if i % 25000 == 0 and i > 0:
                    print(f"  ...inserted {i} tokens")
            
            # Need to update current_token_number on Queues
            print("Committing to database...")
            await db.commit()
            print("✅ 100 Sessions, 2000 Queues, and matching Tokens generated successfully!")

    except SQLAlchemyError as db_err:
        print(f"\n❌ Database operation failed: {db_err}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(seed_dashboard())
