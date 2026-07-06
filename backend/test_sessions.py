import asyncio
import sys
import uuid
from datetime import datetime, timezone
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def main():
    try:
        from app.db.session import AsyncSessionLocal
        from app.models.session import Session
        from app.models.token import Token, TokenStatus
        from sqlalchemy import select, func
        branch_id = uuid.UUID("3a8417f0-db23-40ef-96d9-6f07938768c4")
        
        async with AsyncSessionLocal() as db:
            today = datetime.now(timezone.utc).date()
            sessions_res = await db.execute(select(Session).where(Session.org_id == branch_id, Session.session_date == today).order_by(Session.created_at.desc()))
            sessions = sessions_res.scalars().all()
            print(f"Found {len(sessions)} sessions.")
            
            for s in sessions:
                print(f"Processing session {s.id}")
                comp_res = await db.execute(select(func.count(Token.id)).where(Token.session_id == s.id, Token.status == TokenStatus.done))
                
                avg_svc = await db.execute(
                    select(func.avg(func.extract('epoch', Token.completed_at) - func.extract('epoch', Token.served_at)))
                    .where(Token.session_id == s.id, Token.completed_at.isnot(None), Token.served_at.isnot(None))
                )
                print(f"comp={comp_res.scalar()}, avg_svc={avg_svc.scalar()}")
                print(f"created_at: {s.created_at}")
                
    except Exception as e:
        print("EXCEPTION:", repr(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
