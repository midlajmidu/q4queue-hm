import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def add_column():
    async with AsyncSessionLocal() as db:
        await db.execute(text('ALTER TABLE parent_organizations ADD COLUMN IF NOT EXISTS max_branches INTEGER;'))
        await db.commit()
        print("Successfully added max_branches column!")

asyncio.run(add_column())
