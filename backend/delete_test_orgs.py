import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select, or_

from app.db.base import Base
from app.models.organization import Organization
import os

async def main():
    database_url = os.getenv("DATABASE_URL")
    engine = create_async_engine(database_url, echo=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    test_pattern = or_(
        Organization.name.ilike("Msg Org%"),
        Organization.name.ilike("Q Org%"),
        Organization.name.ilike("%test%"),
        Organization.slug.ilike("%test%"),
    )
    
    async with async_session() as session:
        # Find test orgs
        result = await session.execute(select(Organization).where(test_pattern))
        test_orgs = result.scalars().all()
        
        print(f"Found {len(test_orgs)} test orgs to delete.")
        
        for org in test_orgs:
            await session.delete(org)
            
        await session.commit()
        print("Successfully deleted all test orgs.")

if __name__ == "__main__":
    asyncio.run(main())
