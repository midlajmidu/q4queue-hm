"""
app/api/v1/endpoints/super_admin.py
Super Admin API endpoints.

Routes (prefix: /super-admin):
  POST   /auth/login              — Super admin login (email + password, no org slug)
  GET    /stats                   — Dashboard stats (total / active / inactive orgs)
  GET    /organizations           — List orgs with search, sort, pagination
  POST   /organizations           — Create org + provision admin user atomically
  GET    /organizations/{org_id}  — Org detail with user counts
  PUT    /organizations/{org_id}  — Update org name / slug / is_active
  DELETE /organizations/{org_id}  — Soft-delete org (sets is_active = False)

Access: All data-mutating routes require role == "super_admin" (enforced by dependency).
"""
import logging
import time
import secrets
import string
import uuid as _uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import asc, desc, func, or_, select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_super_admin
from app.db.deps import get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.queue import Queue
from app.models.token import Token, TokenStatus
from app.models.system_announcement import SystemAnnouncement
from app.audit.models import AuditLog
from app.core.security import hash_password, create_access_token
from app.schemas.auth import TokenResponse
from app.services.auth_service import authenticate_super_admin
from app.audit.service import record_event

logger = logging.getLogger(__name__)
router = APIRouter()

# Track app start time for uptime calculation
START_TIME = time.time()


# ── Schemas ────────────────────────────────────────────────────────────────────

class SuperAdminLoginRequest(BaseModel):
    email: str
    password: str

class SuccessResponse(BaseModel):
    message: str

def _validate_slug(v: str) -> str:
    import re
    v = v.strip().lower()
    if not re.match(r"^[a-z0-9][a-z0-9\-]{1,98}[a-z0-9]$", v):
        raise ValueError("Slug must be 3-100 lowercase alphanumeric chars or hyphens, cannot start/end with hyphen")
    return v


class OrgCreateRequest(BaseModel):
    org_name: str
    org_slug: str
    admin_email: str
    admin_password: str
    max_sessions: int | None = Field(None, ge=1)
    max_queues_per_session: int | None = Field(None, ge=1)
    max_staff: int | None = Field(None, ge=1)

    @field_validator("org_slug")
    @classmethod
    def slug_safe(cls, v: str) -> str:
        return _validate_slug(v)


class OrgUpdateRequest(BaseModel):
    org_name: str = Field(..., min_length=2)
    org_slug: str = Field(..., min_length=2)
    is_active: bool
    admin_email: str | None = None
    max_sessions: int | None = Field(None, ge=1)
    max_queues_per_session: int | None = Field(None, ge=1)
    max_staff: int | None = Field(None, ge=1)

    @field_validator("org_slug")
    @classmethod
    def slug_safe(cls, v: str) -> str:
        return _validate_slug(v)


class OrgDetail(BaseModel):
    id: str
    name: str
    slug: str
    is_active: bool
    created_at: str
    max_sessions: int
    max_queues_per_session: int
    max_staff: int
    admin_email: str | None = None
    admin_initial_password: str | None = None
    admin_password_changed_at: str | None = None
    logo_url: str | None = None

    model_config = {"from_attributes": True}


class OrgDetailExtended(OrgDetail):
    total_users: int
    total_admins: int


class OrgUsageResponse(BaseModel):
    queue_entries_used: int
    queue_entries_max: int
    customers_served: int
    active_queues: int
    active_staff: int
    messages_sent: int


class PaginatedOrgsResponse(BaseModel):
    items: list[OrgDetail]
    total: int
    limit: int
    offset: int


class GlobalUserDetail(BaseModel):
    id: str
    first_name: str | None
    last_name: str | None
    email: str
    role: str
    is_active: bool
    org_id: str | None
    org_name: str | None
    org_slug: str | None
    created_at: datetime

class PaginatedGlobalUsers(BaseModel):
    items: list[GlobalUserDetail]
    total: int
    limit: int
    offset: int

class ResetPasswordResponse(BaseModel):
    message: str
    temporary_password: str
class OrgAnalyticsDetail(OrgDetail):
    queue_entries: int
    customers_served: int
    messages_sent: int
    average_wait_time: str
    peak_usage_time: str

class OrgAnalyticsResponse(BaseModel):
    items: list[OrgAnalyticsDetail]

class ErrorLogItem(BaseModel):
    id: str
    timestamp: str
    severity: str
    component: str
    message: str

class SystemMonitoringResponse(BaseModel):
    api_health: str
    database_health: str
    redis_health: str
    whatsapp_health: str
    uptime_seconds: int
    recent_errors: list[ErrorLogItem]

class GlobalSettings(BaseModel):
    default_queue_limit: int
    default_session_limit: int
    default_whatsapp_limit: int
    platform_name: str
    primary_color: str
    support_email: str
    support_phone: str

# In-memory storage for MVP
IN_MEMORY_SETTINGS = {
    "default_queue_limit": 10,
    "default_session_limit": 100,
    "default_whatsapp_limit": 500,
    "platform_name": "Queue Management",
    "primary_color": "#4f46e5",
    "support_email": "support@example.com",
    "support_phone": "+1 (555) 123-4567",
}


class OrgCreateResponse(BaseModel):
    organization: OrgDetail
    admin_email: str
    message: str


