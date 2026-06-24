import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def update_superadmin():
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("UPDATE users SET email = 'superadmin@q4queue.internal' WHERE email = 'superadmin@qrq.internal'")
        )
        await session.commit()
        print("Updated superadmin email successfully.")

if __name__ == "__main__":
    asyncio.run(update_superadmin())
