import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.models.token import Token, TokenStatus

async def main():
    engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost/qrq_db")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute("SELECT status, count(*) FROM tokens GROUP BY status")
        counts = result.fetchall()
        print(f"Token counts: {counts}")

asyncio.run(main())
