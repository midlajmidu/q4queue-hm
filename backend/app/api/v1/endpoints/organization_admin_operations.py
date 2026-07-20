import uuid
import ast
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, String

from app.core.deps import get_db, require_organization_admin
from app.models.user import User
from app.models.organization import Organization
from app.models.session import Session
from app.models.queue import Queue
from app.models.token import Token, TokenStatus
from app.audit.service import record_event

router = APIRouter()

class HealthScoreResponse(BaseModel):
    score: int
    status: str # Healthy, Attention Needed, Critical
    factors: dict

class SearchResult(BaseModel):
    type: str # customer, token, session, queue
    id: str
    title: str
    subtitle: str
    branch_name: str
    url: str

class BranchStatusUpdate(BaseModel):
    is_active: bool

@router.get("/health", response_model=HealthScoreResponse)
async def get_organization_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not associated with a parent organization")
        
    # Placeholder for actual health calculation
    # Factors: Active Sessions, Queue Availability, WhatsApp Success Rate, Branch Uptime, Recent Errors
    score = 95
    status_label = "Healthy" if score >= 90 else "Attention Needed" if score >= 70 else "Critical"
    
    return HealthScoreResponse(
        score=score,
        status=status_label,
        factors={
            "active_sessions": "Optimal",
            "whatsapp_success": "99.9%",
            "branch_uptime": "100%",
            "recent_errors": 0
        }
    )