class AuditLogDetail(BaseModel):
    id: str
    event_type: str
    org_id: str | None = None
    org_name: str | None = None
    user_id: str | None = None
    user_email: str | None = None
    ip_address: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    details: dict | None = None
    created_at: str


class PaginatedAuditLogs(BaseModel):
    items: list[AuditLogDetail]
    total: int
    limit: int
    offset: int

class SystemAnnouncementCreate(BaseModel):
    message: str = Field(..., min_length=1)
    type: str = Field(..., pattern="^(info|warning|critical)$")
    is_active: bool = True

class SystemAnnouncementUpdate(BaseModel):
    message: str | None = None
    type: str | None = None
    is_active: bool | None = None

class SystemAnnouncementDetail(BaseModel):
    id: str
    message: str
    type: str
    is_active: bool
    created_at: str
    updated_at: str

class PaginatedSystemAnnouncements(BaseModel):
    items: list[SystemAnnouncementDetail]
    total: int
    limit: int
    offset: int


class OrgStats(BaseModel):
    total: int
    active: int
    inactive: int


class PlatformAnalytics(BaseModel):
    total_active_queues: int
    total_waiting_customers: int
    total_serving_customers: int
    total_queue_entries_today: int
    total_queue_entries_month: int
    total_customers_served: int
    total_staff_users: int
    organization_growth: list[dict]  # e.g., [{"month": "2024-06", "count": 12}]

class GlobalQueueDetail(BaseModel):
    id: str
    organization: str
    queue_name: str
    current_position: int
    customers_waiting: int
    average_wait_time: str
    staff_handling: int
    status: str

class GlobalQueueResponse(BaseModel):
    items: list[GlobalQueueDetail]
    total: int = 0
    page: int = 1
    pages: int = 1

class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)


# ── Internal helpers ────────────────────────────────────────────────────────────

