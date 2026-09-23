"""
app/reset_user_password.py
Utility to list users or reset a user's password directly in the database.
Because ./backend/app is volume-mounted into /app/app, this script is immediately available inside Docker.

Usage (inside Docker):
  docker exec queue_backend python -m app.reset_user_password --list
  docker exec queue_backend python -m app.reset_user_password <email> <new_password>
"""
import asyncio
import os
import sys

from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal, connect_db
from app.models.user import User
from app.models.organization import Organization
from app.models.parent_organization import ParentOrganization
from app.core.security import hash_password


async def list_users() -> None:
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).order_by(User.created_at.desc()))
        users = res.scalars().all()
        print("\n── Registered Users in Database ──")
        for u in users:
            org_name = "None"
            if u.org_id:
                org = await db.scalar(select(Organization.name).where(Organization.id == u.org_id))
                org_name = f"Branch: {org}" if org else f"Branch ID: {u.org_id}"
            elif u.parent_organization_id:
                po = await db.scalar(select(ParentOrganization.name).where(ParentOrganization.id == u.parent_organization_id))
                org_name = f"Parent Org: {po}" if po else f"Parent Org ID: {u.parent_organization_id}"

            print(f"• Email: {u.email} | Role: {u.role} | Active: {u.is_active} | {org_name}")
        print("───────────────────────────────────\n")


async def reset_password(email: str, new_password: str) -> None:
    clean_email = email.strip().lower()
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(func.lower(User.email) == clean_email))
        users = res.scalars().all()

        if not users:
            print(f"❌ User not found with email: {email}")
            return

        for u in users:
            u.password_hash = hash_password(new_password)
            u.is_active = True
            print(f"✓ Password updated successfully for: {u.email} (Role: {u.role})")

        await db.commit()
        print(f"✅ User password has been reset to: {new_password}\n")


async def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("--help", "-h"):
        print(__doc__)
        return

    await connect_db()

    if sys.argv[1] == "--list":
        await list_users()
    elif len(sys.argv) >= 3:
        await reset_password(sys.argv[1], sys.argv[2])
    else:
        print("❌ Invalid arguments. Provide <email> and <new_password>, or use --list.")


if __name__ == "__main__":
    asyncio.run(main())
