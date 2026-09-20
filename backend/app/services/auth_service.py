"""
app/services/auth_service.py
Authentication business logic.

Security rules enforced here:
  - Generic error on bad credentials (no email/org leak)
  - No password logged anywhere
  - Deactivated orgs/users are rejected before token generation
"""
import logging

from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_password
from app.models.organization import Organization
from app.models.user import User

logger = logging.getLogger(__name__)

# Generic message — prevent enumeration attacks
_INVALID_CREDENTIALS = "Invalid credentials"
TRIAL_EXPIRED_MESSAGE = "Your free trial has ended. Contact our sales team to continue using Q4Queue. Your data is safe."


async def _reject_expired_trial(db: AsyncSession, parent_organization_id) -> None:
    if not parent_organization_id:
        return
    from app.models.subscription import Subscription
    from app.services.entitlement_service import effective_status
    subscription = await db.scalar(select(Subscription).where(
        Subscription.parent_organization_id == parent_organization_id
    ))
    if subscription and effective_status(subscription) == "expired":
        raise ValueError(TRIAL_EXPIRED_MESSAGE)


async def authenticate_user(
    db: AsyncSession,
    *,
    email: str,
    plain_password: str,
    org_slug: str | None,
    login_type: str = "staff",
) -> tuple[str, User]:
    """
    Validate credentials for a specific organization and return a JWT and User.

    Flow:
      1. Find org by slug
      2. Find user by (email, org_id) — tenant-scoped lookup
      3. Verify password (constant-time)
      4. Check is_active on both org and user
      5. Issue JWT

    Raises:
      ValueError with a generic message on any failure.
    """
    logger.info("Login attempt | org_slug=%s email=%s login_type=%s", org_slug, email, login_type)

    if login_type == "org_admin":
        # ── 1. Check ParentOrganization (Organization Admin Login) ──
        # Since it's a dedicated single-parent deployment, we don't need a slug
        user_result = await db.execute(
            select(User).where(
                User.email == email,
                User.role == "organization_admin"
            ).order_by(User.created_at.asc())
        )
        user: User | None = user_result.scalars().first()

        if user and verify_password(plain_password, user.password_hash):
            if not user.is_active:
                raise ValueError("Your account has been deactivated. Please contact your administrator.")
            
            from app.models.parent_organization import ParentOrganization
            parent_org_result = await db.execute(
                select(ParentOrganization).where(ParentOrganization.id == user.parent_organization_id)
            )
            parent_org: ParentOrganization | None = parent_org_result.scalar_one_or_none()
            
            if parent_org and parent_org.is_active:
                await _reject_expired_trial(db, parent_org.id)
                token = create_access_token(
                    user_id=str(user.id),
                    org_id=None,
                    parent_org_id=str(parent_org.id),
                    role=user.role,
                    email=user.email,
                    org_slug=parent_org.slug,
                    org_name=parent_org.name,
                    org_logo_url=None,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    is_first_login=user.is_first_login,
                )
                return token, user

        # If we reach here, org_admin login failed
        logger.warning("Org admin login failed | email=%s slug=%s", email, org_slug)
        raise ValueError(_INVALID_CREDENTIALS)

    # ── 2. Resolve organization (Branch Login) ────────────────────────────────────
    from sqlalchemy.orm import joinedload
    from sqlalchemy import func

    clean_email = email.strip().lower()

    if org_slug and org_slug.strip():
        # Scoped branch login with explicit slug
        org_result = await db.execute(
            select(Organization).options(joinedload(Organization.parent_organization)).where(Organization.slug == org_slug.strip())
        )
        org: Organization | None = org_result.scalar_one_or_none()

        if org is None:
            logger.warning("Login failed: org not found | slug=%s", org_slug)
            raise ValueError(_INVALID_CREDENTIALS)

        user_result = await db.execute(
            select(User).where(
                func.lower(User.email) == clean_email,
                User.org_id == org.id        # ← TENANT ISOLATION
            )
        )
        user: User | None = user_result.scalar_one_or_none()
    else:
        # Branch login without slug: lookup user by email directly
        user_result = await db.execute(
            select(User).where(func.lower(User.email) == clean_email)
        )
        candidates = user_result.scalars().all()

        if not candidates:
            logger.warning("Login failed: user not found | email=%s", clean_email)
            raise ValueError(_INVALID_CREDENTIALS)

        # In case multiple users share this email across different branches,
        # match the candidate with the correct password
        user = None
        for candidate in candidates:
            if verify_password(plain_password, candidate.password_hash):
                user = candidate
                break

        if user is None:
            logger.warning("Login failed: bad password | email=%s", clean_email)
            raise ValueError(_INVALID_CREDENTIALS)

        # Handle organization_admin logging in on standard login page
        if user.role == "organization_admin" and user.parent_organization_id and not user.org_id:
            from app.models.parent_organization import ParentOrganization
            parent_org_result = await db.execute(
                select(ParentOrganization).where(ParentOrganization.id == user.parent_organization_id)
            )
            parent_org = parent_org_result.scalar_one_or_none()
            if parent_org and parent_org.is_active:
                if not user.is_active:
                    raise ValueError("Your account has been deactivated. Please contact your administrator.")
                await _reject_expired_trial(db, parent_org.id)
                token = create_access_token(
                    user_id=str(user.id),
                    org_id=None,
                    parent_org_id=str(parent_org.id),
                    role=user.role,
                    email=user.email,
                    org_slug=parent_org.slug,
                    org_name=parent_org.name,
                    org_logo_url=None,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    is_first_login=user.is_first_login,
                )
                return token, user

        # Resolve organization from user's org_id
        if not user.org_id:
            logger.warning("Login failed: user has no org_id | user_id=%s", user.id)
            raise ValueError(_INVALID_CREDENTIALS)

        org_result = await db.execute(
            select(Organization).options(joinedload(Organization.parent_organization)).where(Organization.id == user.org_id)
        )
        org = org_result.scalar_one_or_none()

    if org is None:
        logger.warning("Login failed: org not found | email=%s", clean_email)
        raise ValueError(_INVALID_CREDENTIALS)

    if not org.is_active:
        logger.warning("Login failed: org inactive | org_id=%s", org.id)
        raise ValueError("Your organization has been deactivated. Please contact your administrator.")

    if org.parent_organization and not org.parent_organization.is_active:
        logger.warning("Login failed: parent org inactive | parent_org_id=%s", org.parent_organization_id)
        raise ValueError("Your organization has been deactivated. Please contact your administrator.")

    if user is None:
        logger.warning("Login failed: user not found | email=%s", clean_email)
        raise ValueError(_INVALID_CREDENTIALS)

    # ── 4. Verify password (constant-time bcrypt) ──────────────────
    if not verify_password(plain_password, user.password_hash):
        logger.warning("Login failed: bad password | email=%s", clean_email)
        raise ValueError(_INVALID_CREDENTIALS)

    # ── 5. Active check ────────────────────────────────────────────
    if not user.is_active:
        logger.warning("Login failed: user inactive | email=%s", clean_email)
        raise ValueError("Your account has been deactivated. Please contact your administrator.")

    # Credentials are valid, but an expired trial must not receive an operational JWT.
    await _reject_expired_trial(db, user.parent_organization_id)

    # ── 6. Issue JWT ───────────────────────────────────────────────
    token = create_access_token(
        user_id=str(user.id),
        org_id=str(org.id) if user.role != "organization_admin" else None,
        parent_org_id=str(user.parent_organization_id) if user.parent_organization_id else None,
        role=user.role,
        email=user.email,
        org_slug=org.slug,
        org_name=org.name,
        org_logo_url=None,
        first_name=user.first_name,
        last_name=user.last_name,
        is_first_login=user.is_first_login,
    )

    logger.info("Login successful | user_id=%s org=%s role=%s", user.id, org.slug, user.role)
    return token, user


