import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.parent_organization import ParentOrganization
from app.services.org_backup_service import create_org_backup

async def main():
    async with AsyncSessionLocal() as db:
        pos = await db.scalars(select(ParentOrganization.id))
        pos_list = pos.all()
        print(f"Found {len(pos_list)} parent orgs. Running backups...")
        for po_id in pos_list:
            try:
                record = await create_org_backup(po_id, db)
                print(f"Successfully backed up {po_id}. File: {record.filename}, Size: {record.size_bytes} bytes")
            except Exception as e:
                print(f"Failed to backup {po_id}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
