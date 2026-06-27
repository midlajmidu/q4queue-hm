import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        # Check table structure
        res = await db.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'organization_announcements';
        """))
        for row in res:
            print(row)

if __name__ == "__main__":
    asyncio.run(main())
