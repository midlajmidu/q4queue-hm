import asyncio
import uuid
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from datetime import datetime, timezone

from app.core.config import settings
from app.models.organization import Organization
from app.models.user import User

async def main():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Get a parent organization
        orgs = await session.execute(select(Organization).limit(10))
        orgs = orgs.scalars().all()
        
        print(f"Found {len(orgs)} organizations")
        for org in orgs:
            # Test the staff counting logic
            b_staff = await session.execute(
                select(func.count(User.id)).where(User.org_id == org.id, User.role == "staff", User.is_active == True)
            )
            staff_count = b_staff.scalar() or 0
            
            # The fallback logic
            final_count = staff_count
            if final_count == 0:
                final_count = org.max_staff
                
            print(f"Org: {org.name} | Staff Count Query: {staff_count} | Final Fallback Capacity: {final_count} | org.max_staff: {org.max_staff}")

if __name__ == "__main__":
    asyncio.run(main())
