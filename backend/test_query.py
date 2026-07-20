import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from app.models.token import Token
from datetime import datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv("backend/.env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql+asyncpg://admin:securepassword@localhost:5432/queuedb"

engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test():
    async with AsyncSessionLocal() as db:
        tz_string = "UTC"
        now_local = datetime.now(ZoneInfo(tz_string))
        today = now_local.date()
        
        q = select(Token.status, func.count(Token.id)).where(
            func.date(func.timezone(tz_string, Token.created_at)) == today
        ).group_by(Token.status)
        
        res = await db.execute(q)
        print("Today:", dict(res.all()))

        # Let's just select all tokens and their created_at
        q2 = select(Token.id, Token.status, Token.created_at)
        res2 = await db.execute(q2)
        print("\nAll tokens:")
        for r in res2.all():
            print(r)

asyncio.run(test())
