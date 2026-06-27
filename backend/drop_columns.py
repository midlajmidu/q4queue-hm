import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import get_settings

async def main():
    settings = get_settings()
    print(f"Connecting to {settings.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://')}")
    engine = create_async_engine(settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"))
    async with engine.begin() as conn:
        print("Dropping unused columns from organizations table...")
        await conn.execute(text("ALTER TABLE organizations DROP COLUMN IF EXISTS contact_email;"))
        await conn.execute(text("ALTER TABLE organizations DROP COLUMN IF EXISTS manager_name;"))
        await conn.execute(text("ALTER TABLE organizations DROP COLUMN IF EXISTS manager_phone;"))
        print("Successfully dropped contact_email, manager_name, manager_phone columns.")

if __name__ == "__main__":
    asyncio.run(main())
