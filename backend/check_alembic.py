import asyncio
import sys
sys.path.insert(0, '/Users/muzammil/Documents/q4queue/qrq/backend')
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text('SELECT * FROM alembic_version'))
        print("ALEMBIC_VERSION:", [row[0] for row in result.all()])

asyncio.run(main())
