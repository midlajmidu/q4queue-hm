import asyncio
from app.db.session import async_session
from app.models.token import Token
from app.schemas.token import TokenResponse
from sqlalchemy import select

async def main():
    async with async_session() as db:
        res = await db.execute(select(Token).limit(1))
        t = res.scalars().first()
        if t:
            print(TokenResponse.model_validate(t).model_dump_json())
        else:
            print("No tokens")

asyncio.run(main())
