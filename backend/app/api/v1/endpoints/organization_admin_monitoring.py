import uuid
import logging
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.db.deps import get_db
from app.core.deps import require_organization_admin
from app.models.user import User
from app.models.organization import Organization
from app.models.session import Session
from app.models.queue import Queue
from app.models.token import Token, TokenStatus
from app.audit.models import AuditLog
from app.models.message import Message

from app.schemas.organization_admin_monitoring import (
    DashboardMetricsResponse, GlobalKPIs, DynamicInsights, ExecutiveInsights,
    WhatsAppOverview, BranchHealthOverview, DashboardAlert, BranchPerformanceRow,
    BranchOverviewItem, AnalyticsResponse,
    TimeRangeMetrics, BranchComparisonItem, SessionMonitorItem, QueueMonitorItem, StaffMonitorItem,
    WhatsAppMonitorItem, AuditMonitorItem
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Helpers ───────────────────────────────────────────────────────────────────
async def get_org_ids(db: AsyncSession, parent_org_id: uuid.UUID, branch_id: Optional[uuid.UUID] = None) -> List[uuid.UUID]:
    query = select(Organization.id).where(Organization.parent_organization_id == parent_org_id)
    if branch_id:
        query = query.where(Organization.id == branch_id)
    res = await db.execute(query)
    return list(res.scalars().all())

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
):
    from app.models.parent_organization import ParentOrganization
    parent_org_res = await db.execute(select(ParentOrganization).where(ParentOrganization.id == current_user.parent_organization_id))
    parent_org = parent_org_res.scalar_one_or_none()
    org_name = parent_org.name if parent_org else "Organization"

    # Global context (All branches)
    global_org_ids = await get_org_ids(db, current_user.parent_organization_id, None)
    
    # Filtered context
    filtered_org_ids = await get_org_ids(db, current_user.parent_organization_id, branch_id)

    if not global_org_ids:
        return DashboardMetricsResponse(
            organization_name=org_name,
            global_kpis=GlobalKPIs(total_branches=0, active_branches=0, inactive_branches=0, total_staff=0, total_branch_admins=0, total_customers_waiting=0, total_customers_served_today=0, org_health_score=0),
            dynamic_insights=DynamicInsights(active_sessions=0, active_queues=0, customers_being_served=0, average_wait_time="0m", average_service_time="0m", whatsapp_success_rate=0.0),
            executive_insights=ExecutiveInsights(),
            whatsapp_overview=WhatsAppOverview(messages_sent_today=0, delivered=0, failed=0, pending=0, success_rate=0.0),
            branch_health=BranchHealthOverview(healthy_branches=0, warning_branches=0, critical_branches=0),
            alerts=[],
            branch_performance=[]
        )

    today = datetime.now(timezone.utc).date()

    # --- GLOBAL KPIs (Unaffected by branch_id) ---
    global_branches_res = await db.execute(select(Organization).where(Organization.id.in_(global_org_ids)))
    global_branches = global_branches_res.scalars().all()
    
    global_staff_res = await db.execute(select(User).where(User.org_id.in_(global_org_ids)))
    global_staff = global_staff_res.scalars().all()
    
    global_tokens_res = await db.execute(
        select(Token.status, func.count(Token.id))
        .where(Token.org_id.in_(global_org_ids), func.date(Token.created_at) == today)
        .group_by(Token.status)
    )
    global_tokens = dict(global_tokens_res.all())

    total_branches = len(global_branches)
    active_branches = sum(1 for b in global_branches if b.is_active)
    global_kpis = GlobalKPIs(
        total_branches=total_branches,
        active_branches=active_branches,
        inactive_branches=total_branches - active_branches,
        total_staff=sum(1 for s in global_staff if s.role == "staff"),
        total_branch_admins=sum(1 for s in global_staff if s.role == "admin" or s.role == "branch_admin"),
        total_customers_waiting=global_tokens.get(TokenStatus.waiting, 0),
        total_customers_served_today=global_tokens.get(TokenStatus.done, 0),
        org_health_score=100 if active_branches > 0 else 0 # Simplified health
    )

    # --- DYNAMIC INSIGHTS (Filtered) ---
    filtered_sessions_res = await db.execute(
        select(func.count(Session.id)).where(Session.org_id.in_(filtered_org_ids), Session.session_date == today)
    )
    filtered_queues_res = await db.execute(
        select(func.count(Queue.id)).where(Queue.org_id.in_(filtered_org_ids), Queue.is_active == True)
    )
    filtered_tokens_res = await db.execute(
        select(Token.status, func.count(Token.id))
        .where(Token.org_id.in_(filtered_org_ids), func.date(Token.created_at) == today)
        .group_by(Token.status)
    )
    filtered_tokens = dict(filtered_tokens_res.all())
    
    dynamic_insights = DynamicInsights(
        active_sessions=filtered_sessions_res.scalar() or 0,
        active_queues=filtered_queues_res.scalar() or 0,
        customers_being_served=filtered_tokens.get(TokenStatus.serving, 0),
        average_wait_time="0m", # Placeholder until analytics aggregation is available
        average_service_time="0m",
        whatsapp_success_rate=100.0 # Placeholder
    )

    from app.whatsapp.models import WhatsAppMessage
    messages_res = await db.execute(
        select(WhatsAppMessage.status, func.count(WhatsAppMessage.id))
        .where(WhatsAppMessage.organization_id.in_(filtered_org_ids), func.date(WhatsAppMessage.created_at) == today)
        .group_by(WhatsAppMessage.status)
    )
    msg_counts = dict(messages_res.all())
    total_msgs = sum(msg_counts.values())
    delivered_msgs = msg_counts.get("delivered", 0) + msg_counts.get("read", 0)
    
    whatsapp_overview = WhatsAppOverview(
        messages_sent_today=total_msgs,
        delivered=delivered_msgs,
        failed=msg_counts.get("failed", 0),
        pending=msg_counts.get("pending", 0) + msg_counts.get("queued", 0),
        success_rate=(delivered_msgs / total_msgs * 100) if total_msgs > 0 else 0.0
    )

    # --- BRANCH PERFORMANCE ---
    branch_performance = []
    
    for org_id in filtered_org_ids:
        branch_obj = next((b for b in global_branches if b.id == org_id), None)
        if not branch_obj:
            continue
            
        b_tokens_res = await db.execute(
            select(Token.status, func.count(Token.id))
            .where(Token.org_id == org_id, func.date(Token.created_at) == today)
            .group_by(Token.status)
        )
        b_t = dict(b_tokens_res.all())
        
        b_sessions = await db.execute(select(func.count(Session.id)).where(Session.org_id == org_id, Session.session_date == today))
        b_queues = await db.execute(select(func.count(Queue.id)).where(Queue.org_id == org_id, Queue.is_active == True))
        
        branch_performance.append(BranchPerformanceRow(
            id=branch_obj.id,
            name=branch_obj.name,
            slug=branch_obj.slug,
            waiting_customers=b_t.get(TokenStatus.waiting, 0),
            serving_customers=b_t.get(TokenStatus.serving, 0),
            customers_served_today=b_t.get(TokenStatus.done, 0),
            avg_wait_time="0m",
            active_sessions=b_sessions.scalar() or 0,
            active_queues=b_queues.scalar() or 0,
            status="Active" if branch_obj.is_active else "Inactive"
        ))

    # --- EXECUTIVE INSIGHTS ---
    executive_insights = ExecutiveInsights()
    if branch_performance:
        top_branch = max(branch_performance, key=lambda x: x.customers_served_today, default=None)
        busiest_branch = max(branch_performance, key=lambda x: x.waiting_customers, default=None)
        if top_branch and top_branch.customers_served_today > 0:
            executive_insights.top_performing_branch = top_branch.name
            executive_insights.most_customers_served = str(top_branch.customers_served_today)
        if busiest_branch and busiest_branch.waiting_customers > 0:
            executive_insights.busiest_branch = busiest_branch.name

    # --- ALERTS & HEALTH ---
    alerts = []
    healthy = active_branches
    
    return DashboardMetricsResponse(
        organization_name=org_name,
        global_kpis=global_kpis,
        dynamic_insights=dynamic_insights,
        executive_insights=executive_insights,
        whatsapp_overview=whatsapp_overview,
        branch_health=BranchHealthOverview(healthy_branches=healthy, warning_branches=0, critical_branches=0),
        alerts=alerts,
        branch_performance=branch_performance
    )

