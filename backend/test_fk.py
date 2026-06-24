import asyncio
import uuid
import sys
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    db_url = "postgresql+asyncpg://appuser:apppassword@127.0.0.1:5432/queuedb"
    engine = create_async_engine(db_url)
    
    async with engine.begin() as conn:
        try:
            # check user
            res = await conn.execute(text("SELECT id, parent_organization_id FROM users WHERE id = '047eb438-7496-46eb-9480-a4b144d135a6'"))
            row = res.fetchone()
            print(f"User exists: {row}")
            
            # simulate what happens in restore
            parent_org_id = uuid.UUID('8590ec94-7608-43fa-85de-b7bb9494de70')
            
            print("Deleting users...")
            await conn.execute(text("DELETE FROM users WHERE parent_organization_id = :po"), {"po": parent_org_id})
            
            print("Checking user again...")
            res = await conn.execute(text("SELECT id FROM users WHERE id = '047eb438-7496-46eb-9480-a4b144d135a6'"))
            row = res.fetchone()
            print(f"User exists after delete: {row}")
            
            # insert a fake token
            print("Inserting token...")
            org_id = uuid.UUID('f4609934-12df-4b06-ab4d-c0f3ecb3ccb0')
            queue_id = uuid.UUID('6c9a7321-6adb-4f43-a0fa-fff1b0d89890')
            session_id = uuid.UUID('fffc1be4-cebe-4ca1-8173-0498305c4883') # fake or real
            
            # we need a real session_id and org_id and queue_id?
            # actually we can just rollback
            
        except Exception as e:
            print(f"Error: {e}")
        
        await conn.rollback()
        
if __name__ == "__main__":
    asyncio.run(main())