def _org_to_detail(o: Organization, admin_user: User | None = None) -> OrgDetail:
    return OrgDetail(
        id=str(o.id),
        name=o.name,
        slug=o.slug,
        is_active=o.is_active,
        created_at=o.created_at.isoformat(),
        max_sessions=o.max_sessions,
        max_queues_per_session=o.max_queues_per_session,
        max_staff=o.max_staff,
        admin_email=admin_user.email if admin_user else None,
        admin_password_changed_at=admin_user.password_changed_at.isoformat() if admin_user and admin_user.password_changed_at else None,
        logo_url=o.logo_url,
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post(
    "/auth/login",
    response_model=TokenResponse,
    summary="Super Admin Login",
)
async def super_admin_login(
    body: SuperAdminLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate a super admin by email + password only (no org slug required)."""
    client_ip = request.client.host if request.client else "unknown"
    try:
        token = await authenticate_super_admin(db, email=body.email, plain_password=body.password)
    except ValueError as exc:
        logger.warning("Super-admin login failed | ip=%s", client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    return TokenResponse(access_token=token)


@router.get(
    "/stats",
    response_model=OrgStats,
    summary="Organization Statistics",
)
async def get_stats(
    is_test: Optional[bool] = Query(default=False, description="Filter test orgs"),
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgStats:
    """Return dashboard-level stats: total / active / inactive org counts."""
    test_pattern = or_(
        Organization.name.ilike("Msg Org%"),
        Organization.name.ilike("Q Org%"),
        Organization.name.ilike("%test%"),
        Organization.slug.ilike("%test%"),
    )
    
    base_q = select(func.count(Organization.id))
    if is_test is True:
        base_q = base_q.where(test_pattern)
    elif is_test is False:
        base_q = base_q.where(~test_pattern)
        
    total = await db.scalar(base_q) or 0
    active = await db.scalar(
        base_q.where(Organization.is_active == True)  # noqa: E712
    ) or 0
    return OrgStats(total=total, active=active, inactive=total - active)


@router.get(
    "/stats",
    response_model=PlatformAnalytics,
    summary="Platform Analytics & Health",
)
async def get_platform_analytics(
    is_test: Optional[bool] = Query(default=False, description="Filter test orgs"),
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> PlatformAnalytics:
    """Return platform-wide utilization and organization growth metrics."""
    test_pattern = or_(
        Organization.name.ilike("Msg Org%"),
        Organization.name.ilike("Q Org%"),
        Organization.name.ilike("%test%"),
        Organization.slug.ilike("%test%"),
    )
    
    # We need to filter Queues, Tokens, and Users by whether their org is a test org.
    # To keep it simple, we can join with Organization.
    
    def filter_org(stmt, org_col):
        if is_test is True:
            return stmt.join(Organization, org_col == Organization.id).where(test_pattern)
        elif is_test is False:
            return stmt.join(Organization, org_col == Organization.id).where(~test_pattern)
        return stmt

    # Active Queues
    total_active_queues = await db.scalar(
        filter_org(select(func.count(Queue.id)).where(Queue.is_active == True), Queue.org_id)
    ) or 0

    # Waiting / Serving Customers
    total_waiting_customers = await db.scalar(
        filter_org(select(func.count(Token.id)).where(Token.status == "waiting"), Token.org_id)
    ) or 0
    total_serving_customers = await db.scalar(
        filter_org(select(func.count(Token.id)).where(Token.status == "serving"), Token.org_id)
    ) or 0

    # Today's and This Month's Entries
    total_queue_entries_today = await db.scalar(
        filter_org(select(func.count(Token.id)).where(Token.created_at >= func.date_trunc('day', func.timezone('UTC', func.now()))), Token.org_id)
    ) or 0
    total_queue_entries_month = await db.scalar(
        filter_org(select(func.count(Token.id)).where(Token.created_at >= func.date_trunc('month', func.timezone('UTC', func.now()))), Token.org_id)
    ) or 0

    # Total Served
    total_customers_served = await db.scalar(
        filter_org(select(func.count(Token.id)).where(Token.status == "done"), Token.org_id)
    ) or 0

    # Total Staff Users (all users that belong to an org)
    total_staff_users = await db.scalar(
        filter_org(select(func.count(User.id)).where(User.org_id.isnot(None)), User.org_id)
    ) or 0

    # Organization Growth (by month)
    growth_stmt = select(
        func.to_char(Organization.created_at, "YYYY-MM").label("month"),
        func.count(Organization.id).label("count")
    )
    if is_test is True:
        growth_stmt = growth_stmt.where(test_pattern)
    elif is_test is False:
        growth_stmt = growth_stmt.where(~test_pattern)
        
    growth_stmt = growth_stmt.group_by("month").order_by("month")
    
    growth_result = await db.execute(growth_stmt)
    organization_growth = [{"month": row.month, "count": row.count} for row in growth_result.all()]

    return PlatformAnalytics(
        total_active_queues=total_active_queues,
        total_waiting_customers=total_waiting_customers,
        total_serving_customers=total_serving_customers,
        total_queue_entries_today=total_queue_entries_today,
        total_queue_entries_month=total_queue_entries_month,
        total_customers_served=total_customers_served,
        total_staff_users=total_staff_users,
        organization_growth=organization_growth
    )

@router.get(
    "/stats/organizations",
    response_model=OrgAnalyticsResponse,
    summary="Get Organization-Wise Analytics",
)
async def get_org_analytics(
    timeframe: Literal["daily", "weekly", "monthly"] = Query("daily"),
    is_test: Optional[bool] = Query(default=False, description="Filter test organizations"),
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgAnalyticsResponse:
    from datetime import datetime, timedelta, timezone
    
    now = datetime.now(timezone.utc)
    if timeframe == "daily":
        start_date = now - timedelta(days=1)
    elif timeframe == "weekly":
        start_date = now - timedelta(days=7)
    else:
        start_date = now - timedelta(days=30)
        
    test_pattern = or_(
        Organization.name.ilike("Msg Org%"),
        Organization.name.ilike("Q Org%"),
        Organization.name.ilike("%test%"),
        Organization.slug.ilike("%test%"),
    )
    
    org_stmt = (
        select(Organization, User)
        .outerjoin(User, and_(User.org_id == Organization.id, User.role == "admin"))
    )
    if is_test is True:
        org_stmt = org_stmt.where(test_pattern)
    elif is_test is False:
        org_stmt = org_stmt.where(~test_pattern)

    orgs_result = await db.execute(org_stmt)
    org_rows = orgs_result.all()

    token_stmt = (
        select(
            Token.org_id,
            func.count(Token.id).label("entries"),
            func.count(Token.id).filter(Token.status == "done").label("served"),
            func.avg(func.extract('epoch', Token.served_at - Token.created_at)).filter(Token.status == "done").label("avg_wait")
        )
        .where(Token.created_at >= start_date)
        .group_by(Token.org_id)
    )
    token_res = await db.execute(token_stmt)
    token_metrics = {row.org_id: row for row in token_res.all()}

    peak_stmt = (
        select(
            Token.org_id,
            func.extract('hour', func.timezone('UTC', Token.created_at)).label('hr'),
            func.count(Token.id).label('cnt')
        )
        .where(Token.created_at >= start_date)
        .group_by(Token.org_id, 'hr')
    )
    peak_res = await db.execute(peak_stmt)
    
    peak_hours = {}
    for row in peak_res.all():
        org_id = row.org_id
        if org_id not in peak_hours or row.cnt > peak_hours[org_id]['cnt']:
            peak_hours[org_id] = {'hr': int(row.hr), 'cnt': row.cnt}

    try:
        from app.models.message import Message
        msg_stmt = (
            select(Message.org_id, func.count(Message.id).label("sent"))
            .where(Message.created_at >= start_date)
            .group_by(Message.org_id)
        )
        msg_res = await db.execute(msg_stmt)
        msg_metrics = {row.org_id: row.sent for row in msg_res.all()}
    except ImportError:
        msg_metrics = {}

    items = []
    for org, admin_user in org_rows:
        tm = token_metrics.get(org.id)
        entries = tm.entries if tm else 0
        served = tm.served if tm else 0
        avg_wait = float(tm.avg_wait) if tm and tm.avg_wait else 0.0
        
        wait_str = "N/A"
        if avg_wait > 0:
            mins = int(avg_wait // 60)
            wait_str = f"{mins} min{'s' if mins != 1 else ''}"
            
        peak_str = "N/A"
        if org.id in peak_hours:
            hr = peak_hours[org.id]['hr']
            ampm = "AM" if hr < 12 else "PM"
            hr_12 = hr if hr <= 12 else hr - 12
            if hr_12 == 0: hr_12 = 12
            
            next_hr = hr + 1
            next_ampm = "AM" if next_hr < 12 or next_hr == 24 else "PM"
            next_hr_12 = next_hr if next_hr <= 12 else next_hr - 12
            if next_hr_12 == 0: next_hr_12 = 12
            if next_hr_12 == 24: next_hr_12 = 12
            
            peak_str = f"{hr_12}:00 {ampm} - {next_hr_12}:00 {next_ampm}"
            
        msgs = msg_metrics.get(org.id, 0)
        
        base_org_detail = _org_to_detail(org, admin_user)
        
        items.append(OrgAnalyticsDetail(
            **base_org_detail.model_dump(),
            queue_entries=entries,
            customers_served=served,
            messages_sent=msgs,
            average_wait_time=wait_str,
            peak_usage_time=peak_str
        ))
        
    items.sort(key=lambda x: x.queue_entries, reverse=True)

    return OrgAnalyticsResponse(items=items)


@router.get(
    "/system-monitoring",
    response_model=SystemMonitoringResponse,
    summary="Get System Monitoring Status",
)
async def get_system_monitoring(
    _super_admin: User = Depends(get_current_super_admin),
) -> SystemMonitoringResponse:
    from sqlalchemy import text
    from app.db.session import AsyncSessionLocal
    from app.redis.client import get_redis
    import uuid
    from datetime import datetime, timedelta

    db_status = "error"
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        pass

    redis_status = "error"
    try:
        redis = get_redis()
        pong = await redis.ping()
        redis_status = "connected" if pong else "error"
    except Exception:
        pass

    uptime = int(time.time() - START_TIME)
    
    # Optional: ensure it doesn't return negative or 0 due to some quirk
    if uptime < 1:
        uptime = 1

    now = datetime.utcnow()
    simulated_errors = [
        ErrorLogItem(
            id=str(uuid.uuid4()),
            timestamp=(now - timedelta(minutes=15)).isoformat() + "Z",
            severity="error",
            component="WhatsApp API",
            message="Connection timeout while refreshing webhook."
        ),
        ErrorLogItem(
            id=str(uuid.uuid4()),
            timestamp=(now - timedelta(hours=2)).isoformat() + "Z",
            severity="warning",
            component="Worker",
            message="High memory usage detected (85%)."
        ),
        ErrorLogItem(
            id=str(uuid.uuid4()),
            timestamp=(now - timedelta(hours=14)).isoformat() + "Z",
            severity="error",
            component="Database",
            message="Deadlock detected in transaction."
        )
    ]

    return SystemMonitoringResponse(
        api_health="ok",
        database_health=db_status,
        redis_health=redis_status,
        whatsapp_health="connected",
        uptime_seconds=uptime,
        recent_errors=simulated_errors
    )


@router.get(
    "/audit-logs",
    response_model=PaginatedAuditLogs,
    summary="List Audit Logs (paginated)",
)
async def get_audit_logs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> PaginatedAuditLogs:
    """Return paginated global audit logs with human-readable info."""
    # Count query
    total = await db.scalar(select(func.count(AuditLog.id))) or 0

    # Data query joining User and Organization
    stmt = (
        select(
            AuditLog,
            Organization.name.label("org_name"),
            User.email.label("user_email")
        )
        .outerjoin(Organization, AuditLog.org_id == Organization.id)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for log, org_name, user_email in rows:
        items.append(AuditLogDetail(
            id=str(log.id),
            event_type=log.event_type,
            org_id=str(log.org_id) if log.org_id else None,
            org_name=org_name,
            user_id=str(log.user_id) if log.user_id else None,
            user_email=user_email,
            ip_address=log.ip_address,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            details=log.details,
            created_at=log.created_at.isoformat()
        ))

    return PaginatedAuditLogs(
        items=items,
        total=total,
        limit=limit,
        offset=offset
    )


@router.get(
    "/settings",
    response_model=GlobalSettings,
    summary="Get Global Settings",
)
async def get_global_settings(
    _super_admin: User = Depends(get_current_super_admin),
) -> GlobalSettings:
    """Return the current global settings."""
    return GlobalSettings(**IN_MEMORY_SETTINGS)


@router.put(
    "/settings",
    response_model=GlobalSettings,
    summary="Update Global Settings",
)
async def update_global_settings(
    settings: GlobalSettings,
    _super_admin: User = Depends(get_current_super_admin),
) -> GlobalSettings:
    """Update global settings in-memory."""
    global IN_MEMORY_SETTINGS
    IN_MEMORY_SETTINGS.update(settings.dict())
    return GlobalSettings(**IN_MEMORY_SETTINGS)


@router.get(
    "/organizations",
    response_model=PaginatedOrgsResponse,
    summary="List All Organizations (paginated)",
)
async def list_organizations(
    search: str = Query(default="", description="Case-insensitive search by name or slug"),
    is_test: Optional[bool] = Query(default=False, description="If True, only show test orgs. If False, hide test orgs."),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort_by: Literal["name", "created_at", "is_active"] = Query(default="created_at"),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> PaginatedOrgsResponse:
    """List organizations with optional search, sort, and pagination."""
    sort_col_map = {
        "name": Organization.name,
        "created_at": Organization.created_at,
        "is_active": Organization.is_active,
    }
    sort_col = sort_col_map[sort_by]
    order_fn = asc if sort_order == "asc" else desc

    base_filter = None
    if search.strip():
        term = f"%{search.strip()}%"
        base_filter = or_(
            Organization.name.ilike(term),
            Organization.slug.ilike(term),
        )

    test_pattern = or_(
        Organization.name.ilike("Msg Org%"),
        Organization.name.ilike("Q Org%"),
        Organization.name.ilike("%test%"),
        Organization.slug.ilike("%test%"),
    )
    
    if is_test is True:
        if base_filter is None:
            base_filter = test_pattern
        else:
            base_filter = and_(base_filter, test_pattern)
    elif is_test is False:
        if base_filter is None:
            base_filter = ~test_pattern
        else:
            base_filter = and_(base_filter, ~test_pattern)

    count_q = select(func.count(Organization.id))
    data_q = select(Organization)

    if base_filter is not None:
        count_q = count_q.where(base_filter)
        data_q = data_q.where(base_filter)

    total = await db.scalar(count_q) or 0
    data_q = data_q.order_by(order_fn(sort_col)).limit(limit).offset(offset)
    result = await db.execute(data_q)
    orgs = result.scalars().all()

    org_ids = [o.id for o in orgs]
    admins = {}
    if org_ids:
        # Fetch first admin for each retrieved organization
        admin_result = await db.execute(select(User).where(User.org_id.in_(org_ids), User.role == "admin"))
        for u in admin_result.scalars().all():
            if u.org_id not in admins:
                admins[u.org_id] = u

    return PaginatedOrgsResponse(
        items=[_org_to_detail(o, admins.get(o.id)) for o in orgs],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/organizations",
    response_model=OrgCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Organization with Admin",
)
async def create_organization(
    body: OrgCreateRequest,
    request: Request,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgCreateResponse:
    """Atomically create a new organization and provision an admin user for it."""
    existing = await db.execute(select(Organization).where(Organization.slug == body.org_slug))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Organization slug '{body.org_slug}' is already taken.",
        )

    org = Organization(
        name=body.org_name, 
        slug=body.org_slug,
        max_sessions=body.max_sessions if body.max_sessions is not None else IN_MEMORY_SETTINGS.get("default_session_limit", 10),
        max_queues_per_session=body.max_queues_per_session if body.max_queues_per_session is not None else IN_MEMORY_SETTINGS.get("default_queue_limit", 20),
        max_staff=body.max_staff if body.max_staff is not None else 5,
    )
    db.add(org)
    await db.flush()

    admin = User(
        org_id=org.id,
        email=body.admin_email,
        password_hash=hash_password(body.admin_password),
        role="admin",
    )
    db.add(admin)
    await db.commit()
    await db.refresh(org)

    await record_event(
        event_type="organization_created",
        org_id=org.id,
        user_id=_super_admin.id,
        ip_address=request.client.host if request.client else None,
        resource_type="organization",
        resource_id=str(org.id),
        details={"slug": body.org_slug, "admin_email": body.admin_email},
    )

    logger.info("Super admin created org | org=%s admin=%s", org.slug, body.admin_email)
    return OrgCreateResponse(
        organization=_org_to_detail(org, admin),
        admin_email=body.admin_email,
        message=f"Organization '{org.name}' created with admin '{body.admin_email}'.",
    )


@router.get(
    "/organizations/{org_id}",
    response_model=OrgDetailExtended,
    summary="Organization Detail with User Counts",
)
async def get_organization_detail(
    org_id: str,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgDetailExtended:
    """Return full org detail including total user and admin counts."""
    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org_id.")

    result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org: Organization | None = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    total_users = await db.scalar(
        select(func.count(User.id)).where(User.org_id == org_uuid)
    ) or 0
    total_admins = await db.scalar(
        select(func.count(User.id)).where(and_(User.org_id == org_uuid, User.role == "admin"))
    ) or 0

    admin_result = await db.execute(select(User).where(and_(User.org_id == org_uuid, User.role == "admin")).limit(1))
    admin_user = admin_result.scalar_one_or_none()

    return OrgDetailExtended(
        id=str(org.id),
        name=org.name,
        slug=org.slug,
        is_active=org.is_active,
        created_at=org.created_at.isoformat(),
        max_sessions=org.max_sessions,
        max_queues_per_session=org.max_queues_per_session,
        total_users=total_users,
        total_admins=total_admins,
        admin_email=admin_user.email if admin_user else None,
        admin_initial_password=admin_user.initial_password if admin_user else None,
        admin_password_changed_at=admin_user.password_changed_at.isoformat() if admin_user and admin_user.password_changed_at else None,
    )


@router.get(
    "/organizations/{org_id}/usage",
    response_model=OrgUsageResponse,
    summary="Organization Usage Monitoring",
)
async def get_organization_usage(
    org_id: str,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgUsageResponse:
    """Return detailed usage metrics for a specific organization."""
    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org_id.")

    result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org: Organization | None = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    # Since Message model might not be imported, let's try to import it safely
    try:
        from app.models.message import Message
        messages_sent = await db.scalar(
            select(func.count(Message.id)).where(Message.org_id == org_uuid)
        ) or 0
    except ImportError:
        messages_sent = 0

    queue_entries_used = await db.scalar(
        select(func.count(Token.id)).where(Token.org_id == org_uuid)
    ) or 0

    customers_served = await db.scalar(
        select(func.count(Token.id)).where(and_(Token.org_id == org_uuid, Token.status == "done"))
    ) or 0

    active_queues = await db.scalar(
        select(func.count(Queue.id)).where(and_(Queue.org_id == org_uuid, Queue.is_active == True))  # noqa: E712
    ) or 0

    active_staff = await db.scalar(
        select(func.count(User.id)).where(and_(User.org_id == org_uuid, User.role == "staff"))
    ) or 0

    return OrgUsageResponse(
        queue_entries_used=queue_entries_used,
        queue_entries_max=org.max_tokens,
        customers_served=customers_served,
        active_queues=active_queues,
        active_staff=active_staff,
        messages_sent=messages_sent
    )


@router.put(
    "/organizations/{org_id}",
    response_model=OrgDetail,
    summary="Update Organization",
)
async def update_organization(
    org_id: str,
    body: OrgUpdateRequest,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgDetail:
    """Update an organization's name, slug, and active status."""
    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org_id.")

    result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org: Organization | None = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    if body.org_slug != org.slug:
        clash = await db.execute(
            select(Organization).where(
                Organization.slug == body.org_slug, Organization.id != org_uuid
            )
        )
        if clash.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Slug '{body.org_slug}' is already taken.",
            )

    org.name = body.org_name
    org.slug = body.org_slug
    org.is_active = body.is_active
    
    if body.max_sessions is not None:
        org.max_sessions = body.max_sessions
    if body.max_queues_per_session is not None:
        org.max_queues_per_session = body.max_queues_per_session
    if body.max_staff is not None:
        org.max_staff = body.max_staff

    # Handle admin email update
    admin_user = await db.scalar(
        select(User).where(and_(User.org_id == org.id, User.role == "admin")).limit(1)
    )
    if body.admin_email and admin_user and body.admin_email != admin_user.email:
        email_clash = await db.scalar(select(User).where(User.email == body.admin_email).limit(1))
        if email_clash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{body.admin_email}' is already in use by another user.",
            )
        admin_user.email = body.admin_email

    await db.commit()
    await db.refresh(org)
    if admin_user:
        await db.refresh(admin_user)

    logger.info("Super admin updated org | org=%s active=%s", org.slug, org.is_active)
    return _org_to_detail(org, admin_user)


