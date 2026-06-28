import uuid
import logging
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.db.deps import get_db
from app.core.deps import require_organization_admin, get_current_super_admin
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
    BranchOverviewItem, AnalyticsResponse, SessionMonitorItem, QueueMonitorItem, StaffMonitorItem,
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

def _fmt_minutes(sec: float | None) -> str:
    if not sec or sec <= 0:
        return "0m"
    m = int(sec / 60)
    s = int(sec % 60)
    return f"{m}m {s}s" if s else f"{m}m"

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
            branch_performance=[],
            max_branches=parent_org.max_branches if parent_org else None
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

    # Real avg wait & service times for filtered orgs (today only)
    time_metrics_res = await db.execute(
        select(
            func.avg(func.extract('epoch', Token.served_at - Token.created_at)).label('avg_wait_sec'),
            func.avg(func.extract('epoch', Token.completed_at - Token.served_at)).label('avg_serve_sec'),
        ).where(
            Token.org_id.in_(filtered_org_ids),
            func.date(Token.created_at) == today,
            Token.status == TokenStatus.done,
            Token.served_at.isnot(None),
        )
    )
    tm = time_metrics_res.first()

    dynamic_insights = DynamicInsights(
        active_sessions=filtered_sessions_res.scalar() or 0,
        active_queues=filtered_queues_res.scalar() or 0,
        customers_being_served=filtered_tokens.get(TokenStatus.serving, 0),
        average_wait_time=_fmt_minutes(tm.avg_wait_sec if tm else None),
        average_service_time=_fmt_minutes(tm.avg_serve_sec if tm else None),
        whatsapp_success_rate=100.0  # Placeholder — WhatsApp computed below
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

        # Real avg wait time for this branch today
        b_wait_res = await db.execute(
            select(
                func.avg(func.extract('epoch', Token.served_at - Token.created_at)).label('avg_wait_sec'),
            ).where(
                Token.org_id == org_id,
                func.date(Token.created_at) == today,
                Token.status == TokenStatus.done,
                Token.served_at.isnot(None),
            )
        )
        b_wait = b_wait_res.scalar_one_or_none()
        
        branch_performance.append(BranchPerformanceRow(
            id=branch_obj.id,
            name=branch_obj.name,
            slug=branch_obj.slug,
            waiting_customers=b_t.get(TokenStatus.waiting, 0),
            serving_customers=b_t.get(TokenStatus.serving, 0),
            customers_served_today=b_t.get(TokenStatus.done, 0),
            avg_wait_time=_fmt_minutes(b_wait),
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
            executive_insights.top_performing_branch_id = top_branch.id
            executive_insights.most_customers_served = str(top_branch.customers_served_today)
        if busiest_branch and busiest_branch.waiting_customers > 0:
            executive_insights.busiest_branch = busiest_branch.name
            executive_insights.busiest_branch_id = busiest_branch.id

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
        branch_performance=branch_performance,
        max_branches=parent_org.max_branches if parent_org else None
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

        b_tokens_res = await db.execute(
            select(Token.status, func.count(Token.id))
            .where(Token.org_id == b.id, func.date(Token.created_at) == today)
            .group_by(Token.status)
        )
        b_t = dict(b_tokens_res.all())
        serving_customers = b_t.get(TokenStatus.serving, 0)
        waiting_customers = b_t.get(TokenStatus.waiting, 0)
        served_customers = b_t.get(TokenStatus.done, 0)

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
            serving=serving_customers,
            waiting=waiting_customers,
            served_today=served_customers,
            avg_wait_time="0m",
            health=health,
            last_activity=b.created_at, # Placeholder
            total_staff=0, # Placeholder
            online_staff=0, # Placeholder
            whatsapp_success_rate=100.0, # Placeholder
            whatsapp_failed_today=0, # Placeholder
            address=b.address,
            phone_number=b.phone_number,
            brand_color=b.brand_color,
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


@router.get("/analytics/traffic", summary="Hourly Traffic & Wait Time for Chart")
async def get_traffic_trend(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
):
    """
    Returns hourly traffic volume and average wait time for today.
    Used exclusively by the TrafficChart on the org-admin dashboard.
    """
    from zoneinfo import ZoneInfo
    from sqlalchemy import case as sa_case

    org_ids = await get_org_ids(db, current_user.parent_organization_id, branch_id)
    if not org_ids:
        return {"peak_traffic": [], "peak_hour": None}

    tz = ZoneInfo("Asia/Kolkata")
    today_local = datetime.now(tz).date()

    # Filter: tokens created today (local time)
    peak_q = select(
        func.extract('hour', func.timezone('Asia/Kolkata', Token.created_at)).label('hr'),
        func.count(Token.id).label("arrived"),
        func.sum(sa_case((Token.status == TokenStatus.done, 1), else_=0)).label("served"),
        func.avg(
            func.extract('epoch', Token.served_at - Token.created_at)
        ).label('avg_wait_sec'),
    ).where(
        Token.org_id.in_(org_ids),
        func.date(func.timezone('Asia/Kolkata', Token.created_at)) == today_local,
    ).group_by('hr').order_by('hr')

    rows = (await db.execute(peak_q)).all()

    max_arrived = max((r.arrived for r in rows), default=0)
    peak_hr = next((r.hr for r in rows if r.arrived == max_arrived), None)

    result = []
    for r in rows:
        hr = int(r.hr)
        ampm = "AM" if hr < 12 else "PM"
        disp = hr if hr <= 12 else hr - 12
        if disp == 0:
            disp = 12
        avg_wait_min = round(float(r.avg_wait_sec) / 60, 1) if r.avg_wait_sec else 0
        result.append({
            "time_block": f"{disp}:00 {ampm}",
            "customers_arrived": r.arrived,
            "customers_served": int(r.served or 0),
            "avg_wait_minutes": avg_wait_min,
            "is_peak": (r.hr == peak_hr),
        })

    # Format peak hour label
    peak_label = None
    if peak_hr is not None:
        hr = int(peak_hr)
        ampm = "AM" if hr < 12 else "PM"
        disp = hr if hr <= 12 else hr - 12
        if disp == 0:
            disp = 12
        next_hr = (hr + 1) % 24
        next_ampm = "AM" if next_hr < 12 else "PM"
        next_disp = next_hr if next_hr <= 12 else next_hr - 12
        if next_disp == 0:
            next_disp = 12
        peak_label = f"{disp}:00 {ampm} – {next_disp}:00 {next_ampm}"

    return {"peak_traffic": result, "peak_hour": peak_label}


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    from app.services.analytics_service import get_cross_branch_analytics
    
    analytics_data = await get_cross_branch_analytics(
        db=db,
        parent_org_id=current_user.parent_organization_id,
        branch_id=branch_id,
        start_date=start_date,
        end_date=end_date
    )
    
    if not analytics_data:
        # Return empty safe defaults
        from app.schemas.organization_admin_monitoring import (
            CustomerMetrics, TimeMetrics, OperationsMetrics
        )
        return AnalyticsResponse(
            customer_metrics=CustomerMetrics(total_customers=0, customers_served=0, customers_waiting=0, customers_abandoned=0, completion_rate="0%", abandonment_rate="0%"),
            time_metrics=TimeMetrics(avg_wait_time="00:00:00", avg_service_time="00:00:00", peak_hour="-"),
            operations_metrics=OperationsMetrics(active_branches=0, active_sessions=0, active_queues=0, operated_queues=0, online_staff=0),
            volume_trend=[], branch_ranking=[], queue_analytics=[], peak_traffic=[], staff_performance=[], insights=[]
        )
        
    return AnalyticsResponse(**analytics_data)

@router.get("/analytics/export")
async def export_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    from fastapi.responses import StreamingResponse
    from app.services.analytics_service import get_cross_branch_csv_data
    
    org_ids = await get_org_ids(db, current_user.parent_organization_id, branch_id)
    if not org_ids:
        raise HTTPException(status_code=404, detail="No branches found")
        
    csv_data = await get_cross_branch_csv_data(
        db=db,
        org_ids=org_ids,
        start_date=start_date,
        end_date=end_date
    )
    
    import io
    response = StreamingResponse(
        iter([csv_data]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=cross_branch_analytics.csv"
    return response

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
    sessions_data = res.all()
    
    if not sessions_data:
        return []

    session_ids = [s.id for s, org in sessions_data]

    # Aggregate tokens per session
    token_query = (
        select(
            Queue.session_id,
            Token.status,
            func.count(Token.id).label("count")
        )
        .select_from(Queue)
        .join(Token, Token.queue_id == Queue.id)
        .where(Queue.session_id.in_(session_ids))
        .group_by(Queue.session_id, Token.status)
    )
    token_res = await db.execute(token_query)
    
    from collections import defaultdict
    session_tokens = defaultdict(lambda: {"waiting": 0, "serving": 0, "done": 0})
    for sid, status, count in token_res.all():
        status_val = status.value if hasattr(status, 'value') else status
        if status_val in session_tokens[sid]:
            session_tokens[sid][status_val] += count

    # Count staff per org
    from sqlalchemy import case
    two_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=2)
    staff_query = (
        select(
            User.org_id, 
            func.count(User.id).label("total"),
            func.sum(case((User.last_active_at >= two_mins_ago, 1), else_=0)).label("present")
        )
        .where(User.org_id.in_(org_ids), User.role != "organization_admin")
        .group_by(User.org_id)
    )
    staff_res = await db.execute(staff_query)
    org_staff = {org_id: {"total": total, "present": int(present or 0)} for org_id, total, present in staff_res.all()}
    
    items = []
    for s, org in sessions_data:
        counts = session_tokens[s.id]
        waiting = counts["waiting"]
        serving = counts["serving"]
        completed = counts["done"]
        
        max_cap = getattr(org, 'max_waiting_capacity', 50) or 50
        pct = int((waiting / max_cap) * 100) if max_cap > 0 else 0
        load_percentage = min(100, pct)
        
        load_status = "Critical" if load_percentage >= 90 else "Heavy" if load_percentage >= 75 else "Normal"
        
        staff_data = org_staff.get(org.id, {"total": 0, "present": 0})
        total_staff = staff_data["total"]
        present_staff = staff_data["present"]
        
        items.append(SessionMonitorItem(
            id=s.id, branch=org.name, branch_slug=org.slug,
            queue="-", session_name=s.title or f"{today.strftime('%b %d')} Session",
            waiting=waiting, serving=serving, completed=completed, status="Active",
            active_staff_total=str(total_staff),
            active_staff_present=str(present_staff),
            load_status=load_status,
            load_percentage=load_percentage
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
        
    query = select(Queue, Organization, Session).join(
        Organization, Queue.org_id == Organization.id
    ).outerjoin(
        Session, Queue.session_id == Session.id
    ).where(Queue.org_id.in_(org_ids), Queue.is_active == True)
    res = await db.execute(query)
    queues_data = res.all()
    
    if not queues_data:
        return []
        
    today = datetime.now(timezone.utc).date()
    queue_ids = [q.id for q, _, _ in queues_data]
    
    tokens_res = await db.execute(
        select(Token.queue_id, Token.status, func.count(Token.id))
        .where(Token.queue_id.in_(queue_ids), func.date(Token.created_at) == today)
        .group_by(Token.queue_id, Token.status)
    )
    
    token_counts = {}
    for q_id, status, count in tokens_res.all():
        if q_id not in token_counts:
            token_counts[q_id] = {"waiting": 0, "serving": 0, "done": 0}
        if status == TokenStatus.waiting:
            token_counts[q_id]["waiting"] = count
        elif status == TokenStatus.serving:
            token_counts[q_id]["serving"] = count
        elif status == TokenStatus.done:
            token_counts[q_id]["done"] = count
            
    wait_res = await db.execute(
        select(
            Token.queue_id,
            func.avg(func.extract('epoch', Token.served_at - Token.created_at)).label('avg_wait_sec')
        ).where(
            Token.queue_id.in_(queue_ids),
            func.date(Token.created_at) == today,
            Token.status == TokenStatus.done,
            Token.served_at.isnot(None),
        ).group_by(Token.queue_id)
    )
    wait_times = {row.queue_id: row.avg_wait_sec for row in wait_res.all()}
    
    items = []
    for q, org, sess in queues_data:
        counts = token_counts.get(q.id, {"waiting": 0, "serving": 0, "done": 0})
        waiting = counts["waiting"]
        served = counts["done"]
        avg_wait_sec = wait_times.get(q.id)
        avg_wait_str = _fmt_minutes(avg_wait_sec)
        
        max_cap = getattr(org, 'max_waiting_capacity', 50) or 50
        pct = int((waiting / max_cap) * 100) if max_cap > 0 else 0
        load_percentage = min(100, pct)
        
        items.append(QueueMonitorItem(
            id=q.id, branch=org.name, branch_slug=org.slug, queue_name=q.name,
            session_name=sess.title if sess else None,
            current_token="-", waiting=waiting, served_today=served, avg_wait_time=avg_wait_str, status="Active", load_percentage=load_percentage
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
    from datetime import timedelta, datetime, timezone
    for u, org in res.all():
        is_online = u.last_active_at and u.last_active_at >= datetime.now(timezone.utc) - timedelta(minutes=2)
        items.append(StaffMonitorItem(
            id=u.id, branch=org.name, branch_slug=org.slug,
            name=f"{u.first_name or ''} {u.last_name or ''}".strip() or "Staff",
            email=u.email,
            role=u.role, status="Online" if is_online else "Offline", 
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

@router.get("/monitoring/debug-audit")
async def debug_audit(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_super_admin)):
    from app.audit.models import AuditLog
    from sqlalchemy import select
    query = select(AuditLog.event_type, AuditLog.org_id, AuditLog.parent_organization_id, AuditLog.created_at).order_by(AuditLog.created_at.desc()).limit(5)
    res = await db.execute(query)
    logs = res.all()
    return [{"event": l[0], "org_id": str(l[1]), "parent": str(l[2]), "time": str(l[3])} for l in logs]

@router.get("/monitoring/audit", response_model=List[AuditMonitorItem])
async def monitor_audit(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
    branch_id: Optional[uuid.UUID] = Query(None),
):
    if not current_user.parent_organization_id:
        return []
        
    from app.audit.models import AuditLog
    query = (
        select(AuditLog, Organization, User)
        .outerjoin(Organization, AuditLog.org_id == Organization.id)
        .outerjoin(User, AuditLog.user_id == User.id)
        .where(AuditLog.parent_organization_id == current_user.parent_organization_id)
    )
    if branch_id:
        query = query.where(AuditLog.org_id == branch_id)
        
    query = query.order_by(AuditLog.created_at.desc()).limit(100)
    result = await db.execute(query)
    logs_data = result.all()
    
    items = []
    for log, org, u in logs_data:
        branch_name = org.name if org else "Organization Wide"
        branch_slug = org.slug if org else "org-wide"
        user_email = u.email if u else "System"
        
        items.append(AuditMonitorItem(
            id=log.id,
            timestamp=log.created_at,
            branch=branch_name,
            branch_slug=branch_slug,
            user_email=user_email,
            action=log.event_type,
            entity_type=log.resource_type,
            entity_id=str(log.resource_id) if log.resource_id else None,
            details=log.details if isinstance(log.details, dict) else None
        ))
    return items
