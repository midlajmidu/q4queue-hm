import asyncio
import uuid
from app.db.session import SessionLocal
from sqlalchemy import select
from app.models.token import Token
from app.models.queue import Queue

async def main():
    async with SessionLocal() as db:
        result = await db.execute(
            select(Token, Queue.name, Queue.prefix, Queue.session_id)
            .join(Queue, Token.queue_id == Queue.id)
            .limit(1)
        )
        row = result.one_or_none()
        print("Row:", row)
        if row:
            token, queue_name, queue_prefix, session_id = row
            print("Token ID:", token.id)
            print("Queue Name:", queue_name)
            print("Queue Prefix:", queue_prefix)
            print("Session ID:", session_id)

asyncio.run(main())
