import asyncio
from app.db.session import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='queues';"))
        columns = [row[0] for row in res.fetchall()]
        print("Columns in queues table:", columns)

asyncio.run(main())
