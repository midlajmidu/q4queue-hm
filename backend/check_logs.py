import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

async def check():
    async with SessionLocal() as db:
        res = await db.execute(text("SELECT event_type, created_at, org_id FROM audit_logs ORDER BY created_at DESC LIMIT 5"))
        for row in res:
            print(dict(row._mapping))

asyncio.run(check())
