"""Subscription, entitlement, and Super Admin customer-lifecycle APIs."""
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_event
from app.audit.models import AuditLog
from app.core.deps import get_current_active_user, get_current_super_admin
from app.core.security import hash_password, verify_password
from app.db.deps import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.branch_backup import BranchBackup
from app.models.export_job import ExportJob
from app.models.org_backup import OrgBackup
from app.models.parent_organization import ParentOrganization
from app.models.plan import Plan, PlanEntitlement
from app.models.queue import Queue
from app.models.subscription import SalesNotificationRecipient, SalesRequest, Subscription, SubscriptionEntitlementOverride
from app.schemas.subscription import (
    AdminCustomerCreate,
    AdminSalesRequestItem,
    AdminSalesRequestPage,
    AdminSubscriptionItem,
    AssignManagedBranches,
    AvailableBranchItem,
    ExpiredTrialSalesRequestCreate,
    ManagedBranchItem,
    ManagedAuditItem,
    ManagedCustomerDetail,
    ManagedCustomerListItem,
    ManagedCustomerUpdate,
    ManagedParentAdminCreate,
    PermanentCustomerDelete,
    ManagedCustomerPage,
    ManagedCustomerLimits,
    ManagedUserItem,
    PublicCustomPlanRequest,
    SalesRequestCreate,
    SalesRequestItem,
    SalesRequestReview,
    SalesRecipientCreate,
    SalesRecipientItem,
    SubscriptionAdminUpdate,
    SubscriptionLimitUpdate,
    SubscriptionSummary,
)
from app.services.entitlement_service import effective_status, subscription_summary
from app.services.trial_onboarding_service import _available_slug
from app.middleware.rate_limiter import api_rate_limit, login_rate_limit
from app.whatsapp.models import WhatsAppConfig, WhatsAppMessage, WhatsAppUsageStat

router = APIRouter()
logger = logging.getLogger(__name__)

ENTITLEMENT_DEFINITIONS = {
    "branches.max": ("parent", "none", "branches"),
    "queues.max": ("branch", "none", "queues_per_branch"),
    "staff_users.max": ("branch", "none", "staff_per_branch"),
    "sessions.created.max": ("subscription", "trial", "sessions"),
    "tokens.created.max_per_session": ("session", "session", "tokens_per_session"),
}


