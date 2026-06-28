import asyncio
from sqlalchemy import select, func
from app.db.session import async_session_maker
from app.models.queue import Queue

async def main():
    async with async_session_maker() as db:
        res = await db.execute(select(func.count(Queue.id)))
        print(f"Total Queues: {res.scalar_one()}")

if __name__ == "__main__":
    asyncio.run(main())
