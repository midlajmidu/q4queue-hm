import asyncio
from sqlalchemy import select, update
from app.db.session import SessionLocal
from app.models.token import Token, TokenStatus
from app.models.queue import Queue

async def main():
    async with SessionLocal() as db:
        # Just generate the SQL statement to see if it compiles correctly
        stmt = update(Token).where(Token.status == "waiting").values(status="deleted")
        try:
            await db.execute(stmt)
            await db.commit()
            print("SUCCESS")
        except Exception as e:
            print(f"ERROR: {e}")

asyncio.run(main())
