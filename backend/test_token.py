import asyncio
from sqlalchemy import select, func, and_
from app.db.session import AsyncSessionLocal
from app.models.token import Token
from app.models.organization import Organization
from datetime import datetime, timezone

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Token).where(Token.status == 'done').order_by(Token.updated_at.desc()).limit(1))
        t = res.scalar()
        if t:
            print(f"Latest DONE Token: ID={t.id}")
            print(f"Created At: {t.created_at}")
            print(f"Served At: {t.served_at}")
            print(f"Completed At: {t.completed_at}")
            print(f"Updated At: {t.updated_at}")
        else:
            print("No done tokens found.")

asyncio.run(main())
