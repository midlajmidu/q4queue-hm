import asyncio
from sqlalchemy import select, func, case, text
from app.db.session import async_session_maker
from app.models.token import Token, TokenStatus
from dateutil.parser import parse

async def main():
    async with async_session_maker() as db:
        res = await db.execute(select(
            func.count(Token.id).label("total_customers"),
            func.sum(case((Token.status == TokenStatus.done, 1), else_=0)).label("served"),
            func.sum(case((Token.status == TokenStatus.waiting, 1), else_=0)).label("waiting"),
            func.sum(case((Token.status == TokenStatus.serving, 1), else_=0)).label("serving")
        ))
        row = res.first()
        print(f"Total: {row.total_customers}, Served: {row.served}, Waiting: {row.waiting}, Serving: {row.serving}")

if __name__ == "__main__":
    asyncio.run(main())
