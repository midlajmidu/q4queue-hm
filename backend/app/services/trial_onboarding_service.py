"""Atomic self-service free-trial provisioning."""
import re
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models.organization import Organization
from app.models.parent_organization import ParentOrganization
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.subscription import TrialSignupRequest


def _slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return value[:80] or "organization"


async def _available_slug(db: AsyncSession, model, value: str) -> str:
    base = _slugify(value)
    candidate = base
    suffix = 1
    while await db.scalar(select(model.id).where(model.slug == candidate)):
        suffix += 1
        candidate = f"{base[:72]}-{suffix}"
    return candidate


async def create_trial_account(db: AsyncSession, data: TrialSignupRequest) -> tuple[str, Organization, Subscription, User]:
    clean_email = data.email.strip().lower()
    if await db.scalar(select(User.id).where(func.lower(User.email) == clean_email).limit(1)):
        raise ValueError("An account with this email address already exists.")
    if await db.scalar(select(ParentOrganization.id).where(func.lower(ParentOrganization.contact_email) == clean_email).limit(1)):
        raise ValueError("An account with this email address already exists.")
    try:
        ZoneInfo(data.timezone)
    except Exception as exc:
        raise ValueError("Invalid timezone") from exc

    plan = await db.scalar(select(Plan).where(Plan.code == "free_trial_v1", Plan.is_active == True))
    if plan is None:
        raise RuntimeError("Free trial plan is not configured")

    parent_slug = await _available_slug(db, ParentOrganization, data.business_name)
    branch_slug = await _available_slug(db, Organization, data.business_name)
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=14)

    parent = ParentOrganization(
        name=data.business_name.strip(),
        slug=parent_slug,
        contact_email=clean_email,
        timezone=data.timezone,
        max_branches=1,
        is_active=True,
    )
    db.add(parent)
    await db.flush()

    branch = Organization(
        name=data.branch_name.strip(),
        slug=branch_slug,
        timezone=data.timezone,
        parent_organization_id=parent.id,
        max_sessions=14,
        max_queues_per_session=1,
        max_tokens=20,
        max_staff=1,
        is_active=True,
    )
    db.add(branch)
    await db.flush()

    user = User(
        id=uuid.uuid4(),
        email=clean_email,
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        password_hash=hash_password(data.password),
        role="admin",
        org_id=branch.id,
        parent_organization_id=parent.id,
        is_active=True,
        is_first_login=False,
    )
    subscription = Subscription(
        parent_organization_id=parent.id,
        plan_id=plan.id,
        status="trialing",
        source="self_service_trial",
        started_at=now,
        trial_started_at=now,
        trial_ends_at=trial_end,
        current_period_start=now,
        current_period_end=trial_end,
    )
    db.add_all([user, subscription])
    await db.commit()

    token = create_access_token(
        user_id=str(user.id),
        org_id=str(branch.id),
        parent_org_id=str(parent.id),
        role=user.role,
        email=user.email,
        org_slug=branch.slug,
        org_name=branch.name,
        first_name=user.first_name,
        last_name=user.last_name,
        is_first_login=False,
    )
    return token, branch, subscription, user
