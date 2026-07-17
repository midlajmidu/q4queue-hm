import asyncio
from sqlalchemy import select, func, and_
from app.db.session import AsyncSessionLocal
from app.models.token import Token
from app.models.organization import Organization

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Token.org_id, func.count(Token.id)).group_by(Token.org_id).limit(1))
        row = res.first()
        if not row:
            print("No tokens found")
            return
        
        org_id = row[0]
        
        # Test query
        hq = select(
            func.extract('hour', func.timezone('Asia/Kolkata', Token.created_at)).label('hr'),
            func.count(Token.id)
        ).where(Token.org_id == org_id).group_by('hr').order_by('hr')
        
        r = await db.execute(hq)
        for row in r.all():
            print(row)

asyncio.run(main())
