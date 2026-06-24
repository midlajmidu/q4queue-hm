import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine
from app.models.user import User
from app.core.security import hash_password

logger = logging.getLogger(__name__)

async def bootstrap_db() -> None:
    """
    Production-safe database bootstrap.
    Ensures a global super admin user exists.
    """
    async with AsyncSession(engine) as session:
        # Check if any super admin exists
        result = await session.execute(
            select(User).where(User.role == "super_admin", User.org_id.is_(None))
        )
        existing_super = result.scalar_one_or_none()

        if existing_super:
            return  # System already bootstrapped

        try:
            logger.info("Starting database bootstrap (Super Admin setup)...")

            # Create Global Super Admin User
            super_admin = User(
                email="superadmin@q4queue.internal",
                password_hash=hash_password("SuperAdmin@2026!!!"),
                role="super_admin",
                is_active=True,
                org_id=None
            )
            session.add(super_admin)
            
            await session.commit()
            logger.warning("✅ Bootstrap: Global super_admin created.")
            logger.warning("   Email:    superadmin@q4queue.internal")
            logger.warning("   Password: SuperAdmin@2026!!!")
            
        except Exception as e:
            await session.rollback()
            logger.error("Failed to bootstrap database: %s", e)
            raise