@router.get("/branches", response_model=List[BranchOverviewItem])
async def list_branches_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
):
    org_ids = await get_org_ids(db, current_user.parent_organization_id, branch_id)
    if not org_ids:
        return []

    branches_res = await db.execute(select(Organization).where(Organization.id.in_(org_ids)))
    branches = branches_res.scalars().all()
    
    result = []
    for b in branches:
        today = datetime.now(timezone.utc).date()
        s_res = await db.execute(select(func.count(Session.id)).where(Session.org_id == b.id, Session.session_date == today))
        active_s = s_res.scalar() or 0
        q_res = await db.execute(select(func.count(Queue.id)).where(Queue.org_id == b.id, Queue.is_active == True))
        active_q = q_res.scalar() or 0

        # Health
        alerts = []
        if not b.is_active:
            health = "Offline"
            alerts.append("Branch Inactive")
        elif active_s == 0:
            health = "Warning"
            alerts.append("No Active Sessions")
        elif active_q == 0:
            health = "Warning"
            alerts.append("No Active Queues")
        else:
            health = "Healthy"

        result.append(BranchOverviewItem(
            id=b.id,
            name=b.name,
            slug=b.slug,
            status="Active" if b.is_active else "Inactive",
            queues=active_q,
            sessions=active_s,
            waiting=0, # Need to aggregate
            served_today=0,
            avg_wait_time="0m",
            health=health,
            last_activity=b.created_at, # Placeholder
            total_staff=0, # Placeholder
            online_staff=0, # Placeholder
            whatsapp_success_rate=100.0, # Placeholder
            whatsapp_failed_today=0, # Placeholder
            alerts=alerts
        ))
    return result