def _days_remaining(end: datetime | None) -> int | None:
    if end is None:
        return None
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    return int((max(0, (end - datetime.now(timezone.utc)).total_seconds()) + 86399) // 86400)


async def _customer_detail(db: AsyncSession, parent: ParentOrganization) -> ManagedCustomerDetail:
    branches = (await db.execute(
        select(Organization).where(Organization.parent_organization_id == parent.id).order_by(Organization.name)
    )).scalars().all()
    users = (await db.execute(
        select(User).where(User.parent_organization_id == parent.id).order_by(User.created_at)
    )).scalars().all()
    audit_events = (await db.execute(
        select(AuditLog).where(AuditLog.parent_organization_id == parent.id)
        .order_by(AuditLog.created_at.desc()).limit(25)
    )).scalars().all()
    branch_names = {branch.id: branch.name for branch in branches}
    branch_items: list[ManagedBranchItem] = []
    for branch in branches:
        queue_count = await db.scalar(select(func.count(Queue.id)).where(Queue.org_id == branch.id, Queue.is_deleted == False)) or 0
        staff_count = await db.scalar(select(func.count(User.id)).where(User.org_id == branch.id, User.role == "staff", User.is_active == True)) or 0
        branch_items.append(ManagedBranchItem(
            id=str(branch.id), name=branch.name, slug=branch.slug, is_active=branch.is_active,
            queues=queue_count, staff=staff_count,
        ))
    subscription = await db.scalar(select(Subscription).where(Subscription.parent_organization_id == parent.id))
    if branches:
        summary = SubscriptionSummary(**await subscription_summary(db, branches[0].id))
    else:
        summary = SubscriptionSummary(mode="legacy", status="legacy", is_operational=parent.is_active)
    return ManagedCustomerDetail(
        parent_organization_id=str(parent.id), name=parent.name, slug=parent.slug,
        contact_email=parent.contact_email, contact_phone=parent.contact_phone,
        timezone=parent.timezone, is_active=parent.is_active, created_at=parent.created_at,
        subscription=summary, source=subscription.source if subscription else "legacy",
        branches=branch_items,
        users=[ManagedUserItem(
            id=str(user.id), email=user.email, first_name=user.first_name, last_name=user.last_name,
            role=user.role, branch_name=branch_names.get(user.org_id), is_active=user.is_active,
        ) for user in users],
        audit_events=[ManagedAuditItem(
            id=str(event.id), event_type=event.event_type,
            created_at=event.created_at, details=event.details,
        ) for event in audit_events],
    )


async def _upsert_sales_request(
    db: AsyncSession,
    *,
    parent_id: uuid.UUID,
    user: User,
    body: SalesRequestCreate,
    source: str,
) -> SalesRequest:
    subscription = await db.scalar(select(Subscription).where(
        Subscription.parent_organization_id == parent_id
    ).with_for_update())
    if subscription and effective_status(subscription) == "active":
        raise HTTPException(status_code=409, detail="This customer account is already active.")
    pending = await db.scalar(select(SalesRequest).where(
        SalesRequest.parent_organization_id == parent_id,
        SalesRequest.status.in_(["pending", "contacted"]),
    ).order_by(SalesRequest.created_at.desc()).limit(1))
    contact_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email.split("@")[0]
    if pending:
        pending.contact_name = contact_name
        pending.contact_email = user.email
        pending.contact_phone = body.contact_phone
        pending.message = body.message
        pending.source = source
        await db.commit()
        await db.refresh(pending)
        return pending
    item = SalesRequest(
        parent_organization_id=parent_id, requested_by_user_id=user.id,
        contact_name=contact_name, contact_email=user.email,
        contact_phone=body.contact_phone, message=body.message,
        source=source, status="pending",
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


def _sales_request_item(item: SalesRequest) -> SalesRequestItem:
    return SalesRequestItem(
        id=str(item.id), contact_name=item.contact_name, contact_email=item.contact_email,
        contact_phone=item.contact_phone, message=item.message, source=item.source,
        status=item.status, review_note=item.review_note, created_at=item.created_at,
        reviewed_at=item.reviewed_at,
        notification_status=item.notification_status,
        notification_attempted_at=item.notification_attempted_at,
        notification_error=item.notification_error,
    )


async def _notify_sales_recipients(db: AsyncSession, item: SalesRequest, *, force: bool = False) -> None:
    now = datetime.now(timezone.utc)
    if not force and item.notification_attempted_at:
        attempted_at = item.notification_attempted_at
        if attempted_at.tzinfo is None:
            attempted_at = attempted_at.replace(tzinfo=timezone.utc)
        if attempted_at > now - timedelta(minutes=5):
            logger.info("Sales notification suppressed by cooldown | request_id=%s", item.id)
            return
    recipients = (await db.execute(select(SalesNotificationRecipient.email).where(
        SalesNotificationRecipient.is_active == True
    ))).scalars().all()
    item.notification_attempted_at = now
    if not recipients:
        item.notification_status = "not_configured"
        item.notification_error = "No active sales notification recipients are configured."
        await db.commit()
        logger.warning("Sales request stored but no notification recipients are configured | request_id=%s", item.id)
        return
    parent = await db.get(ParentOrganization, item.parent_organization_id) if item.parent_organization_id else None
    from app.services.email_service import send_sales_request_notification
    import asyncio
    results = await asyncio.gather(*[
        send_sales_request_notification(
            recipient, customer_name=parent.name if parent else item.contact_name,
            contact_name=item.contact_name, contact_email=item.contact_email,
            contact_phone=item.contact_phone, message=item.message, source=item.source,
        ) for recipient in recipients
    ], return_exceptions=True)
    failed = sum(result is not True for result in results)
    item.notification_status = "sent" if failed == 0 else ("failed" if failed == len(recipients) else "partial")
    item.notification_error = None if failed == 0 else f"Delivery failed for {failed} of {len(recipients)} recipient(s)."
    await db.commit()
    if failed:
        logger.error("Sales notification delivery failures | request_id=%s failed=%s total=%s", item.id, failed, len(recipients))


@router.post("/contact-sales", response_model=SalesRequestItem, status_code=status.HTTP_201_CREATED)
async def create_contact_sales_request(
    body: SalesRequestCreate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> SalesRequestItem:
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="Customer account context required")
    item = await _upsert_sales_request(
        db, parent_id=current_user.parent_organization_id, user=current_user,
        body=body, source="trial_banner",
    )
    await _notify_sales_recipients(db, item)
    await record_event(
        event_type="sales.requested", user_id=current_user.id, org_id=current_user.org_id,
        parent_org_id=current_user.parent_organization_id,
        ip_address=request.client.host if request.client else None,
        resource_type="sales_request", resource_id=str(item.id),
        details={"source": "trial_banner"},
    )
    return _sales_request_item(item)


@router.post(
    "/contact-sales/expired",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(login_rate_limit)],
)
async def create_expired_trial_sales_request(
    body: ExpiredTrialSalesRequestCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    clean_email = body.email.strip().lower()
    branch = None
    user = None
    if body.organization_slug and body.organization_slug.strip():
        branch = await db.scalar(select(Organization).where(Organization.slug == body.organization_slug.strip()))
        if branch:
            user = await db.scalar(select(User).where(
                User.org_id == branch.id, func.lower(User.email) == clean_email, User.is_active == True
            ))
    else:
        user = await db.scalar(select(User).where(func.lower(User.email) == clean_email, User.is_active == True))
        if user and user.org_id:
            branch = await db.scalar(select(Organization).where(Organization.id == user.org_id))
        elif user and user.parent_organization_id:
            branch = await db.scalar(select(Organization).where(Organization.parent_organization_id == user.parent_organization_id))
    if not branch or not user or not branch.parent_organization_id or not verify_password(body.password, user.password_hash):
        # Do not reveal whether an account exists through this public endpoint.
        return {"message": "If the account details match an expired trial, our sales team will receive your request."}
    subscription = await db.scalar(select(Subscription).where(
        Subscription.parent_organization_id == branch.parent_organization_id
    ))
    if not subscription or effective_status(subscription) != "expired":
        return {"message": "If the account details match an expired trial, our sales team will receive your request."}
    item = await _upsert_sales_request(
        db, parent_id=branch.parent_organization_id, user=user,
        body=SalesRequestCreate(contact_phone=body.contact_phone, message=body.message),
        source="expired_login",
    )
    await _notify_sales_recipients(db, item)
    await record_event(
        event_type="sales.requested", user_id=user.id, org_id=branch.id,
        parent_org_id=branch.parent_organization_id,
        ip_address=request.client.host if request.client else None,
        resource_type="sales_request", resource_id=str(item.id),
        details={"source": "expired_login"},
    )
    return {"message": "Your request has been sent. Our sales team will contact you shortly."}


@router.post(
    "/public/custom-plan-request",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(api_rate_limit)],
)
async def create_public_custom_plan_request(
    body: PublicCustomPlanRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    clean_email = body.contact_email.strip().lower()
    clean_name = body.contact_name.strip()
    
    services_text = ", ".join(body.selected_services) if body.selected_services else "None selected"
    notes_text = body.special_notes.strip() if body.special_notes else "None"
    
    formatted_message = (
        f"Company / Organization: {body.company_name.strip()}\n"
        f"Business Category: {body.business_category}\n"
        f"Branch Scale: {body.branch_count}\n"
        f"Queues to Manage: {body.queue_count}\n"
        f"Staff Operators: {body.staff_count}\n"
        f"Daily Visitor Volume: {body.visitor_volume}\n"
        f"Selected Add-ons: {services_text}\n"
        f"Special Integration Notes: {notes_text}"
    )
    
    item = SalesRequest(
        parent_organization_id=None,
        requested_by_user_id=None,
        contact_name=clean_name,
        contact_email=clean_email,
        contact_phone=body.contact_phone.strip(),
        message=formatted_message,
        source="custom_plan_page",
        status="pending",
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    await _notify_sales_recipients(db, item)
    return {"message": "Custom plan proposal request received successfully.", "id": str(item.id)}


@router.get("/admin/sales-requests", response_model=AdminSalesRequestPage)
async def list_sales_requests(
    request_status: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=120),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminSalesRequestPage:
    if request_status not in {None, "all", "pending", "contacted", "approved", "rejected"}:
        raise HTTPException(status_code=422, detail="Invalid sales request status filter")
    filters = []
    if request_status and request_status != "all":
        filters.append(SalesRequest.status == request_status)
    if search:
        term = f"%{search.strip()}%"
        filters.append(or_(
            ParentOrganization.name.ilike(term), SalesRequest.contact_name.ilike(term),
            SalesRequest.contact_email.ilike(term), SalesRequest.contact_phone.ilike(term),
        ))
    query = select(SalesRequest, ParentOrganization, Subscription).outerjoin(
        ParentOrganization, ParentOrganization.id == SalesRequest.parent_organization_id
    ).outerjoin(Subscription, Subscription.parent_organization_id == ParentOrganization.id)
    count_query = select(func.count(SalesRequest.id)).outerjoin(
        ParentOrganization, ParentOrganization.id == SalesRequest.parent_organization_id
    )
    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)
    total = await db.scalar(count_query) or 0
    rows = (await db.execute(query.order_by(SalesRequest.created_at.desc()).offset(skip).limit(limit))).all()
    count_rows = (await db.execute(select(SalesRequest.status, func.count(SalesRequest.id)).group_by(SalesRequest.status))).all()
    items = [AdminSalesRequestItem(
        **_sales_request_item(item).model_dump(),
        parent_organization_id=str(parent.id) if parent else None,
        organization_name=parent.name if parent else item.contact_name,
        organization_slug=parent.slug if parent else "public-lead",
        commercial_status="archived" if (parent and not parent.is_active) else (effective_status(subscription) if subscription else "lead"),
    ) for item, parent, subscription in rows]
    return AdminSalesRequestPage(items=items, total=total, status_counts={key: value for key, value in count_rows})


@router.get("/admin/sales-recipients", response_model=list[SalesRecipientItem])
async def list_sales_recipients(
    _current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> list[SalesRecipientItem]:
    items = (await db.execute(select(SalesNotificationRecipient).order_by(
        SalesNotificationRecipient.created_at
    ))).scalars().all()
    return [SalesRecipientItem(id=str(item.id), email=item.email, name=item.name, is_active=item.is_active, created_at=item.created_at) for item in items]


@router.post(
    "/admin/sales-recipients", response_model=SalesRecipientItem,
    status_code=status.HTTP_201_CREATED, dependencies=[Depends(api_rate_limit)],
)
async def add_sales_recipient(
    body: SalesRecipientCreate,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> SalesRecipientItem:
    clean_email = body.email.strip().lower()
    existing = await db.scalar(select(SalesNotificationRecipient).where(func.lower(SalesNotificationRecipient.email) == clean_email))
    if existing:
        raise HTTPException(status_code=409, detail="This email is already receiving sales notifications.")
    item = SalesNotificationRecipient(email=clean_email, name=body.name.strip() if body.name else None, created_by_user_id=current_user.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    await record_event(
        event_type="sales.recipient_added", user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        resource_type="sales_notification_recipient", resource_id=str(item.id),
        details={"email": item.email, "name": item.name},
    )
    return SalesRecipientItem(id=str(item.id), email=item.email, name=item.name, is_active=item.is_active, created_at=item.created_at)


@router.delete(
    "/admin/sales-recipients/{recipient_id}", status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(api_rate_limit)],
)
async def delete_sales_recipient(
    recipient_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    item = await db.get(SalesNotificationRecipient, recipient_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sales notification recipient not found")
    deleted_email = item.email
    deleted_name = item.name
    await db.delete(item)
    await db.commit()
    await record_event(
        event_type="sales.recipient_removed", user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        resource_type="sales_notification_recipient", resource_id=str(recipient_id),
        details={"email": deleted_email, "name": deleted_name},
    )


@router.post(
    "/admin/sales-requests/{sales_request_id}/retry-notification",
    response_model=SalesRequestItem,
    dependencies=[Depends(api_rate_limit)],
)
async def retry_sales_notification(
    sales_request_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> SalesRequestItem:
    item = await db.get(SalesRequest, sales_request_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sales request not found")
    await _notify_sales_recipients(db, item, force=True)
    await db.refresh(item)
    await record_event(
        event_type="sales.notification_retried", user_id=current_user.id,
        parent_org_id=item.parent_organization_id,
        ip_address=request.client.host if request.client else None,
        resource_type="sales_request", resource_id=str(item.id),
        details={"notification_status": item.notification_status},
    )
    return _sales_request_item(item)


async def _set_overrides(db: AsyncSession, subscription: Subscription, limits) -> None:
    for key, (scope, reset_period, field_name) in ENTITLEMENT_DEFINITIONS.items():
        value = getattr(limits, field_name)
        override = await db.scalar(select(SubscriptionEntitlementOverride).where(
            SubscriptionEntitlementOverride.subscription_id == subscription.id,
            SubscriptionEntitlementOverride.key == key,
        ))
        if override:
            override.limit_value = value
            override.scope = scope
            override.reset_period = reset_period
        else:
            db.add(SubscriptionEntitlementOverride(
                subscription_id=subscription.id, key=key, limit_value=value,
                scope=scope, reset_period=reset_period,
            ))


async def _branch_limit(db: AsyncSession, parent: ParentOrganization, subscription: Subscription | None) -> int | None:
    if subscription is None:
        return parent.max_branches
    override = await db.scalar(select(SubscriptionEntitlementOverride).where(
        SubscriptionEntitlementOverride.subscription_id == subscription.id,
        SubscriptionEntitlementOverride.key == "branches.max",
    ))
    if override:
        return override.limit_value
    return await db.scalar(select(PlanEntitlement.limit_value).where(
        PlanEntitlement.plan_id == subscription.plan_id,
        PlanEntitlement.key == "branches.max",
    ))


@router.get("/admin/customers", response_model=ManagedCustomerPage)
async def list_managed_customers(
    search: str | None = Query(default=None, max_length=120),
    commercial_status: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ManagedCustomerPage:
    query = select(ParentOrganization, Subscription, Plan).outerjoin(
        Subscription, Subscription.parent_organization_id == ParentOrganization.id
    ).outerjoin(Plan, Plan.id == Subscription.plan_id).order_by(ParentOrganization.created_at.desc())
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            ParentOrganization.name.ilike(term) |
            ParentOrganization.slug.ilike(term) |
            ParentOrganization.contact_email.ilike(term)
        )
    rows = (await db.execute(query)).all()
    items: list[ManagedCustomerListItem] = []
    status_counts: dict[str, int] = {}
    for parent, subscription, plan in rows:
        commercial = "archived" if not parent.is_active else (effective_status(subscription) if subscription else "legacy")
        status_counts[commercial] = status_counts.get(commercial, 0) + 1
        if commercial_status and commercial_status != "all" and commercial != commercial_status:
            continue
        branch_count = await db.scalar(select(func.count(Organization.id)).where(Organization.parent_organization_id == parent.id)) or 0
        user_count = await db.scalar(select(func.count(User.id)).where(User.parent_organization_id == parent.id)) or 0
        owner_email = await db.scalar(select(User.email).where(
            User.parent_organization_id == parent.id, User.role.in_(["admin", "organization_admin"])
        ).order_by(User.created_at).limit(1))
        items.append(ManagedCustomerListItem(
            parent_organization_id=str(parent.id), name=parent.name, slug=parent.slug,
            contact_email=parent.contact_email, is_active=parent.is_active,
            commercial_status=commercial, plan_code=plan.code if plan else None,
            plan_name=plan.name if plan else None, source=subscription.source if subscription else "legacy",
            branch_count=branch_count, user_count=user_count, owner_email=owner_email,
            trial_ends_at=subscription.trial_ends_at if subscription else None,
            days_remaining=_days_remaining(subscription.trial_ends_at) if subscription else None,
            created_at=parent.created_at,
        ))
    total = len(items)
    return ManagedCustomerPage(items=items[skip:skip + limit], total=total, status_counts=status_counts)


@router.post("/admin/customers", response_model=ManagedCustomerDetail, status_code=status.HTTP_201_CREATED)
async def create_managed_customer(
    body: AdminCustomerCreate,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ManagedCustomerDetail:
    clean_email = body.email.strip().lower()
    if await db.scalar(select(User.id).where(func.lower(User.email) == clean_email).limit(1)):
        raise HTTPException(status_code=409, detail="An account with this email address already exists")
    try:
        ZoneInfo(body.timezone)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid timezone") from exc
    plan_code = "free_trial_v1" if body.account_type == "trial" else "manual_custom_v1"
    plan = await db.scalar(select(Plan).where(Plan.code == plan_code, Plan.is_active == True))
    if not plan:
        raise HTTPException(status_code=503, detail="Selected account plan is not configured")
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=body.trial_days) if body.account_type == "trial" else None
    parent = ParentOrganization(
        name=body.business_name.strip(), slug=await _available_slug(db, ParentOrganization, body.business_name),
        contact_email=clean_email, contact_phone=body.phone, timezone=body.timezone,
        max_branches=body.limits.branches, is_active=True,
    )
    db.add(parent)
    await db.flush()
    branch = Organization(
        name=body.branch_name.strip(), slug=await _available_slug(db, Organization, body.business_name),
        timezone=body.timezone, parent_organization_id=parent.id,
        max_sessions=body.limits.sessions, max_queues_per_session=body.limits.queues_per_branch,
        max_tokens=body.limits.tokens_per_session, max_staff=body.limits.staff_per_branch, is_active=True,
    )
    db.add(branch)
    await db.flush()
    user = User(
        id=uuid.uuid4(), email=clean_email, first_name=body.first_name.strip(), last_name=body.last_name.strip(),
        password_hash=hash_password(body.password), role="admin", org_id=branch.id,
        parent_organization_id=parent.id, is_active=True, is_first_login=True,
    )
    subscription = Subscription(
        parent_organization_id=parent.id, plan_id=plan.id,
        status="trialing" if body.account_type == "trial" else "active", source="super_admin",
        started_at=now, trial_started_at=now if trial_end else None, trial_ends_at=trial_end,
        current_period_start=now, current_period_end=trial_end,
    )
    db.add_all([user, subscription])
    await db.flush()
    await _set_overrides(db, subscription, body.limits)
    await db.commit()
    await record_event(
        event_type="customer.created", user_id=current_user.id, parent_org_id=parent.id,
        ip_address=request.client.host if request.client else None, resource_type="parent_organization",
        resource_id=str(parent.id), details={"account_type": body.account_type, "plan": plan_code},
    )
    return await _customer_detail(db, parent)


@router.get("/admin/customers/{parent_id}", response_model=ManagedCustomerDetail)
async def get_managed_customer(
    parent_id: uuid.UUID,
    _current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ManagedCustomerDetail:
    parent = await db.get(ParentOrganization, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Customer account not found")
    return await _customer_detail(db, parent)


@router.patch("/admin/customers/{parent_id}", response_model=ManagedCustomerDetail)
async def update_managed_customer(
    parent_id: uuid.UUID,
    body: ManagedCustomerUpdate,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ManagedCustomerDetail:
    parent = await db.get(ParentOrganization, parent_id, with_for_update=True)
    if not parent:
        raise HTTPException(status_code=404, detail="Customer account not found")
    try:
        ZoneInfo(body.timezone)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid timezone") from exc
    clean_email = body.contact_email.strip().lower() if body.contact_email else None
    if clean_email:
        duplicate = await db.scalar(select(ParentOrganization.id).where(
            func.lower(ParentOrganization.contact_email) == clean_email,
            ParentOrganization.id != parent.id,
        ).limit(1))
        if duplicate:
            raise HTTPException(status_code=409, detail="Contact email is already used by another customer")
    before = {
        "name": parent.name, "contact_email": parent.contact_email,
        "contact_phone": parent.contact_phone, "timezone": parent.timezone,
    }
    parent.name = body.name.strip()
    parent.contact_email = clean_email
    parent.contact_phone = body.contact_phone.strip() if body.contact_phone else None
    parent.timezone = body.timezone
    await db.commit()
    await record_event(
        event_type="customer.updated", user_id=current_user.id, parent_org_id=parent.id,
        ip_address=request.client.host if request.client else None,
        resource_type="parent_organization", resource_id=str(parent.id),
        details={"reason": body.reason, "before": before, "after": {
            "name": parent.name, "contact_email": parent.contact_email,
            "contact_phone": parent.contact_phone, "timezone": parent.timezone,
        }},
    )
    return await _customer_detail(db, parent)


@router.get("/admin/customers/{parent_id}/available-branches", response_model=list[AvailableBranchItem])
async def list_available_branches(
    parent_id: uuid.UUID,
    _current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AvailableBranchItem]:
    if not await db.get(ParentOrganization, parent_id):
        raise HTTPException(status_code=404, detail="Customer account not found")
    branches = (await db.execute(
        select(Organization).where(Organization.parent_organization_id.is_(None)).order_by(Organization.name)
    )).scalars().all()
    result: list[AvailableBranchItem] = []
    for branch in branches:
        admin_email = await db.scalar(select(User.email).where(
            User.org_id == branch.id, User.role == "admin"
        ).order_by(User.created_at).limit(1))
        result.append(AvailableBranchItem(
            id=str(branch.id), name=branch.name, slug=branch.slug,
            is_active=branch.is_active, admin_email=admin_email,
        ))
    return result


@router.post("/admin/customers/{parent_id}/assign-branches", response_model=ManagedCustomerDetail)
async def assign_managed_branches(
    parent_id: uuid.UUID,
    body: AssignManagedBranches,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ManagedCustomerDetail:
    parent = await db.get(ParentOrganization, parent_id, with_for_update=True)
    if not parent:
        raise HTTPException(status_code=404, detail="Customer account not found")
    try:
        branch_ids = list(dict.fromkeys(uuid.UUID(value) for value in body.branch_ids))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="One or more branch IDs are invalid") from exc
    branches = (await db.execute(
        select(Organization).where(
            Organization.id.in_(branch_ids), Organization.parent_organization_id.is_(None)
        ).with_for_update()
    )).scalars().all()
    if len(branches) != len(branch_ids):
        raise HTTPException(status_code=409, detail="A selected branch is unavailable or already assigned")
    current_count = await db.scalar(select(func.count(Organization.id)).where(
        Organization.parent_organization_id == parent.id
    )) or 0
    subscription = await db.scalar(select(Subscription).where(
        Subscription.parent_organization_id == parent.id
    ))
    limit = await _branch_limit(db, parent, subscription)
    if limit is not None and current_count + len(branches) > limit:
        raise HTTPException(
            status_code=400,
            detail=f"Branch limit exceeded. This customer can have {limit} branch(es) and already has {current_count}.",
        )
    for branch in branches:
        branch.parent_organization_id = parent.id
        await db.execute(
            update(User)
            .where(User.org_id == branch.id)
            .values(parent_organization_id=parent.id)
        )
    await db.commit()
    await record_event(
        event_type="customer.branches_assigned", user_id=current_user.id, parent_org_id=parent.id,
        ip_address=request.client.host if request.client else None, resource_type="parent_organization",
        resource_id=str(parent.id), details={
            "branch_ids": [str(branch.id) for branch in branches],
            "branch_names": [branch.name for branch in branches],
        },
    )
    return await _customer_detail(db, parent)


@router.post("/admin/customers/{parent_id}/parent-admins", response_model=ManagedCustomerDetail, status_code=status.HTTP_201_CREATED)
async def create_managed_parent_admin(
    parent_id: uuid.UUID,
    body: ManagedParentAdminCreate,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ManagedCustomerDetail:
    parent = await db.get(ParentOrganization, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Customer account not found")
    if not parent.is_active:
        raise HTTPException(status_code=400, detail="Restore the customer account before adding a Parent Admin")
    clean_email = body.email.strip().lower()
    duplicate = await db.scalar(select(User.id).where(func.lower(User.email) == clean_email).limit(1))
    if duplicate:
        raise HTTPException(status_code=409, detail="A user with this email address already exists")
    parent_admin = User(
        id=uuid.uuid4(), email=clean_email, first_name=body.first_name.strip(),
        last_name=body.last_name.strip(), password_hash=hash_password(body.temporary_password),
        role="organization_admin", org_id=None, parent_organization_id=parent.id,
        is_active=True, is_first_login=True,
    )
    db.add(parent_admin)
    await db.commit()
    await record_event(
        event_type="customer.parent_admin_created", user_id=current_user.id,
        parent_org_id=parent.id, ip_address=request.client.host if request.client else None,
        resource_type="user", resource_id=str(parent_admin.id),
        details={"reason": body.reason, "email": clean_email, "role": "organization_admin"},
    )
    return await _customer_detail(db, parent)


@router.delete("/admin/customers/{parent_id}/permanent")
async def permanently_delete_managed_customer(
    parent_id: uuid.UUID,
    body: PermanentCustomerDelete,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Irreversibly purge one archived customer and all tenant-owned data."""
    parent = await db.get(ParentOrganization, parent_id, with_for_update=True)
    if not parent:
        raise HTTPException(status_code=404, detail="Customer account not found")
    if parent.is_active:
        raise HTTPException(status_code=409, detail="Archive the customer before permanent deletion")
    if body.confirmation_name != parent.name:
        raise HTTPException(status_code=400, detail="Customer name confirmation does not match")

    org_ids = (await db.execute(select(Organization.id).where(
        Organization.parent_organization_id == parent.id
    ))).scalars().all()
    user_filter = User.parent_organization_id == parent.id
    if org_ids:
        user_filter = or_(user_filter, User.org_id.in_(org_ids))
    user_ids = (await db.execute(select(User.id).where(user_filter))).scalars().all()
    org_backup_names = (await db.execute(select(OrgBackup.filename).where(
        OrgBackup.parent_org_id == parent.id
    ))).scalars().all()
    branch_backup_names = []
    if org_ids:
        branch_backup_names = (await db.execute(select(BranchBackup.filename).where(
            BranchBackup.org_id.in_(org_ids)
        ))).scalars().all()
    export_paths = (await db.execute(select(ExportJob.file_path).where(
        ExportJob.parent_org_id == parent.id, ExportJob.file_path.is_not(None)
    ))).scalars().all()
    logo_url = parent.logo_url

    if org_ids:
        await db.execute(delete(WhatsAppMessage).where(WhatsAppMessage.organization_id.in_(org_ids)))
        await db.execute(delete(WhatsAppUsageStat).where(WhatsAppUsageStat.org_id.in_(org_ids)))
        await db.execute(delete(WhatsAppConfig).where(WhatsAppConfig.org_id.in_(org_ids)))
        await db.execute(delete(AuditLog).where(or_(
            AuditLog.parent_organization_id == parent.id,
            AuditLog.org_id.in_(org_ids),
            AuditLog.user_id.in_(user_ids) if user_ids else False,
        )))
        await db.execute(delete(Organization).where(Organization.id.in_(org_ids)))
    else:
        await db.execute(delete(AuditLog).where(or_(
            AuditLog.parent_organization_id == parent.id,
            AuditLog.user_id.in_(user_ids) if user_ids else False,
        )))
    await db.execute(delete(ParentOrganization).where(ParentOrganization.id == parent.id))
    await db.commit()

    candidate_files: list[tuple[str, str]] = []
    candidate_files.extend(("/app/backups", name) for name in [*org_backup_names, *branch_backup_names])
    for path in export_paths:
        candidate_files.append(("/app/exports", path))
    if logo_url:
        candidate_files.append(("/app/uploads/logos", logo_url))
    removed_files = 0
    failed_files = 0
    for allowed_root, stored_path in candidate_files:
        try:
            root = os.path.realpath(allowed_root)
            raw_path = str(stored_path)
            if allowed_root == "/app/uploads/logos":
                raw_path = raw_path.lstrip("/")
                raw_path = raw_path.removeprefix("uploads/logos/")
            target = os.path.realpath(os.path.join(root, os.path.basename(raw_path)))
            if os.path.commonpath([root, target]) != root:
                raise ValueError("Unsafe customer file path")
            if os.path.isfile(target):
                os.unlink(target)
                removed_files += 1
        except Exception as exc:
            failed_files += 1
            logger.error("Customer purge file cleanup failed | customer=%s path=%s error=%s", parent_id, stored_path, exc)
    logger.warning(
        "Customer permanently deleted | parent_id=%s by=%s reason=%s files_removed=%s files_failed=%s",
        parent_id, current_user.id, body.reason, removed_files, failed_files,
    )
    return {
        "message": "Customer and tenant data permanently deleted",
        "parent_organization_id": str(parent_id),
        "files_removed": removed_files,
        "file_cleanup_failures": failed_files,
    }


@router.patch("/admin/customers/{parent_id}/subscription", response_model=ManagedCustomerDetail)
async def update_managed_subscription(
    parent_id: uuid.UUID,
    body: SubscriptionAdminUpdate,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ManagedCustomerDetail:
    parent = await db.get(ParentOrganization, parent_id)
    subscription = await db.scalar(select(Subscription).where(
        Subscription.parent_organization_id == parent_id
    ).with_for_update())
    if not parent:
        raise HTTPException(status_code=404, detail="Customer account not found")
    if not subscription:
        if body.action in {"archive", "restore"}:
            parent.is_active = body.action == "restore"
            await db.commit()
            await record_event(
                event_type=f"customer.{body.action}", user_id=current_user.id, parent_org_id=parent.id,
                ip_address=request.client.host if request.client else None,
                resource_type="parent_organization", resource_id=str(parent.id),
                details={"reason": body.reason, "legacy_account": True},
            )
            return await _customer_detail(db, parent)
        if body.action != "activate":
            raise HTTPException(status_code=400, detail="Move this legacy customer to managed access before changing its status")
        custom_plan = await db.scalar(select(Plan).where(Plan.code == "manual_custom_v1"))
        if not custom_plan:
            raise HTTPException(status_code=503, detail="Manual custom plan is not configured")
        first_branch = await db.scalar(select(Organization).where(
            Organization.parent_organization_id == parent.id
        ).order_by(Organization.created_at).limit(1))
        branch_count = await db.scalar(select(func.count(Organization.id)).where(
            Organization.parent_organization_id == parent.id
        )) or 0
        now = datetime.now(timezone.utc)
        subscription = Subscription(
            parent_organization_id=parent.id, plan_id=custom_plan.id, status="active",
            source="super_admin_migration", started_at=now, current_period_start=now,
        )
        db.add(subscription)
        await db.flush()
        await _set_overrides(db, subscription, ManagedCustomerLimits(
            branches=parent.max_branches or max(1, branch_count),
            queues_per_branch=first_branch.max_queues_per_session if first_branch else 20,
            staff_per_branch=first_branch.max_staff if first_branch else 5,
            sessions=first_branch.max_sessions if first_branch else 10,
            tokens_per_session=first_branch.max_tokens if first_branch else 5000,
        ))
        await db.commit()
        await record_event(
            event_type="subscription.legacy_adopted", user_id=current_user.id, parent_org_id=parent.id,
            ip_address=request.client.host if request.client else None, resource_type="subscription",
            resource_id=str(subscription.id), details={"reason": body.reason, "new_status": "active"},
        )
        return await _customer_detail(db, parent)
    previous_status = effective_status(subscription)
    now = datetime.now(timezone.utc)
    if body.action == "extend_trial":
        base = subscription.trial_ends_at or now
        if base.tzinfo is None:
            base = base.replace(tzinfo=timezone.utc)
        subscription.trial_ends_at = max(now, base) + timedelta(days=body.extension_days or 0)
        subscription.current_period_end = subscription.trial_ends_at
        subscription.status = "trialing"
    elif body.action == "activate":
        custom_plan = await db.scalar(select(Plan).where(Plan.code == "manual_custom_v1"))
        if not custom_plan:
            raise HTTPException(status_code=503, detail="Manual custom plan is not configured")
        existing_overrides = await db.scalar(select(func.count(SubscriptionEntitlementOverride.id)).where(
            SubscriptionEntitlementOverride.subscription_id == subscription.id
        )) or 0
        if not existing_overrides:
            defaults = (await db.execute(select(PlanEntitlement).where(
                PlanEntitlement.plan_id == subscription.plan_id
            ))).scalars().all()
            for item in defaults:
                db.add(SubscriptionEntitlementOverride(
                    subscription_id=subscription.id, key=item.key, limit_value=item.limit_value,
                    scope=item.scope, reset_period=item.reset_period,
                ))
        subscription.plan_id = custom_plan.id
        subscription.status = "active"
        subscription.current_period_start = now
        subscription.current_period_end = None
        parent.is_active = True
        await db.execute(update(Organization).where(Organization.parent_organization_id == parent.id).values(is_active=True))
        await db.execute(update(User).where(User.parent_organization_id == parent.id).values(is_active=True))
    elif body.action == "suspend":
        subscription.status = "suspended"
    elif body.action == "reactivate":
        subscription.status = "trialing" if subscription.trial_ends_at and subscription.trial_ends_at > now else "active"
        parent.is_active = True
        await db.execute(update(Organization).where(Organization.parent_organization_id == parent.id).values(is_active=True))
        await db.execute(update(User).where(User.parent_organization_id == parent.id).values(is_active=True))
    elif body.action == "cancel":
        subscription.status = "cancelled"
    elif body.action == "archive":
        subscription.status = "archived"
        parent.is_active = False
    elif body.action == "restore":
        subscription.status = "active"
        parent.is_active = True
        await db.execute(update(Organization).where(Organization.parent_organization_id == parent.id).values(is_active=True))
        await db.execute(update(User).where(User.parent_organization_id == parent.id).values(is_active=True))
    await db.commit()
    await record_event(
        event_type=f"subscription.{body.action}", user_id=current_user.id, parent_org_id=parent.id,
        ip_address=request.client.host if request.client else None, resource_type="subscription",
        resource_id=str(subscription.id), details={
            "reason": body.reason, "previous_status": previous_status,
            "new_status": effective_status(subscription), "extension_days": body.extension_days,
        },
    )
    return await _customer_detail(db, parent)


@router.patch(
    "/admin/customers/{parent_id}/sales-requests/{sales_request_id}",
    response_model=ManagedCustomerDetail,
)
async def review_sales_request(
    parent_id: uuid.UUID,
    sales_request_id: uuid.UUID,
    body: SalesRequestReview,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ManagedCustomerDetail:
    parent = await db.get(ParentOrganization, parent_id)
    item = await db.scalar(select(SalesRequest).where(
        SalesRequest.id == sales_request_id,
        SalesRequest.parent_organization_id == parent_id,
    ).with_for_update())
    if not parent or not item:
        raise HTTPException(status_code=404, detail="Sales request not found")
    allowed_actions = {
        "pending": {"approve", "contacted", "reject"},
        "contacted": {"approve", "reject"},
    }
    if body.action not in allowed_actions.get(item.status, set()):
        raise HTTPException(status_code=409, detail="This sales request is already in a terminal state")

    now = datetime.now(timezone.utc)
    if body.action == "approve":
        subscription = await db.scalar(select(Subscription).where(
            Subscription.parent_organization_id == parent_id
        ).with_for_update())
        if not subscription:
            raise HTTPException(status_code=400, detail="This customer does not have a managed subscription")
        custom_plan = await db.scalar(select(Plan).where(Plan.code == "manual_custom_v1", Plan.is_active == True))
        if not custom_plan:
            raise HTTPException(status_code=503, detail="Manual custom plan is not configured")
        existing_overrides = await db.scalar(select(func.count(SubscriptionEntitlementOverride.id)).where(
            SubscriptionEntitlementOverride.subscription_id == subscription.id
        )) or 0
        if not existing_overrides:
            defaults = (await db.execute(select(PlanEntitlement).where(
                PlanEntitlement.plan_id == subscription.plan_id
            ))).scalars().all()
            for entitlement in defaults:
                db.add(SubscriptionEntitlementOverride(
                    subscription_id=subscription.id, key=entitlement.key,
                    limit_value=entitlement.limit_value, scope=entitlement.scope,
                    reset_period=entitlement.reset_period,
                ))
        subscription.plan_id = custom_plan.id
        subscription.status = "active"
        subscription.current_period_start = now
        subscription.current_period_end = None
        parent.is_active = True
        item.status = "approved"
    elif body.action == "contacted":
        item.status = "contacted"
    else:
        item.status = "rejected"
    item.reviewed_by_user_id = current_user.id
    item.review_note = body.note.strip()
    item.reviewed_at = now
    await db.commit()
    await record_event(
        event_type=f"sales.{body.action}", user_id=current_user.id, parent_org_id=parent.id,
        ip_address=request.client.host if request.client else None,
        resource_type="sales_request", resource_id=str(item.id),
        details={"note": body.note, "customer_activated": body.action == "approve"},
    )
    return await _customer_detail(db, parent)


@router.put("/admin/customers/{parent_id}/limits", response_model=ManagedCustomerDetail)
async def update_managed_limits(
    parent_id: uuid.UUID,
    body: SubscriptionLimitUpdate,
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ManagedCustomerDetail:
    parent = await db.get(ParentOrganization, parent_id)
    subscription = await db.scalar(select(Subscription).where(
        Subscription.parent_organization_id == parent_id
    ).with_for_update())
    if not parent or not subscription:
        raise HTTPException(status_code=404, detail="Managed subscription not found")
    parent.max_branches = body.limits.branches
    branches = (await db.execute(select(Organization).where(
        Organization.parent_organization_id == parent.id
    ))).scalars().all()
    if len(branches) > body.limits.branches:
        raise HTTPException(status_code=400, detail="Branch limit cannot be below current branch count")
    for branch in branches:
        branch.max_sessions = body.limits.sessions
        branch.max_queues_per_session = body.limits.queues_per_branch
        branch.max_tokens = body.limits.tokens_per_session
        branch.max_staff = body.limits.staff_per_branch
    await _set_overrides(db, subscription, body.limits)
    await db.commit()
    await record_event(
        event_type="subscription.limits_updated", user_id=current_user.id, parent_org_id=parent.id,
        ip_address=request.client.host if request.client else None, resource_type="subscription",
        resource_id=str(subscription.id), details={"reason": body.reason, "limits": body.limits.model_dump()},
    )
    return await _customer_detail(db, parent)


@router.get("/admin", response_model=list[AdminSubscriptionItem])
async def list_subscriptions_for_super_admin(
    _current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminSubscriptionItem]:
    rows = (await db.execute(
        select(Subscription, ParentOrganization, Plan, func.count(Organization.id))
        .join(ParentOrganization, ParentOrganization.id == Subscription.parent_organization_id)
        .join(Plan, Plan.id == Subscription.plan_id)
        .outerjoin(Organization, Organization.parent_organization_id == ParentOrganization.id)
        .group_by(Subscription.id, ParentOrganization.id, Plan.id)
        .order_by(Subscription.created_at.desc())
    )).all()
    now = datetime.now(timezone.utc)
    result = []
    for subscription, parent, plan, branch_count in rows:
        days_remaining = None
        if subscription.trial_ends_at:
            end = subscription.trial_ends_at
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            days_remaining = int((max(0, (end - now).total_seconds()) + 86399) // 86400)
        result.append(AdminSubscriptionItem(
            id=str(subscription.id),
            parent_organization_id=str(parent.id),
            organization_name=parent.name,
            organization_slug=parent.slug,
            plan_code=plan.code,
            plan_name=plan.name,
            status=effective_status(subscription),
            source=subscription.source,
            branch_count=branch_count,
            trial_started_at=subscription.trial_started_at,
            trial_ends_at=subscription.trial_ends_at,
            days_remaining=days_remaining,
        ))
    return result


@router.get("/current", response_model=SubscriptionSummary)
async def get_current_subscription(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionSummary:
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="Branch context required")
    return SubscriptionSummary(**await subscription_summary(db, current_user.org_id))
