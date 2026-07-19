import asyncio
from sqlalchemy.orm import Session
from app.db.session import async_session
from app.api.v1.endpoints.organization_admin_operations import get_branch_dashboard
import uuid

async def test():
    print("Testing dashboard")

asyncio.run(test())