@router.get("/branch/{org_id}/summary")
async def get_branch_summary(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    return {} # Implementation pending

@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
):
    org_ids = await get_org_ids(db, current_user.parent_organization_id, branch_id)
    # Dummy data until full aggregation logic is implemented
    def dummy_metrics():
        return TimeRangeMetrics(
            total_customers=0, total_tokens=0, completed_tokens=0, cancelled_tokens=0,
            avg_wait_time="0m", avg_service_time="0m", peak_hour="12:00 PM",
            busiest_branch="-", least_busy_branch="-"
        )
    return AnalyticsResponse(
        today=dummy_metrics(),
        this_week=dummy_metrics(),
        this_month=dummy_metrics(),
        branch_comparison=[]
    )

@router.get("/monitoring/sessions", response_model=List[SessionMonitorItem])
async def monitor_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
):
    org_ids = await get_org_ids(db, current_user.parent_organization_id, branch_id)
    if not org_ids:
        return []
    
    today = datetime.now(timezone.utc).date()
    query = select(Session, Organization).join(Organization, Session.org_id == Organization.id).where(Session.org_id.in_(org_ids), Session.session_date == today)
    res = await db.execute(query)
    
    items = []
    for s, org in res.all():
        items.append(SessionMonitorItem(
            id=s.id, branch=org.name, branch_slug=org.slug,
            queue="-", session_name=s.title,
            waiting=0, serving=0, completed=0, status="Active"
        ))
    return items

@router.get("/monitoring/queues", response_model=List[QueueMonitorItem])
async def monitor_queues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
):
    org_ids = await get_org_ids(db, current_user.parent_organization_id, branch_id)
    if not org_ids:
        return []
        
    query = select(Queue, Organization).join(Organization, Queue.org_id == Organization.id).where(Queue.org_id.in_(org_ids), Queue.is_active == True)
    res = await db.execute(query)
    
    items = []
    for q, org in res.all():
        items.append(QueueMonitorItem(
            id=q.id, branch=org.name, branch_slug=org.slug, queue_name=q.name,
            current_token="-", waiting_count=0, avg_wait="0m", status="Active", load_indicator="Low"
        ))
    return items

@router.get("/monitoring/staff", response_model=List[StaffMonitorItem])
async def monitor_staff(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
):
    org_ids = await get_org_ids(db, current_user.parent_organization_id, branch_id)
    if not org_ids:
        return []
        
    query = select(User, Organization).join(Organization, User.org_id == Organization.id).where(
        User.org_id.in_(org_ids),
        User.role != 'organization_admin'
    )
    res = await db.execute(query)
    
    items = []
    for u, org in res.all():
        items.append(StaffMonitorItem(
            id=u.id, branch=org.name, branch_slug=org.slug,
            name=f"{u.first_name or ''} {u.last_name or ''}".strip() or "Staff",
            email=u.email,
            role=u.role, status="Active" if u.is_active else "Inactive", 
            created_at=u.created_at,
            last_login=None
        ))
    return items

@router.get("/monitoring/whatsapp", response_model=List[WhatsAppMonitorItem])
async def monitor_whatsapp(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
):
    org_ids = await get_org_ids(db, current_user.parent_organization_id, branch_id)
    if not org_ids:
        return []
    return []

@router.get("/monitoring/audit", response_model=List[AuditMonitorItem])
async def monitor_audit(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
):
    if not current_user.parent_organization_id:
        return []
        
    from app.audit.models import AuditLog
    query = select(AuditLog).where(
        AuditLog.parent_organization_id == current_user.parent_organization_id
    )
    if branch_id:
        query = query.where(AuditLog.org_id == branch_id)
        
    query = query.order_by(AuditLog.created_at.desc()).limit(100)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    items = []
    for log in logs:
        items.append(AuditMonitorItem(
            id=log.id,
            action=log.event_type,
            user=str(log.user_id) if log.user_id else "System",
            timestamp=log.created_at,
            details=str(log.details) if log.details else ""
        ))
    return items
