import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine
from app.models.user import User
from app.core.security import hash_password
from app.core.config import get_settings

logger = logging.getLogger(__name__)

async def bootstrap_db() -> None:
    """
    Production-safe database bootstrap.
    Ensures a global super admin user exists.
    """
    async with AsyncSession(engine) as session:
        # Check if any super admin exists
        result = await session.execute(
            select(User).where(User.role == "super_admin", User.org_id.is_(None)).order_by(User.created_at.asc())
        )
        existing_super = result.scalars().first()

        if existing_super:
            return  # System already bootstrapped

        try:
            logger.info("Starting database bootstrap (Super Admin setup)...")

            settings = get_settings()
            admin_email = (settings.SUPER_ADMIN_EMAIL or "").strip().lower()
            admin_password = settings.SUPER_ADMIN_PASSWORD or ""
            if not admin_email or not admin_password:
                raise RuntimeError(
                    "No Super Admin exists. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD before starting Q4Queue."
                )
            if "@" not in admin_email or len(admin_password) < 14:
                raise RuntimeError(
                    "SUPER_ADMIN_EMAIL must be valid and SUPER_ADMIN_PASSWORD must contain at least 14 characters."
                )

            # Create Global Super Admin User
            super_admin = User(
                email=admin_email,
                password_hash=hash_password(admin_password),
                role="super_admin",
                is_active=True,
                org_id=None
            )
            session.add(super_admin)
            
            await session.commit()
            logger.warning("Bootstrap: Global Super Admin created for %s. The password was not logged.", admin_email)
            
        except Exception as e:
            await session.rollback()
            logger.error("Failed to bootstrap database: %s", e)
            raise
