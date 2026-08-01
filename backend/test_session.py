import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

async def test():
    engine = create_async_engine(os.getenv("DATABASE_URL"))
    SessionLocal = sessionmaker(bind=engine, class_=AsyncSession)
    
    async with SessionLocal() as db:
        res = await db.execute(text("SELECT id, org_id FROM queues LIMIT 1"))
        queue = res.fetchone()
        if not queue:
            print("No queues found")
            return
            
        print(f"Testing for queue: {queue.id} (org: {queue.org_id})")
        
        try:
            from app.services.session_service import get_or_create_active_session
            session = await get_or_create_active_session(db, queue_id=queue.id, org_id=queue.org_id)
            print(f"Success! Session ID: {session.id}")
        except Exception as e:
            print(f"Failed: {e}")

asyncio.run(test())
