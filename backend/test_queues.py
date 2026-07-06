import asyncio
import sys
import uuid
from datetime import datetime, timezone
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def main():
    try:
        from app.db.session import AsyncSessionLocal
        from app.models.queue import Queue
        from app.models.token import Token, TokenStatus
        from sqlalchemy import select, func
        branch_id = uuid.UUID("3a8417f0-db23-40ef-96d9-6f07938768c4")
        
        async with AsyncSessionLocal() as db:
            today = datetime.now(timezone.utc).date()
            queues_res = await db.execute(select(Queue).where(Queue.org_id == branch_id).order_by(Queue.created_at.desc()))
            queues = queues_res.scalars().all()
            print(f"Found {len(queues)} queues.")
            
            for q in queues:
                print(f"Processing queue {q.name}")
                wait_res = await db.execute(select(func.count(Token.id)).where(Token.queue_id == q.id, func.date(Token.created_at) == today, Token.status == TokenStatus.waiting))
                serv_res = await db.execute(select(func.count(Token.id)).where(Token.queue_id == q.id, func.date(Token.created_at) == today, Token.status == TokenStatus.serving))
                comp_res = await db.execute(select(func.count(Token.id)).where(Token.queue_id == q.id, func.date(Token.created_at) == today, Token.status == TokenStatus.done))
                
                avg_wait = await db.execute(
                    select(func.avg(func.extract('epoch', Token.served_at) - func.extract('epoch', Token.created_at)))
                    .where(Token.queue_id == q.id, func.date(Token.created_at) == today, Token.served_at.isnot(None))
                )
                print(f"wait={wait_res.scalar()}, serv={serv_res.scalar()}, comp={comp_res.scalar()}, avg_wait={avg_wait.scalar()}")
                
    except Exception as e:
        print("EXCEPTION:", repr(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
