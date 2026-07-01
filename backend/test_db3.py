import asyncio
import os
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select, or_
from dotenv import load_dotenv
from app.models.session import Session
from app.models.organization import Organization
from app.models.queue import Queue

load_dotenv(".env")
DB_URL = os.environ.get("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgresql://"):
    DB_URL = DB_URL.replace("postgresql://", "postgresql+asyncpg://")

async def main():
    engine = create_async_engine(DB_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        today = datetime.now(timezone.utc).date()
        
        active_queue_sessions_subq = select(Queue.session_id).where(Queue.is_active == True).distinct()
        
        query = (
            select(Session, Organization)
            .join(Organization, Session.org_id == Organization.id)
            .where(
                or_(
                    Session.session_date == today,
                    Session.id.in_(active_queue_sessions_subq)
                )
            )
        )
        res = await session.execute(query)
        print("Active sessions:")
        for s, org in res.all():
            print(s.id, s.session_date, org.name)

asyncio.run(main())
