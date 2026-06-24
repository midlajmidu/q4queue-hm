import asyncio
import logging
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.parent_organization import ParentOrganization
from app.services.org_backup_service import create_org_backup

logging.basicConfig(level=logging.INFO)

async def main():
    async with AsyncSessionLocal() as db:
        orgs = (await db.scalars(select(ParentOrganization))).all()
        for org in orgs:
            try:
                await create_org_backup(org.id, db)
                print(f"Created fresh backup for {org.slug}")
            except Exception as e:
                print(f"Failed for {org.slug}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
