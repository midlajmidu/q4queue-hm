import asyncio
import json
from sqlalchemy import select, and_, func
from app.db.session import async_session_maker
from app.models.token import Token

async def main():
    async with async_session_maker() as db:
        res = await db.execute(select(
            func.date(func.timezone('Asia/Kolkata', Token.created_at)).label('dt'),
            func.avg(func.extract('epoch', Token.served_at - Token.created_at)).label('avg_wait'),
            func.avg(func.extract('epoch', Token.completed_at - Token.served_at)).label('avg_serve'),
            func.count(Token.id)
        ).group_by('dt'))
        
        for r in res.all():
            print(f"dt: {r[0]}, wait: {r[1]}, serve: {r[2]}, count: {r[3]}")

asyncio.run(main())
