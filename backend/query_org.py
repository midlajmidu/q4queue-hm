import asyncio
from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from sqlalchemy import select
import sys

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Organization).where(Organization.name.ilike('%XYZ%')))
        orgs = result.scalars().all()
        for org in orgs:
            print(f"ID: {org.id}, Name: {org.name}, Slug: {org.slug}")

asyncio.run(main())
