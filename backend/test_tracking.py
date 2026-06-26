import asyncio
import uuid
from sqlalchemy import select
from app.db.session import async_session_maker
from app.models.token import Token, TokenStatus

async def main():
    async with async_session_maker() as session:
        # Find a deleted token
        result = await session.execute(select(Token).where(Token.status == TokenStatus.deleted).limit(1))
        token = result.scalar_one_or_none()
        if token:
            print(f"Found deleted token with tracking_id: {token.tracking_id}")
        else:
            print("No deleted tokens found")

if __name__ == "__main__":
    asyncio.run(main())
