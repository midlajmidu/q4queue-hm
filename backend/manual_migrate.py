import asyncio
import sys
sys.path.insert(0, '/Users/muzammil/Documents/q4queue/qrq/backend')
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(text('ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;'))
            await db.execute(text("UPDATE alembic_version SET version_num='a11111111111'"))
            await db.commit()
            print("Migration applied manually.")
        except Exception as e:
            print("Error:", e)

asyncio.run(main())