async def authenticate_super_admin(
    db: AsyncSession,
    *,
    email: str,
    plain_password: str,
) -> tuple[str, User]:
    """
    Authenticate a global super admin (no organization attached).
    Super admins are identified by role == 'super_admin' and org_id IS NULL.
    Raises ValueError on any failure (generic message to prevent enumeration).
    """
    logger.info("Super-admin login attempt | email=%s", email)

    # Find user with role == super_admin and NO org_id
    user_result = await db.execute(
        select(User).where(
            User.email == email,
            User.role == "super_admin",
            User.org_id.is_(None),
        ).order_by(User.created_at.asc())
    )
    user: User | None = user_result.scalars().first()

    if user is None:
        logger.warning("Super-admin login: user not found | email=%s", email)
        raise ValueError(_INVALID_CREDENTIALS)

    if not verify_password(plain_password, user.password_hash):
        logger.warning("Super-admin login: bad password | email=%s", email)
        raise ValueError(_INVALID_CREDENTIALS)

    if not user.is_active:
        logger.warning("Super-admin login: user inactive | email=%s", email)
        raise ValueError("Your account has been deactivated. Please contact your administrator.")

    # Note: org_id is None for super_admin
    token = create_access_token(
        user_id=str(user.id),
        org_id=None,
        role=user.role,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_first_login=user.is_first_login,
    )
    logger.info("Super-admin login successful | user_id=%s", user.id)
    return token, user
