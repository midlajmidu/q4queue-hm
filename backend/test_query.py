import asyncio
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session_maker
from app.models.token import Token, TokenStatus

async def main():
    async with async_session_maker() as session:
        query = select(
            Token.session_id,
            func.sum(case((Token.status == TokenStatus.done, 1), else_=0)).label("total_served"),
            func.count(Token.id).label("total_issued"),
        ).group_by(Token.session_id)
        
        result = await session.execute(query)
        for row in result.all():
            print(f"Session {row.session_id}: {row.total_served} served, {row.total_issued} issued")

asyncio.run(main())
