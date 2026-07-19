import asyncio
import uuid
import sys
sys.path.append('.')

from app.db.session import async_session_maker
from app.services.analytics_service import get_cross_branch_excel_data

async def main():
    async with async_session_maker() as db:
        # Get a parent org id to test
        try:
            excel_bytes = await get_cross_branch_excel_data(
                db=db,
                org_ids=[uuid.UUID("32fa7fb0-4b07-4b1a-98d2-b26efe465e6b")], # Mock UUID
                parent_org_id=uuid.UUID("f99fe377-88a8-4314-b97b-c7a3c0f9deaf")
            )
            print(f"Success! Bytes length: {len(excel_bytes)}")
        except Exception as e:
            print(f"Failed with exception: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