@router.get("/search", response_model=List[SearchResult])
async def global_search(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        return []
    
    from app.models.organization import Organization
    orgs_res = await db.execute(
        select(Organization.id, Organization.name, Organization.slug)
        .where(Organization.parent_organization_id == current_user.parent_organization_id)
    )
    orgs = orgs_res.all()
    if not orgs:
        return []
        
    org_ids = [o.id for o in orgs]
    org_map = {o.id: (o.name, o.slug) for o in orgs}
    
    results = []
    search_term = f"%{q}%"
    
    # Search Branches
    for o in orgs:
        if q.lower() in o.name.lower() or q.lower() in o.slug.lower():
            results.append(SearchResult(
                type="branch",
                id=str(o.id),
                title=o.name,
                subtitle=f"Branch Slug: {o.slug}",
                branch_name=o.name,
                url=f"/organization-admin/branches/{o.id}"
            ))

    # Search Tokens
    from app.models.token import Token
    tokens_res = await db.execute(
        select(Token)
        .where(Token.org_id.in_(org_ids))
        .where((Token.customer_name.ilike(search_term)) | (Token.customer_phone.ilike(search_term)) | (Token.token_number.ilike(search_term)))
        .limit(20)
    )
    for t in tokens_res.scalars().all():
        b_name, b_slug = org_map.get(t.org_id, ("Unknown", ""))
        results.append(SearchResult(
            type="token",
            id=str(t.id),
            title=f"Token {t.token_number} - {t.customer_name or 'No Name'}",
            subtitle=f"Phone: {t.customer_phone or 'N/A'}",
            branch_name=b_name,
            url=f"/{b_slug}/dashboard/queues/{t.queue_id}" if b_slug else "#"
        ))
        
    # Search Users (Staff & Customers)
    users_res = await db.execute(
        select(User)
        .where(User.org_id.in_(org_ids))
        .where((User.first_name.ilike(search_term)) | (User.last_name.ilike(search_term)) | (User.email.ilike(search_term)))
        .limit(20)
    )
    for u in users_res.scalars().all():
        b_name, b_slug = org_map.get(u.org_id, ("Unknown", ""))
        role_display = u.role.replace("_", " ").title()
        results.append(SearchResult(
            type="customer" if u.role == "customer" else "staff",
            id=str(u.id),
            title=f"{u.first_name} {u.last_name}",
            subtitle=f"{role_display} | {u.email}",
            branch_name=b_name,
            url=f"/organization-admin/monitoring/staff" if u.role in ["staff", "admin", "branch_admin"] else "#"
        ))
        
    return results[:50]

@router.get("/operations/{branch_id}")
async def get_branch_operations(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    query = select(Organization).where(
        Organization.id == branch_id,
        Organization.parent_organization_id == current_user.parent_organization_id
    )
    result = await db.execute(query)
    branch = result.scalar_one_or_none()
    
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
        
    return {
        "id": branch.id,
        "name": branch.name,
        "is_active": branch.is_active,
        "recent_errors": []
    }

@router.patch("/operations/{branch_id}/status")
async def update_branch_status(
    branch_id: uuid.UUID,
    status_in: BranchStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    query = select(Organization).where(
        Organization.id == branch_id,
        Organization.parent_organization_id == current_user.parent_organization_id
    )
    result = await db.execute(query)
    branch = result.scalar_one_or_none()
    
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
        
    branch.is_active = status_in.is_active
    await db.commit()
    
    await record_event(
        event_type="BRANCH_DISABLED" if not status_in.is_active else "BRANCH_ENABLED",
        user_id=current_user.id,
        parent_org_id=current_user.parent_organization_id,
        details={"branch_id": str(branch.id), "branch_name": branch.name}
    )
    
    return {"status": "success", "is_active": branch.is_active}

@router.delete("/operations/staff/{user_id}")
async def remove_staff(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    # Verify the user exists and belongs to a branch under this parent org
    query = select(User, Organization).join(Organization, User.org_id == Organization.id).where(
        User.id == user_id,
        Organization.parent_organization_id == current_user.parent_organization_id
    )
    result = await db.execute(query)
    record = result.first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Staff member not found or access denied")
        
    user, org = record
    
    # Don't allow org admins to delete themselves or other org admins maybe?
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
        
    await db.delete(user)
    await db.commit()
    
    await record_event(
        event_type="STAFF_REMOVED",
        user_id=current_user.id,
        parent_org_id=current_user.parent_organization_id,
        details={"removed_user_id": str(user.id), "removed_user_email": user.email, "branch": org.name}
    )
    
    return {"status": "success"}

# ── Branch Operations Center Endpoints ─────────────────────────────────────
from typing import List
from app.schemas.organization_admin_operations import (
    BranchExecutiveSummary, BranchPerformanceMetrics, QueueBreakdownItem,
    SessionBreakdownItem, StaffOverviewItem, BranchAdminItem,
    BranchWhatsAppStats, BranchHealthDetails, BranchActivityEvent,
    BranchAlert, BranchContactDetails, BranchContactDetailsUpdate,
    BranchDashboardResponse, BranchTrafficData, PeakTrafficItem
)

async def _verify_branch_access(branch_id: uuid.UUID, db: AsyncSession, current_user: User):
    query = select(Organization).where(
        Organization.id == branch_id,
        Organization.parent_organization_id == current_user.parent_organization_id
    )
    result = await db.execute(query)
    branch = result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found or access denied")
    return branch


@router.get("/operations/{branch_id}/summary", response_model=BranchExecutiveSummary)
async def get_branch_summary(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    await _verify_branch_access(branch_id, db, current_user)
    
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()
    
    # Staff counts
    staff_res = await db.execute(select(func.count(User.id)).where(User.org_id == branch_id, User.role == "staff"))
    total_staff = staff_res.scalar() or 0
    # Assuming online staff is those with an active session today. This is an approximation.
    online_staff = total_staff if total_staff > 0 else 0
    
    # Active queues & sessions
    aq_res = await db.execute(select(func.count(Queue.id)).where(Queue.org_id == branch_id, Queue.is_active == True))
    active_queues = aq_res.scalar() or 0
    
    as_res = await db.execute(select(func.count(Session.id)).where(Session.org_id == branch_id, Session.session_date == today))
    active_sessions = as_res.scalar() or 0
    
    # Token stats
    wait_res = await db.execute(select(func.count(Token.id)).where(Token.org_id == branch_id, func.date(Token.created_at) == today, Token.status == "waiting"))
    customers_waiting = wait_res.scalar() or 0
    
    serv_res = await db.execute(select(func.count(Token.id)).where(Token.org_id == branch_id, func.date(Token.created_at) == today, Token.status == TokenStatus.serving))
    customers_being_served = serv_res.scalar() or 0
    
    comp_res = await db.execute(select(func.count(Token.id)).where(Token.org_id == branch_id, func.date(Token.created_at) == today, Token.status == TokenStatus.done))
    customers_served_today = comp_res.scalar() or 0
    
    tot_res = await db.execute(select(func.count(Token.id)).where(Token.org_id == branch_id, func.date(Token.created_at) == today))
    tokens_issued_today = tot_res.scalar() or 0

    return BranchExecutiveSummary(
        total_staff=total_staff,
        online_staff=online_staff,
        active_sessions=active_sessions,
        active_queues=active_queues,
        customers_waiting=customers_waiting,
        customers_being_served=customers_being_served,
        customers_served_today=customers_served_today,
        tokens_issued_today=tokens_issued_today
    )

@router.get("/operations/{branch_id}/performance", response_model=BranchPerformanceMetrics)
async def get_branch_performance(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    await _verify_branch_access(branch_id, db, current_user)
    
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()
    
    wait_res = await db.execute(select(func.count(Token.id)).where(Token.org_id == branch_id, func.date(Token.created_at) == today, Token.status == TokenStatus.waiting))
    customers_waiting = wait_res.scalar() or 0
    
    comp_res = await db.execute(select(func.count(Token.id)).where(Token.org_id == branch_id, func.date(Token.created_at) == today, Token.status == TokenStatus.done))
    customers_served_today = comp_res.scalar() or 0
    
    canc_res = await db.execute(select(func.count(Token.id)).where(Token.org_id == branch_id, func.date(Token.created_at) == today, Token.status == TokenStatus.skipped))
    cancelled_tokens = canc_res.scalar() or 0
    
    tot_res = await db.execute(select(func.count(Token.id)).where(Token.org_id == branch_id, func.date(Token.created_at) == today))
    total_tokens = tot_res.scalar() or 0
    
    completion_rate = f"{round((customers_served_today / total_tokens) * 100)}%" if total_tokens > 0 else "0%"
    
    # Wait time & service time approximation
    avg_wait = await db.execute(
        select(func.avg(func.extract('epoch', Token.served_at) - func.extract('epoch', Token.created_at)))
        .where(Token.org_id == branch_id, func.date(Token.created_at) == today, Token.served_at != None)
    )
    avg_wait_sec = avg_wait.scalar() or 0
    avg_wait_str = f"{int(avg_wait_sec // 60)}m {int(avg_wait_sec % 60)}s"
    
    avg_svc = await db.execute(
        select(func.avg(func.extract('epoch', Token.completed_at) - func.extract('epoch', Token.served_at)))
        .where(Token.org_id == branch_id, func.date(Token.created_at) == today, Token.completed_at != None, Token.served_at != None)
    )
    avg_svc_sec = avg_svc.scalar() or 0
    avg_svc_str = f"{int(avg_svc_sec // 60)}m {int(avg_svc_sec % 60)}s"

    return BranchPerformanceMetrics(
        customers_served_today=customers_served_today,
        customers_waiting=customers_waiting,
        average_wait_time=avg_wait_str,
        average_service_time=avg_svc_str,
        cancelled_tokens=cancelled_tokens,
        completion_rate=completion_rate
    )

@router.get("/operations/{branch_id}/queues", response_model=List[QueueBreakdownItem])
async def get_branch_queues(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    try:
        await _verify_branch_access(branch_id, db, current_user)
        
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).date()
        
        queues_res = await db.execute(select(Queue).where(Queue.org_id == branch_id).order_by(Queue.created_at.desc()))
        queues = queues_res.scalars().all()
        
        results = []
        for q in queues:
            wait_res = await db.execute(select(func.count(Token.id)).where(Token.queue_id == q.id, func.date(Token.created_at) == today, Token.status == TokenStatus.waiting))
            serv_res = await db.execute(select(func.count(Token.id)).where(Token.queue_id == q.id, func.date(Token.created_at) == today, Token.status == TokenStatus.serving))
            comp_res = await db.execute(select(func.count(Token.id)).where(Token.queue_id == q.id, func.date(Token.created_at) == today, Token.status == TokenStatus.done))
            
            avg_wait = await db.execute(
                select(func.avg(func.extract('epoch', Token.served_at) - func.extract('epoch', Token.created_at)))
                .where(Token.queue_id == q.id, func.date(Token.created_at) == today, Token.served_at.isnot(None))
            )
            avg_wait_sec = avg_wait.scalar() or 0
            avg_wait_str = f"{int(avg_wait_sec // 60)}m" if avg_wait_sec > 0 else "-"
            
            current_token_str = str(q.current_token_number) if q.current_token_number and q.current_token_number > 0 else "-"
            
            results.append(QueueBreakdownItem(
                queue_id=q.id,
                queue_name=q.name,
                status="Active" if q.is_active else "Inactive",
                current_token=current_token_str,
                waiting_count=wait_res.scalar() or 0,
                serving_count=serv_res.scalar() or 0,
                completed_today=comp_res.scalar() or 0,
                average_wait=avg_wait_str
            ))
            
        return results
    except Exception as e:
        import traceback
        print("FATAL ERROR IN QUEUES ROUTE:", repr(e))
        traceback.print_exc()
        raise e

@router.get("/operations/{branch_id}/sessions", response_model=List[SessionBreakdownItem])
async def get_branch_sessions(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    await _verify_branch_access(branch_id, db, current_user)
    
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()
    
    sessions_res = await db.execute(select(Session).where(Session.org_id == branch_id, Session.session_date == today).order_by(Session.created_at.desc()))
    sessions = sessions_res.scalars().all()
    
    results = []
    for s in sessions:
        operator_name = "Staff Member"
        
        comp_res = await db.execute(select(func.count(Token.id)).where(Token.session_id == s.id, Token.status == TokenStatus.done))
        
        avg_svc = await db.execute(
            select(func.avg(func.extract('epoch', Token.completed_at) - func.extract('epoch', Token.served_at)))
            .where(Token.session_id == s.id, Token.completed_at != None, Token.served_at != None)
        )
        avg_svc_sec = avg_svc.scalar() or 0
        avg_svc_str = f"{int(avg_svc_sec // 60)}m {int(avg_svc_sec % 60)}s" if avg_svc_sec > 0 else "-"
        
        results.append(SessionBreakdownItem(
            session_id=s.id,
            session_name=s.title or f"Desk {str(s.id)[:8]}",
            operator_name=operator_name,
            started_at=s.created_at.isoformat(),
            status="Active",
            customers_served=comp_res.scalar() or 0,
            average_service_time=avg_svc_str
        ))
        
    return results

@router.get("/operations/{branch_id}/staff", response_model=List[StaffOverviewItem])
async def get_branch_staff(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    await _verify_branch_access(branch_id, db, current_user)
    
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()
    
    staff_res = await db.execute(select(User).where(User.org_id == branch_id, User.role == "staff").order_by(User.first_name))
    staff = staff_res.scalars().all()
    
    results = []
    for u in staff:
        s_res = 1
        comp_res = 0
        
        results.append(StaffOverviewItem(
            user_id=u.id,
            name=f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email,
            role="Staff",
            status="Online",
            last_login=u.created_at.isoformat(), # Ideally we'd have a last_login field
            sessions_managed=1,
            customers_served_today=0
        ))
        
    return results

@router.get("/operations/{branch_id}/admins", response_model=List[BranchAdminItem])
async def get_branch_admins(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    await _verify_branch_access(branch_id, db, current_user)
    
    admins_res = await db.execute(
        select(User)
        .where(
            User.org_id == branch_id,
            User.role.in_(["admin", "branch_admin", "staff"])
        )
        .order_by(User.role, User.first_name)
    )
    admins = admins_res.scalars().all()
    
    results = []
    for u in admins:
        fullname = f"{u.first_name or ''} {u.last_name or ''}".strip()
        if not fullname:
            fullname = u.email.split("@")[0].replace(".", " ").replace("-", " ").title()
            
        results.append(BranchAdminItem(
            user_id=u.id,
            name=fullname,
            email=u.email,
            last_login=u.created_at.isoformat(),
            status="Active" if u.is_active else "Inactive",
            role=u.role
        ))
        
    return results

@router.get("/operations/{branch_id}/whatsapp", response_model=BranchWhatsAppStats)
async def get_branch_whatsapp(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    await _verify_branch_access(branch_id, db, current_user)
    
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()
    
    from app.whatsapp.models import WhatsAppMessage
    
    msgs_res = await db.execute(
        select(WhatsAppMessage.status, func.count(WhatsAppMessage.id))
        .where(WhatsAppMessage.organization_id == branch_id, func.date(WhatsAppMessage.created_at) == today)
        .group_by(WhatsAppMessage.status)
    )
    counts = dict(msgs_res.all())
    
    delivered = counts.get("delivered", 0) + counts.get("read", 0)
    failed = counts.get("failed", 0)
    pending = counts.get("pending", 0) + counts.get("sent", 0)
    total = delivered + failed + pending
    success_rate = round((delivered / total * 100), 1) if total > 0 else 100.0
    
    last_msg_res = await db.execute(
        select(WhatsAppMessage.created_at)
        .where(WhatsAppMessage.organization_id == branch_id)
        .order_by(WhatsAppMessage.created_at.desc())
        .limit(1)
    )
    last_msg = last_msg_res.scalar_one_or_none()

    return BranchWhatsAppStats(
        messages_sent_today=total,
        delivered=delivered,
        failed=failed,
        pending=pending,
        success_rate=success_rate,
        last_sent_time=last_msg.isoformat() if last_msg else "-"
    )

@router.get("/operations/{branch_id}/health", response_model=BranchHealthDetails)
async def get_branch_health(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    branch = await _verify_branch_access(branch_id, db, current_user)
    
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()
    
    # Just checking if any queues/sessions are active
    aq_res = await db.execute(select(func.count(Queue.id)).where(Queue.org_id == branch_id, Queue.is_active == True))
    active_queues = aq_res.scalar() or 0
    
    as_res = await db.execute(select(func.count(Session.id)).where(Session.org_id == branch_id, Session.session_date == today))
    active_sessions = as_res.scalar() or 0
    
    from app.whatsapp.models import WhatsAppMessage
    wa_failed_res = await db.execute(select(func.count(WhatsAppMessage.id)).where(WhatsAppMessage.organization_id == branch_id, func.date(WhatsAppMessage.created_at) == today, WhatsAppMessage.status == "failed"))
    wa_failed = wa_failed_res.scalar() or 0
    
    health_score = 100
    if not branch.is_active: health_score -= 100
    if active_queues == 0: health_score -= 20
    if active_sessions == 0: health_score -= 20
    if wa_failed > 0: health_score -= 10
    
    return BranchHealthDetails(
        health_score=max(0, health_score),
        status="Healthy" if health_score >= 80 else ("Warning" if health_score >= 50 else "Critical"),
        queue_health="Optimal" if active_queues > 0 else "Degraded",
        session_health="Optimal" if active_sessions > 0 else "Degraded",
        staff_availability="Adequate" if active_sessions > 0 else "Low",
        whatsapp_health="Good" if wa_failed == 0 else "Warning",
        activity_health="Good" if branch.is_active else "Offline"
    )

@router.get("/operations/{branch_id}/timeline", response_model=List[BranchActivityEvent])
async def get_branch_timeline(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    await _verify_branch_access(branch_id, db, current_user)
    
    from app.audit.models import AuditLog
    logs_res = await db.execute(
        select(AuditLog)
        .where(AuditLog.parent_organization_id == current_user.parent_organization_id)
        .where(AuditLog.org_id == branch_id)
        .order_by(AuditLog.created_at.desc())
        .limit(20)
    )
    logs = logs_res.scalars().all()
    
    # If no logs matching the branch explicitly, fallback to token creation logs as timeline
    if not logs:
        t_res = await db.execute(select(Token).where(Token.org_id == branch_id).order_by(Token.created_at.desc()).limit(10))
        tokens = t_res.scalars().all()
        return [
            BranchActivityEvent(
                id=t.id,
                event_type="Token Generated",
                description=f"Token {t.token_number} generated for {t.customer_name or 'Walk-in'}",
                timestamp=t.created_at.isoformat(),
                user_name="System"
            ) for t in tokens
        ]
        
    results = []
    for log in logs:
        desc = str(log.details)
        parsed_details = log.details
        if isinstance(parsed_details, str):
            try:
                parsed_details = ast.literal_eval(parsed_details)
            except (ValueError, SyntaxError):
                pass
                
        if isinstance(parsed_details, dict):
            desc = parsed_details.get("reason") or parsed_details.get("action") or str(parsed_details)
            
        results.append(BranchActivityEvent(
            id=log.id,
            event_type=log.event_type.replace("_", " ").title(),
            description=desc,
            timestamp=log.created_at.isoformat(),
            user_name="User"
        ))
    return results

@router.get("/operations/{branch_id}/alerts", response_model=List[BranchAlert])
async def get_branch_alerts(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    branch = await _verify_branch_access(branch_id, db, current_user)
    
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()
    
    alerts = []
    
    if not branch.is_active:
        alerts.append(BranchAlert(id=uuid.uuid4(), issue="Branch is marked as Inactive", severity="Critical", timestamp=datetime.now(timezone.utc).isoformat()))
        
    # Queue Overflow Alert (> 20 waiting)
    queue_wait_res = await db.execute(
        select(Queue.name, func.count(Token.id))
        .join(Token, Token.queue_id == Queue.id)
        .where(Queue.org_id == branch_id, Token.status == TokenStatus.waiting, func.date(Token.created_at) == today)
        .group_by(Queue.id)
    )
    for q_name, w_count in queue_wait_res.all():
        if w_count > 20:
            alerts.append(BranchAlert(id=uuid.uuid4(), issue=f"Queue Overflow: '{q_name}' has {w_count} customers waiting", severity="Warning", timestamp=datetime.now(timezone.utc).isoformat()))

    # Staffing Alert (Customers waiting but no active staff)
    tot_wait_res = await db.execute(select(func.count(Token.id)).where(Token.org_id == branch_id, Token.status == TokenStatus.waiting, func.date(Token.created_at) == today))
    tot_waiting = tot_wait_res.scalar() or 0
    if tot_waiting > 0:
        staff_res = await db.execute(select(func.count(User.id)).where(User.org_id == branch_id, User.role == "staff", User.is_active == True))
        active_staff = staff_res.scalar() or 0
        if active_staff == 0:
            alerts.append(BranchAlert(id=uuid.uuid4(), issue=f"Staff Shortage: {tot_waiting} customers waiting with 0 active staff online", severity="High", timestamp=datetime.now(timezone.utc).isoformat()))

    # Wait Time Alert (> 25 mins)
    wait_time_res = await db.execute(
        select(func.avg(func.extract('epoch', Token.served_at - Token.created_at)))
        .where(Token.org_id == branch_id, func.date(Token.created_at) == today, Token.status == TokenStatus.serving)
    )
    avg_wait_sec = wait_time_res.scalar() or 0
    if avg_wait_sec > (25 * 60):
        alerts.append(BranchAlert(id=uuid.uuid4(), issue=f"High Wait Times: Average wait time is {int(avg_wait_sec // 60)} minutes", severity="Medium", timestamp=datetime.now(timezone.utc).isoformat()))
        
    from app.whatsapp.models import WhatsAppMessage
    wa_failed_res = await db.execute(select(func.count(WhatsAppMessage.id)).where(WhatsAppMessage.organization_id == branch_id, func.date(WhatsAppMessage.created_at) == today, WhatsAppMessage.status == "failed"))
    wa_failed = wa_failed_res.scalar() or 0
    if wa_failed > 0:
        alerts.append(BranchAlert(id=uuid.uuid4(), issue=f"{wa_failed} WhatsApp messages failed to deliver today", severity="Medium", timestamp=datetime.now(timezone.utc).isoformat()))

    return alerts

@router.get("/operations/{branch_id}/contact", response_model=BranchContactDetails)
async def get_branch_contact(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    branch = await _verify_branch_access(branch_id, db, current_user)
    
    return BranchContactDetails(
        address=branch.address,
        contact_phone=branch.phone_number
    )

@router.put("/operations/{branch_id}/contact", response_model=BranchContactDetails)
async def update_branch_contact(
    branch_id: uuid.UUID,
    payload: BranchContactDetailsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    branch = await _verify_branch_access(branch_id, db, current_user)
    
    if payload.address is not None:
        branch.address = payload.address
    if payload.contact_phone is not None:
        branch.phone_number = payload.contact_phone
        
    await db.commit()
    await db.refresh(branch)
    
    return BranchContactDetails(
        address=branch.address,
        contact_phone=branch.phone_number
    )


@router.get("/branches/{branch_id}/queues/distinct", response_model=List[str])
async def get_distinct_queues_for_branch(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    # Verify branch belongs to parent org
    query = select(Organization).where(
        Organization.id == branch_id,
        Organization.parent_organization_id == current_user.parent_organization_id
    )
    result = await db.execute(query)
    branch = result.scalar_one_or_none()
    
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
        
    # Get distinct queue names for this branch
    queue_query = select(Queue.name).where(Queue.org_id == branch_id).distinct()
    q_res = await db.execute(queue_query)
    queues = q_res.scalars().all()
    
    return queues

from app.api.v1.endpoints.organization_admin_monitoring import get_traffic_trend

@router.get("/operations/{branch_id}/dashboard", response_model=BranchDashboardResponse)
async def get_branch_dashboard(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    branch = await _verify_branch_access(branch_id, db, current_user)
    
    summary = await get_branch_summary(branch_id, db, current_user)
    performance = await get_branch_performance(branch_id, db, current_user)
    queues = await get_branch_queues(branch_id, db, current_user)
    sessions = await get_branch_sessions(branch_id, db, current_user)
    staff = await get_branch_staff(branch_id, db, current_user)
    admins = await get_branch_admins(branch_id, db, current_user)
    whatsapp = await get_branch_whatsapp(branch_id, db, current_user)
    health = await get_branch_health(branch_id, db, current_user)
    timeline = await get_branch_timeline(branch_id, db, current_user)
    alerts = await get_branch_alerts(branch_id, db, current_user)
    contact = await get_branch_contact(branch_id, db, current_user)
    
    traffic_data = await get_traffic_trend(db, current_user, branch_id)
    traffic = BranchTrafficData(
        peak_traffic=[PeakTrafficItem(
            hour=item["time_block"],
            customers_arrived=item["customers_arrived"]
        ) for item in traffic_data.get("peak_traffic", [])],
        peak_hour=traffic_data.get("peak_hour")
    )
    
    return BranchDashboardResponse(
        summary=summary,
        performance=performance,
        queues=queues,
        sessions=sessions,
        staff=staff,
        admins=admins,
        whatsapp=whatsapp,
        health=health,
        timeline=timeline,
        alerts=alerts,
        contact=contact,
        traffic=traffic
    )
