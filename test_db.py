import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv("backend/.env")
DB_URL = os.environ.get("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgresql://"):
    DB_URL = DB_URL.replace("postgresql://", "postgresql+asyncpg://")

async def main():
    engine = create_async_engine(DB_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        res = await session.execute(text("SELECT id, name, slug FROM organizations LIMIT 10"))
        print("Orgs:")
        for r in res:
            print(r)
        
        res2 = await session.execute(text("SELECT id, org_id, session_date, title FROM sessions"))
        print("\nSessions:")
        for r in res2:
            print(r)
            
        res3 = await session.execute(text("SELECT id, session_id, status FROM queues"))
        print("\nQueues:")
        for r in res3:
            print(r)

asyncio.run(main())
