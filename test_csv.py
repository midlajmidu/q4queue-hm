import asyncio
from app.db.session import AsyncSessionLocal
from app.services.analytics_service import get_cross_branch_csv_data
import uuid

async def main():
    async with AsyncSessionLocal() as db:
        # Assuming there is an org
        gen = get_cross_branch_csv_data(db=db, org_ids=[uuid.uuid4()])
        try:
            chunk = await gen.__anext__()
            print("First chunk:", repr(chunk[:100]))
        except StopAsyncIteration:
            print("Empty")

asyncio.run(main())
