import asyncio
from app.db.session import SessionLocal
from app.services import session_service
import uuid

async def test():
    async with SessionLocal() as db:
        res = await session_service.list_sessions(db, org_id=uuid.UUID("2608b745-23b4-492c-9aa7-90f95864a083"))
        print(res)

asyncio.run(test())
