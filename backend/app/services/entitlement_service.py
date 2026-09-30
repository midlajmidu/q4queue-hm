"""Subscription resolution and authoritative trial-limit enforcement."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.plan import Plan, PlanEntitlement
from app.models.queue import Queue
from app.models.session import Session
from app.models.subscription import EntitlementUsage, Subscription, SubscriptionEntitlementOverride
from app.models.token import Token
from app.models.user import User


class EntitlementError(ValueError):
    def __init__(
        self,
        message: str,
        *,
        code: str,
        key: str | None = None,
        limit: int | None = None,
        used: int | None = None,
        is_trial: bool | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.key = key
        self.limit = limit
        self.used = used
        self.is_trial = is_trial


RESOURCE_DISPLAY_NAMES = {
    "sessions.created.max": {
        "noun": "daily sessions",
        "context": "for this queue",
        "trial_msg": "You have reached your Free Trial limit of {limit} daily session(s) for this queue.",
        "plan_msg": "You have reached your plan limit of {limit} daily session(s) for this queue.",
    },
    "queues.max": {
        "noun": "queues",
        "context": "for this branch",
        "trial_msg": "You have reached your Free Trial limit of {limit} queue(s) for this branch.",
        "plan_msg": "You have reached your plan limit of {limit} queue(s) for this branch.",
    },
    "staff_users.max": {
        "noun": "staff members",
        "context": "for this branch",
        "trial_msg": "You have reached your Free Trial limit of {limit} staff member(s) for this branch.",
        "plan_msg": "You have reached your plan limit of {limit} staff member(s) for this branch.",
    },
    "branches.max": {
        "noun": "branches",
        "context": "for your organization",
        "trial_msg": "You have reached your Free Trial limit of {limit} branch(es).",
        "plan_msg": "You have reached your plan limit of {limit} branch(es).",
    },
    "tokens.created.max_per_session": {
        "noun": "tokens",
        "context": "for this session",
        "trial_msg": "Token capacity of {limit} reached for this session. Admissions are closed.",
        "plan_msg": "Token capacity of {limit} reached for this session. Admissions are closed.",
    },
}


def format_limit_error_message(key: str, limit: int | None, is_trial: bool) -> str:
    limit_str = str(limit) if limit is not None else "allowance"
    res = RESOURCE_DISPLAY_NAMES.get(key)
    if res:
        base_msg = res["trial_msg" if is_trial else "plan_msg"].format(limit=limit_str)
        if key == "tokens.created.max_per_session":
            return base_msg
        cta = (
            "Upgrade your plan or contact sales to increase your allowance."
            if is_trial
            else "Contact support or your account administrator to increase your allowance."
        )
        return f"{base_msg} {cta}"

    clean_name = key.replace(".", " ").replace("_", " ").strip()
    tier = "Free Trial" if is_trial else "plan"
    cta = (
        "Upgrade your plan or contact sales to increase your allowance."
        if is_trial
        else "Contact support or your account administrator to increase your allowance."
    )
    return f"You have reached your {tier} limit of {limit_str} for {clean_name}. {cta}"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def get_subscription_for_parent(
    db: AsyncSession, parent_organization_id: uuid.UUID, *, lock: bool = False
) -> Subscription | None:
    query = select(Subscription).where(Subscription.parent_organization_id == parent_organization_id)
    if lock:
        query = query.with_for_update()
    return await db.scalar(query)


async def get_subscription_for_org(
    db: AsyncSession, org_id: uuid.UUID, *, lock: bool = False
) -> Subscription | None:
    parent_id = await db.scalar(select(Organization.parent_organization_id).where(Organization.id == org_id))
    if not parent_id:
        return None
    return await get_subscription_for_parent(db, parent_id, lock=lock)


def effective_status(subscription: Subscription) -> str:
    if subscription.status == "trialing" and subscription.trial_ends_at:
        ends_at = subscription.trial_ends_at
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        if ends_at <= _utcnow():
            return "expired"
    return subscription.status


async def assert_operational(db: AsyncSession, org_id: uuid.UUID, *, lock: bool = False) -> Subscription | None:
    subscription = await get_subscription_for_org(db, org_id, lock=lock)
    if subscription is None:
        return None  # Legacy organizations retain their existing behaviour.
    status = effective_status(subscription)
    if status not in {"trialing", "active"}:
        if status == "suspended":
            msg = "This account has been suspended by an administrator. Please contact support at contact@q4queue.com to restore access. Your data is safe."
        elif status == "cancelled":
            msg = "This subscription has been cancelled. Please contact support at contact@q4queue.com to reactivate your account."
        elif status == "archived":
            msg = "This account has been archived. Please contact support at contact@q4queue.com to restore access."
        else:
            msg = "Your free trial has expired. Your data is safe; contact sales to continue operating."
        raise EntitlementError(
            msg,
            code="subscription_not_operational",
        )
    return subscription


async def assert_calling_allowed(db: AsyncSession, org_id: uuid.UUID) -> None:
    subscription = await assert_operational(db, org_id)
    if subscription is None:
        return
    status = effective_status(subscription)
    if status == "trialing":
        raise EntitlementError(
            "Voice Calling service is disabled during the Free Trial. Upgrade to a commercial plan to enable Voice Calling.",
            code="feature_disabled_in_trial",
            key="voice_calling",
        )


async def assert_whatsapp_allowed(db: AsyncSession, org_id: uuid.UUID) -> None:
    # Subscriptions in trialing or active status are operational and permitted to use WhatsApp
    await assert_operational(db, org_id)



async def _entitlement(
    db: AsyncSession, subscription: Subscription, key: str
) -> PlanEntitlement | SubscriptionEntitlementOverride | None:
    override = await db.scalar(
        select(SubscriptionEntitlementOverride).where(
            SubscriptionEntitlementOverride.subscription_id == subscription.id,
            SubscriptionEntitlementOverride.key == key,
        )
    )
    if override is not None:
        return override
    return await db.scalar(
        select(PlanEntitlement).where(
            PlanEntitlement.plan_id == subscription.plan_id,
            PlanEntitlement.key == key,
        )
    )


async def assert_resource_capacity(db: AsyncSession, org_id: uuid.UUID, key: str, used: int) -> None:
    subscription = await assert_operational(db, org_id, lock=True)
    if subscription is None:
        return
    entitlement = await _entitlement(db, subscription, key)
    if entitlement and entitlement.limit_value is not None and used >= entitlement.limit_value:
        is_trial = subscription.status == "trialing"
        msg = format_limit_error_message(key, entitlement.limit_value, is_trial)
        raise EntitlementError(
            msg,
            code="entitlement_limit_reached",
            key=key,
            limit=entitlement.limit_value,
            used=used,
            is_trial=is_trial,
        )


async def is_session_token_limit_reached(
    db: AsyncSession, org_id: uuid.UUID, session_id: uuid.UUID
) -> tuple[bool, int, int | None]:
    """Evaluates whether the session has reached its tokens.created.max_per_session quota."""
    subscription = await get_subscription_for_org(db, org_id)
    if subscription is None:
        return False, 0, None

    entitlement = await _entitlement(db, subscription, "tokens.created.max_per_session")
    if entitlement is None or entitlement.limit_value is None:
        return False, 0, None

    period_start = subscription.trial_started_at or subscription.started_at
    usage = await db.scalar(
        select(EntitlementUsage).where(
            EntitlementUsage.subscription_id == subscription.id,
            EntitlementUsage.entitlement_key == "tokens.created.max_per_session",
            EntitlementUsage.scope_type == "session",
            EntitlementUsage.scope_id == session_id,
            EntitlementUsage.period_start == period_start,
        )
    )
    used = usage.used if usage else 0
    actual_count = await db.scalar(
        select(func.count(Token.id)).where(Token.session_id == session_id)
    ) or 0
    used = max(used, actual_count)

    is_reached = bool(used >= entitlement.limit_value)
    return is_reached, used, entitlement.limit_value


async def consume(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    key: str,
    scope_type: str,
    scope_id: uuid.UUID,
    quantity: int = 1,
) -> None:
    subscription = await assert_operational(db, org_id, lock=False)
    if subscription is None:
        return
    if scope_type == "subscription":
        scope_id = subscription.id
    elif scope_type == "parent":
        scope_id = subscription.parent_organization_id

    entitlement = await _entitlement(db, subscription, key)
    if entitlement is None or entitlement.limit_value is None:
        return

    period_start = subscription.trial_started_at or subscription.started_at
    usage = await db.scalar(
        select(EntitlementUsage).where(
            EntitlementUsage.subscription_id == subscription.id,
            EntitlementUsage.entitlement_key == key,
            EntitlementUsage.scope_type == scope_type,
            EntitlementUsage.scope_id == scope_id,
            EntitlementUsage.period_start == period_start,
        ).with_for_update()
    )
    used = usage.used if usage else 0
    if used + quantity > entitlement.limit_value:
        is_trial = subscription.status == "trialing"
        msg = format_limit_error_message(key, entitlement.limit_value, is_trial)
        raise EntitlementError(
            msg,
            code="entitlement_limit_reached",
            key=key,
            limit=entitlement.limit_value,
            used=used,
            is_trial=is_trial,
        )
    if usage:
        usage.used += quantity
    else:
        db.add(EntitlementUsage(
            subscription_id=subscription.id,
            entitlement_key=key,
            scope_type=scope_type,
            scope_id=scope_id,
            period_start=period_start,
            period_end=subscription.trial_ends_at,
            used=quantity,
        ))
    await db.flush()


async def subscription_summary(db: AsyncSession, org_id: uuid.UUID) -> dict:
    subscription = await get_subscription_for_org(db, org_id)
    if subscription is None:
        return {
            "mode": "legacy",
            "status": "legacy",
            "is_operational": True,
            "calling_allowed": True,
            "whatsapp_allowed": True,
            "entitlements": {},
        }

    plan = await db.scalar(select(Plan).where(Plan.id == subscription.plan_id))
    plan_entitlements = (await db.execute(
        select(PlanEntitlement).where(PlanEntitlement.plan_id == subscription.plan_id)
    )).scalars().all()
    overrides = (await db.execute(
        select(SubscriptionEntitlementOverride).where(
            SubscriptionEntitlementOverride.subscription_id == subscription.id
        )
    )).scalars().all()
    entitlements_by_key = {item.key: item for item in plan_entitlements}
    entitlements_by_key.update({item.key: item for item in overrides})
    status = effective_status(subscription)
    now = _utcnow()
    days_remaining = None
    if subscription.trial_ends_at:
        end = subscription.trial_ends_at
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        seconds = max(0, (end - now).total_seconds())
        days_remaining = int((seconds + 86399) // 86400)

    parent_id = subscription.parent_organization_id
    usage_values = {
        "branches.max": await db.scalar(select(func.count(Organization.id)).where(Organization.parent_organization_id == parent_id)) or 0,
        "queues.max": await db.scalar(select(func.count(Queue.id)).where(Queue.org_id == org_id, Queue.is_deleted == False)) or 0,
        "staff_users.max": await db.scalar(select(func.count(User.id)).where(User.org_id == org_id, User.role == "staff", User.is_active == True)) or 0,
    }
    cumulative = (await db.execute(select(EntitlementUsage).where(EntitlementUsage.subscription_id == subscription.id))).scalars().all()
    for row in cumulative:
        if row.entitlement_key == "sessions.created.max" and row.scope_type == "subscription":
            usage_values[row.entitlement_key] = usage_values.get(row.entitlement_key, 0) + row.used

    result = {}
    for entitlement in entitlements_by_key.values():
        used = usage_values.get(entitlement.key)
        remaining = None if used is None or entitlement.limit_value is None else max(0, entitlement.limit_value - used)
        result[entitlement.key] = {
            "key": entitlement.key,
            "limit": entitlement.limit_value,
            "used": used,
            "remaining": remaining,
            "scope": entitlement.scope,
        }
    return {
        "mode": "subscription",
        "status": status,
        "plan_code": plan.code if plan else None,
        "plan_name": plan.name if plan else None,
        "trial_started_at": subscription.trial_started_at,
        "trial_ends_at": subscription.trial_ends_at,
        "days_remaining": days_remaining,
        "is_operational": status in {"trialing", "active"},
        "calling_allowed": status != "trialing",
        "whatsapp_allowed": status in {"trialing", "active"},
        "entitlements": result,
    }

