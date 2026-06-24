import json
import uuid
import os
from datetime import datetime, date
import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine
from app.models.user import User

def row_to_dict(row):
    d = {}
    for column in row.__table__.columns:
        val = getattr(row, column.name)
        if isinstance(val, uuid.UUID):
            d[column.name] = str(val)
        elif isinstance(val, (datetime, date)):
            d[column.name] = val.isoformat()
        else:
            d[column.name] = val
    return d

async def main():
    backup_file = "/app/backups/ameba-20260625_013322.q4backup"
    
    with open(backup_file, "r") as f:
        data = json.load(f)
        
    db_url = "postgresql+asyncpg://appuser:apppassword@postgres:5432/queuedb"
    engine = create_async_engine(db_url)
    
    missing_user_id = "047eb438-7496-46eb-9480-a4b144d135a6"
    
    async with engine.connect() as conn:
        res = await conn.execute(select(User).where(User.id == uuid.UUID(missing_user_id)))
        user = res.scalar_one_or_none()
        
        if user:
            # check if user already in data["users"]
            if not any(u["id"] == missing_user_id for u in data["users"]):
                data["users"].append(row_to_dict(user))
                print("Appended missing user to backup.")
                
                with open(backup_file, "w") as f:
                    json.dump(data, f)
                print("Backup successfully patched.")
            else:
                print("User already in backup.")
        else:
            print("User not found in DB.")

if __name__ == "__main__":
    asyncio.run(main())
