import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://appuser:apppassword@localhost:5432/queuedb"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT status, count(*), 
                   sum(case when served_by_id is not null then 1 else 0 end) as has_served_by,
                   sum(case when completed_by_id is not null then 1 else 0 end) as has_completed_by
            FROM tokens 
            GROUP BY status;
        """))
        print("Status | Count | Has served_by_id | Has completed_by_id")
        for row in res:
            print(row)

asyncio.run(main())
