import asyncio
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.token import Token, TokenStatus
from app.models.user import User

async def main():
    engine = create_async_engine("postgresql+asyncpg://appuser:apppassword@postgres:5432/queuedb")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        staff_perf_query = select(
            User.id,
            User.first_name,
            User.last_name,
            User.email,
            func.count(Token.id).label('total_served'),
            func.avg(func.extract('epoch', Token.completed_at - Token.served_at)).label('avg_serve'),
        ).join(
            User, Token.served_by_id == User.id
        ).where(
            and_(Token.status == 'done')
        ).group_by(User.id).order_by(func.count(Token.id).desc())
        
        # Print SQL
        print(staff_perf_query.compile(compile_kwargs={"literal_binds": True}))
        
        res = await db.execute(staff_perf_query)
        print("Rows:", res.all())

if __name__ == "__main__":
    asyncio.run(main())
