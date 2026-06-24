import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.db.session import engine, async_session_maker
from app.models.organization import Organization
from app.models.user import User
from sqlalchemy import select

async def main():
    async with async_session_maker() as session:
        result = await session.execute(select(Organization))
        orgs = result.scalars().all()
        print(f"Orgs: {len(orgs)}")
        for o in orgs:
            print(o.name, o.id)

if __name__ == "__main__":
    asyncio.run(main())
