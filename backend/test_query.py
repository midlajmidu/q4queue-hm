import asyncio
from sqlalchemy import select, func, and_
from app.db.session import AsyncSessionLocal
from app.models.token import Token
from app.models.organization import Organization
from datetime import datetime, timezone
import uuid

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Token).order_by(Token.created_at.desc()).limit(1))
        t = res.scalar()
        if t:
            print("Latest Token:", t.id, t.org_id, t.status, t.created_at, t.served_at, t.completed_at)
            
            # Fetch overview stats
            from app.services.analytics_service import get_overview_metrics
            try:
                metrics = await get_overview_metrics(db, org_id=t.org_id, start_date=t.created_at.strftime('%Y-%m-%d'), end_date=t.created_at.strftime('%Y-%m-%d'))
                print("Served count:", metrics['status_counts']['served'])
                print("Total count:", metrics['status_counts']['total'])
            except Exception as e:
                import traceback
                traceback.print_exc()

asyncio.run(main())
