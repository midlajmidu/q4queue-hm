import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://appuser:apppassword@localhost:5432/queuedb"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        # Get a user_id
        res = await conn.execute(text("SELECT id FROM users LIMIT 1;"))
        row = res.first()
        if not row:
            print("No users found to assign.")
            return
        user_id = row[0]
        
        # Update tokens that are done or serving but have no served_by_id
        await conn.execute(text("""
            UPDATE tokens
            SET served_by_id = :uid,
                completed_by_id = CASE WHEN status = 'done' THEN :uid ELSE completed_by_id END
            WHERE status IN ('done', 'serving') AND served_by_id IS NULL;
        """), {"uid": user_id})
        
        await conn.commit()
        print(f"Patched tokens with user_id: {user_id}")

asyncio.run(main())
