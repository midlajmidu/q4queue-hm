import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.parent_organization import ParentOrganization

async def check_db():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ParentOrganization))
        orgs = result.scalars().all()
        for org in orgs:
            print(f"ID: {org.id}, Name: {org.name}, Max Branches: {org.max_branches}")

if __name__ == "__main__":
    asyncio.run(check_db())
