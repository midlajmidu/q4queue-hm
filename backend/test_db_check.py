import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import uuid
import sys
import os

# Add backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.parent_organization import ParentOrganization
from app.db.session import async_session_maker

async def check_db():
    async with async_session_maker() as session:
        result = await session.execute(select(ParentOrganization))
        orgs = result.scalars().all()
        for org in orgs:
            print(f"Org: {org.name}, enable_shared_tokens: {org.enable_shared_tokens}")

if __name__ == "__main__":
    asyncio.run(check_db())
