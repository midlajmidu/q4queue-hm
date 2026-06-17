import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, and_
from app.models.user import User
from app.models.organization import Organization
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    import uuid
    org_id = uuid.UUID("27a4a168-8ac5-4f4d-9868-e38a835577db")
    
    async with async_session() as db:
        try:
            admin_user = await db.scalar(
                select(User).where(and_(User.org_id == org_id, User.role == "admin"))
            )
            print(f"Admin user: {admin_user}")
        except Exception as e:
            print(f"Error querying admin_user: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
