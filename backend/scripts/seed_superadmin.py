"""
scripts/seed_superadmin.py
Create the global super admin user.

Usage (inside Docker):
  docker exec queue_backend python -m scripts.seed_superadmin

Safe to run multiple times — idempotent.
"""
import asyncio
import os
import sys

# Optional: keep path injection if you don't want to use `python -m scripts...`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from app.db.session import AsyncSessionLocal, connect_db
from app.models.user import User
from app.core.security import hash_password

# Use os.getenv but REMOVE the hard-coded insecure fallback password.
# In a real app, it's safer to pull this from your Pydantic settings:
# from app.core.config import get_settings; settings = get_settings()
SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "superadmin@q4queue.internal")
SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD")

async def seed_superadmin() -> None:
    # 1. SECURITY: Ensure password won't default to something easily guessable 
    if not SUPER_ADMIN_PASSWORD:
        print("❌ CRITICAL: SUPER_ADMIN_PASSWORD environment variable is not set!")
        sys.exit(1)

    try:
        await connect_db()
    except Exception as e:
        print(f"❌ Failed to connect to DB: {e}")
        sys.exit(1)

    try:
        async with AsyncSessionLocal() as db:
            print("\n── Global Super Admin Setup ──")

            # 2. BUG FIX: Remove unused sentinel logic and unused imports.
            res = await db.execute(
                select(User).where(
                    User.email == SUPER_ADMIN_EMAIL,
                    User.org_id.is_(None),
                )
            )
            user = res.scalar_one_or_none()
            
            if user is None:
                user = User(
                    org_id=None,
                    email=SUPER_ADMIN_EMAIL,
                    password_hash=hash_password(SUPER_ADMIN_PASSWORD),
                    role="super_admin",
                )
                db.add(user)
                print(f"  ✓ Created: {SUPER_ADMIN_EMAIL}")
            else:
                user.password_hash = hash_password(SUPER_ADMIN_PASSWORD)
                print(f"  ✓ Updated password for: {SUPER_ADMIN_EMAIL}")

            await db.commit()

        print("\n✅ Global Super admin ready.")
        print("  Login URL : http://localhost:3000/super-admin/login")
        print(f"  Email     : {SUPER_ADMIN_EMAIL}")
        # 3. SECURITY: Never print plain-text passwords into console/logs
        print("  Password  : ******** (Hidden for security)")

    except SQLAlchemyError as db_err:
        print(f"\n❌ Database operation failed: {db_err}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(seed_superadmin())
