import asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.db.base import Base
from app.models.queue import Queue
from app.models.session import Session
from app.models.organization import Organization
from sqlalchemy import select, func
import uuid
import os

async def main():
    db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/qrq")
    engine = create_async_engine(db_url)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as db:
        res = await db.scalar(select(func.count(Queue.id)))
        print("Total queues in DB:", res)

if __name__ == "__main__":
    asyncio.run(main())