@router.delete(
    "/organizations/{org_id}",
    response_model=OrgDetail,
    summary="Hard-Delete Organization",
)
async def delete_organization(
    org_id: str,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgDetail:
    """Hard-delete an organization and all its data."""
    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org_id.")

    result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org: Organization | None = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    # With ON DELETE CASCADE in User/Queue/Token, this will delete everything
    await db.delete(org)
    await db.commit()

    logger.info("Super admin PERMANENTLY deleted org | org=%s", org.slug)
    return _org_to_detail(org)


@router.post("/organizations/{org_id}/reset-password")
async def reset_org_admin_password(
    org_id: str,
    body: ResetPasswordRequest,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reset the password for an organization's primary admin."""
    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org_id.")

    # Find the primary admin
    result = await db.execute(
        select(User).where(and_(User.org_id == org_uuid, User.role == "admin")).limit(1)
    )
    admin = result.scalar_one_or_none()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Admin user not found for this organization."
        )

    # Update password
    admin.password_hash = hash_password(body.new_password)
    admin.password_changed_at = None  # Reset change status since super-admin set a new "initial"
    
    await db.commit()

    return {"message": f"Password reset successfully for {admin.email}"}


@router.post(
    "/organizations/{org_id}/impersonate",
    response_model=TokenResponse,
    summary="Impersonate Organization Admin",
)
async def impersonate_organization(
    org_id: str,
    request: Request,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Generate an access token for an organization's primary admin."""
    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org_id.")

    # Find the org
    result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org: Organization | None = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    # Find the primary admin
    result = await db.execute(
        select(User).where(and_(User.org_id == org_uuid, User.role == "admin")).limit(1)
    )
    admin = result.scalar_one_or_none()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Admin user not found for this organization."
        )

    # Generate token
    token = create_access_token(
        user_id=str(admin.id),
        org_id=str(org.id),
        org_slug=org.slug,
        org_name=org.name,
        role=admin.role,
        email=admin.email,
    )

    # Log the impersonation event
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    await record_event(
        event_type="auth.impersonate",
        user_id=_super_admin.id,
        org_id=org.id,
        ip_address=client_ip,
        resource_type="organization",
        resource_id=str(org.id),
        details={
            "impersonated_user_id": str(admin.id),
            "impersonated_email": admin.email,
            "user_agent": user_agent
        },
    )

    logger.info("Super admin %s impersonated org %s (admin %s)", _super_admin.email, org.slug, admin.email)

    return TokenResponse(access_token=token)


@router.post(
    "/announcements",
    response_model=SystemAnnouncementDetail,
    summary="Create a global system announcement",
)
async def create_announcement(
    body: SystemAnnouncementCreate,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> SystemAnnouncementDetail:
    announcement = SystemAnnouncement(
        message=body.message,
        type=body.type,
        is_active=body.is_active
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)
    
    return SystemAnnouncementDetail(
        id=str(announcement.id),
        message=announcement.message,
        type=announcement.type,
        is_active=announcement.is_active,
        created_at=announcement.created_at.isoformat(),
        updated_at=announcement.updated_at.isoformat()
    )


@router.get(
    "/announcements",
    response_model=PaginatedSystemAnnouncements,
    summary="List system announcements",
)
async def list_announcements(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> PaginatedSystemAnnouncements:
    total = await db.scalar(select(func.count(SystemAnnouncement.id))) or 0
    result = await db.execute(
        select(SystemAnnouncement)
        .order_by(desc(SystemAnnouncement.created_at))
        .limit(limit)
        .offset(offset)
    )
    rows = result.scalars().all()
    
    return PaginatedSystemAnnouncements(
        items=[
            SystemAnnouncementDetail(
                id=str(row.id),
                message=row.message,
                type=row.type,
                is_active=row.is_active,
                created_at=row.created_at.isoformat(),
                updated_at=row.updated_at.isoformat()
            )
            for row in rows
        ],
        total=total,
        limit=limit,
        offset=offset
    )


@router.patch(
    "/announcements/{announcement_id}",
    response_model=SystemAnnouncementDetail,
    summary="Update a system announcement",
)
async def update_announcement(
    announcement_id: str,
    body: SystemAnnouncementUpdate,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> SystemAnnouncementDetail:
    import uuid as _uuid
    try:
        a_uuid = _uuid.UUID(announcement_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid announcement ID")
        
    result = await db.execute(select(SystemAnnouncement).where(SystemAnnouncement.id == a_uuid))
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    if body.message is not None:
        announcement.message = body.message
    if body.type is not None:
        announcement.type = body.type
    if body.is_active is not None:
        announcement.is_active = body.is_active
        
    await db.commit()
    await db.refresh(announcement)
    
    return SystemAnnouncementDetail(
        id=str(announcement.id),
        message=announcement.message,
        type=announcement.type,
        is_active=announcement.is_active,
        created_at=announcement.created_at.isoformat(),
        updated_at=announcement.updated_at.isoformat()
    )


@router.delete(
    "/announcements/{announcement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a system announcement",
)
async def delete_announcement(
    announcement_id: str,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    import uuid as _uuid
    try:
        a_uuid = _uuid.UUID(announcement_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid announcement ID")
        
    result = await db.execute(select(SystemAnnouncement).where(SystemAnnouncement.id == a_uuid))
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    await db.delete(announcement)
    await db.commit()
    return None


@router.get(
    "/queues",
    response_model=GlobalQueueResponse,
    summary="List all active global queues",
)
async def list_global_queues(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None),
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> GlobalQueueResponse:
    # Build conditions
    conditions = [or_(Queue.is_active == True, Queue.is_paused == True)]
    if search:
        conditions.append(or_(
            Organization.name.ilike(f"%{search}%"),
            Queue.name.ilike(f"%{search}%")
        ))
        
    # First, get the total count
    # Need to join Organization to filter by its name in count
    count_stmt = select(func.count(Queue.id)).join(Organization, Queue.org_id == Organization.id).where(and_(*conditions))
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    # Then fetch paginated data
    stmt = (
        select(
            Queue.id,
            Organization.name.label("organization"),
            Queue.name.label("queue_name"),
            Queue.current_token_number.label("current_position"),
            Queue.is_paused,
            func.count(Token.id).filter(Token.status == "waiting").label("customers_waiting"),
            func.count(func.distinct(Token.served_by_id)).filter(Token.status == "serving").label("staff_handling"),
            func.avg(func.extract('epoch', Token.served_at - Token.created_at)).filter(Token.status == "done").label("avg_wait_seconds")
        )
        .join(Organization, Queue.org_id == Organization.id)
        .outerjoin(Token, Token.queue_id == Queue.id)
        .where(and_(*conditions))
        .group_by(Queue.id, Organization.name, Queue.created_at)
        .order_by(Queue.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for row in rows:
        wait_str = "N/A"
        if row.avg_wait_seconds is not None:
            mins = int(row.avg_wait_seconds // 60)
            wait_str = f"{mins} min{'s' if mins != 1 else ''}"
            
        items.append(GlobalQueueDetail(
            id=str(row.id),
            organization=row.organization,
            queue_name=row.queue_name,
            current_position=row.current_position,
            customers_waiting=row.customers_waiting,
            average_wait_time=wait_str,
            staff_handling=row.staff_handling,
            status="Paused" if row.is_paused else "Active"
        ))
        
    page = (offset // limit) + 1
    pages = (total + limit - 1) // limit if limit > 0 else 1

    return GlobalQueueResponse(items=items, total=total, page=page, pages=pages)


@router.post(
    "/queues/{queue_id}/{action}",
    response_model=SuccessResponse,
    summary="Global Queue Emergency Actions",
)
async def perform_queue_action(
    queue_id: str,
    action: Literal["pause", "resume", "clear"],
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    import uuid as _uuid
    try:
        q_uuid = _uuid.UUID(queue_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid queue ID")

    result = await db.execute(select(Queue).where(
        Queue.id == q_uuid, 
        or_(Queue.is_active == True, Queue.is_paused == True)
    ))
    queue = result.scalar_one_or_none()
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")

    if action == "pause":
        queue.is_paused = True
        queue.is_active = False
    elif action == "resume":
        queue.is_paused = False
        queue.is_active = True
    elif action == "clear":
        # Delete all waiting tokens
        await db.execute(
            update(Token)
            .where(Token.queue_id == queue.id, Token.status == TokenStatus.waiting)
            .values(status=TokenStatus.deleted)
        )

    await db.commit()
    return SuccessResponse(message=f"Queue {action}d successfully")


@router.get(
    "/users/search",
    response_model=PaginatedGlobalUsers,
    summary="Global Staff Search",
)
async def search_global_users(
    q: str = Query("", description="Search by name or email"),
    org_id: Optional[str] = Query(None, description="Filter by Organization ID"),
    role: Optional[str] = Query(None, description="Filter by role (admin, receptionist, doctor)"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> PaginatedGlobalUsers:
    """Search all users across the platform."""
    # Base query for counting
    count_stmt = select(func.count(User.id)).outerjoin(Organization, User.org_id == Organization.id)
    
    # Data query
    stmt = (
        select(
            User,
            Organization.name.label("org_name"),
            Organization.slug.label("org_slug")
        )
        .outerjoin(Organization, User.org_id == Organization.id)
    )

    # Filters
    filters = []
    if q:
        search_pattern = f"%{q}%"
        filters.append(or_(
            User.first_name.ilike(search_pattern),
            User.last_name.ilike(search_pattern),
            User.email.ilike(search_pattern)
        ))
    
    if org_id:
        try:
            filters.append(User.org_id == _uuid.UUID(org_id))
        except ValueError:
            pass

    if role:
        filters.append(User.role == role)

    if filters:
        count_stmt = count_stmt.where(and_(*filters))
        stmt = stmt.where(and_(*filters))

    # Get total count
    total = await db.scalar(count_stmt) or 0

    # Get paginated data
    stmt = stmt.order_by(desc(User.created_at)).limit(limit).offset(offset)
    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for user, org_name, org_slug in rows:
        items.append(GlobalUserDetail(
            id=str(user.id),
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            org_id=str(user.org_id) if user.org_id else None,
            org_name=org_name,
            org_slug=org_slug,
            created_at=user.created_at
        ))

    return PaginatedGlobalUsers(
        items=items,
        total=total,
        limit=limit,
        offset=offset
    )


@router.put(
    "/users/{user_id}/status",
    response_model=SuccessResponse,
    summary="Toggle User Status",
)
async def toggle_user_status(
    user_id: str,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    """Toggle a user's is_active status globally."""
    try:
        u_uuid = _uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid user ID")

    result = await db.execute(select(User).where(User.id == u_uuid))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = not user.is_active
    await db.commit()
    
    await record_event(
        event_type="user.status_changed",
        user_id=_super_admin.id,
        org_id=user.org_id,
        details={"target_user_id": str(user.id), "new_status": user.is_active}
    )
    
    action = "Activated" if user.is_active else "Suspended"
    return SuccessResponse(message=f"User {action} successfully")


@router.post(
    "/users/{user_id}/reset-password",
    response_model=ResetPasswordResponse,
    summary="Reset User Password",
)
async def reset_user_password(
    user_id: str,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ResetPasswordResponse:
    """Generate a temporary password and force a reset on next login."""
    try:
        u_uuid = _uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid user ID")

    result = await db.execute(select(User).where(User.id == u_uuid))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Generate 8-char random alphanumeric password
    alphabet = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(alphabet) for i in range(8))
    
    user.password_hash = hash_password(temp_password)
    user.initial_password = temp_password
    user.password_changed_at = None
    
    await db.commit()
    
    await record_event(
        event_type="user.password_reset_by_admin",
        user_id=_super_admin.id,
        org_id=user.org_id,
        details={"target_user_id": str(user.id), "target_email": user.email}
    )
    
    return ResetPasswordResponse(
        message="Password reset successfully",
        temporary_password=temp_password
    )

# ── Bare-Metal Backups ────────────────────────────────────────────────────────

class BackupItem(BaseModel):
    filename: str
    size_mb: float
    created_at: str

class BackupListResponse(BaseModel):
    items: list[BackupItem]

class RestoreRequest(BaseModel):
    filename: str

@router.get(
    "/backups",
    response_model=BackupListResponse,
    summary="List bare-metal database backups",
)
async def list_backups(
    _super_admin: User = Depends(get_current_super_admin),
) -> BackupListResponse:
    import os
    from datetime import datetime

    BACKUP_DIR = "/app/backups"
    if not os.path.exists(BACKUP_DIR):
        return BackupListResponse(items=[])

    files = []
    for filename in os.listdir(BACKUP_DIR):
        if filename.endswith(".dump"):
            filepath = os.path.join(BACKUP_DIR, filename)
            stat = os.stat(filepath)
            size_mb = round(stat.st_size / (1024 * 1024), 2)
            created_at = datetime.fromtimestamp(stat.st_mtime).isoformat()
            files.append(BackupItem(filename=filename, size_mb=size_mb, created_at=created_at))

    # Sort descending by date
    files.sort(key=lambda x: x.created_at, reverse=True)
    return BackupListResponse(items=files)

@router.post(
    "/backups/restore",
    response_model=SuccessResponse,
    summary="Restore bare-metal database from backup",
)
async def restore_from_backup(
    body: RestoreRequest,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    from app.utils.backup import restore_backup
    try:
        await restore_backup(body.filename, db)
        return SuccessResponse(message=f"Database successfully restored from {body.filename}")
    except Exception as e:
        logger.error(f"Restore failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
