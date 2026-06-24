import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta, timezone

from sqlalchemy import select, func, and_, case, extract, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.organization import Organization
from app.models.token import Token, TokenStatus
from app.models.queue import Queue
from app.models.session import Session
from app.models.user import User

async def get_cross_branch_analytics(
    db: AsyncSession,
    parent_org_id: uuid.UUID,
    branch_id: Optional[uuid.UUID] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> dict:
    from dateutil.parser import parse as parse_date
    from zoneinfo import ZoneInfo
    
    tz = ZoneInfo("Asia/Kolkata")
    
    # 1. Resolve branch filters
    org_query = select(Organization.id, Organization.name, Organization.is_active).where(Organization.parent_organization_id == parent_org_id)
    if branch_id:
        org_query = org_query.where(Organization.id == branch_id)
        
    org_res = await db.execute(org_query)
    org_rows = org_res.all()
    org_ids = [r.id for r in org_rows]
    org_map = {r.id: {"name": r.name, "is_active": r.is_active} for r in org_rows}
    
    if not org_ids:
        # Return empty shell
        return {}

    # 2. Date filters
    token_conditions = [Token.org_id.in_(org_ids), Token.status != TokenStatus.deleted]
    
    if start_date:
        try:
            dt = parse_date(start_date)
            if dt.tzinfo is None: dt = dt.replace(tzinfo=tz)
            else: dt = dt.astimezone(tz)
            token_conditions.append(Token.created_at >= dt.astimezone(ZoneInfo("UTC")).replace(tzinfo=None))
        except: pass
    if end_date:
        try:
            ed = parse_date(end_date)
            if ed.tzinfo is None: ed = ed.replace(tzinfo=tz)
            else: ed = ed.astimezone(tz)
            if ed.hour == 0 and ed.minute == 0 and ed.second == 0:
                ed = ed.replace(hour=23, minute=59, second=59, microsecond=999999)
            token_conditions.append(Token.created_at <= ed.astimezone(ZoneInfo("UTC")).replace(tzinfo=None))
        except: pass

    # 3. Base Query for Customer & Time Metrics
    metrics_q = select(
        func.count(Token.id).label("total_customers"),
        func.sum(case((Token.status == TokenStatus.done, 1), else_=0)).label("served"),
        func.sum(case((Token.status == TokenStatus.waiting, 1), else_=0)).label("waiting"),
        func.avg(func.extract('epoch', Token.served_at - Token.created_at)).label('avg_wait_sec'),
        func.avg(func.extract('epoch', Token.completed_at - Token.served_at)).label('avg_serve_sec'),
    ).where(and_(*token_conditions))
    
    m_res = await db.execute(metrics_q)
    m_row = m_res.first()
    
    total_customers = m_row.total_customers or 0
    served = int(m_row.served or 0)
    waiting = int(m_row.waiting or 0)
    
    completion_rate = f"{round((served / total_customers * 100) if total_customers > 0 else 0, 1)}%"
    
    def format_time(seconds: float | None) -> str:
        if not seconds: return "00:00:00"
        m, s = divmod(int(seconds), 60)
        h, m = divmod(m, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"
        
    avg_wait = format_time(m_row.avg_wait_sec)
    avg_serve = format_time(m_row.avg_serve_sec)
    
    # 4. Operations Metrics (we query Queues and Sessions that belong to org_ids)
    q_res = await db.execute(select(func.count(Queue.id)).where(Queue.org_id.in_(org_ids), Queue.is_active == True))
    active_queues = q_res.scalar_one() or 0
    
    # Actually, sessions are active if they are today, but let's just count active queues and total active branches.
    active_branches = sum(1 for o in org_map.values() if o["is_active"])
    
    today = datetime.now(timezone.utc).date()
    s_res = await db.execute(select(func.count(Session.id)).where(Session.org_id.in_(org_ids), Session.session_date == today))
    active_sessions = s_res.scalar_one() or 0
    
    # 5. Volume Trend (Daily)
    trend_q = select(
        func.date(func.timezone('Asia/Kolkata', Token.created_at)).label('dt'),
        func.count(Token.id).label("served")
    ).where(and_(*token_conditions, Token.status == TokenStatus.done)).group_by('dt').order_by('dt')
    
    trend_res = await db.execute(trend_q)
    volume_trend = [{"date": r.dt.isoformat(), "customers_served": r.served} for r in trend_res.all()]
    
    # 6. Branch Ranking
    branch_q = select(
        Token.org_id,
        func.count(Token.id).label("total"),
        func.sum(case((Token.status == TokenStatus.done, 1), else_=0)).label("served"),
        func.avg(func.extract('epoch', Token.served_at - Token.created_at)).label('avg_wait_sec'),
        func.avg(func.extract('epoch', Token.completed_at - Token.served_at)).label('avg_serve_sec'),
    ).where(and_(*token_conditions)).group_by(Token.org_id).order_by(func.count(Token.id).desc())
    
    branch_res = await db.execute(branch_q)
    
    branch_ranking = []
    rank = 1
    for r in branch_res.all():
        b_total = r.total or 0
        b_served = int(r.served or 0)
        cr = (b_served / b_total * 100) if b_total > 0 else 0
        
        # Health score: 60% completion rate, 40% wait time (inverse, assuming < 30m is good)
        wt = r.avg_wait_sec or 0
        wt_score = max(0, 100 - (wt / 1800 * 100)) # 30 mins = 0 score
        health = int((cr * 0.6) + (wt_score * 0.4))
        
        h_status = "Excellent" if health >= 95 else "Good" if health >= 80 else "Warning" if health >= 60 else "Critical"
        
        branch_ranking.append({
            "rank": rank,
            "branch": org_map[r.org_id]["name"],
            "customers_served": b_served,
            "avg_wait_time": format_time(r.avg_wait_sec),
            "avg_service_time": format_time(r.avg_serve_sec),
            "completion_rate": f"{round(cr, 1)}%",
            "health_score": health,
            "health_status": h_status
        })
        rank += 1
        
    # 7. Queue Analytics
    queue_q = select(
        Queue.name,
        Token.org_id,
        func.count(Token.id).label("served"),
        func.avg(func.extract('epoch', Token.served_at - Token.created_at)).label('avg_wait_sec'),
        func.avg(func.extract('epoch', Token.completed_at - Token.served_at)).label('avg_serve_sec'),
    ).join(Queue, Token.queue_id == Queue.id).where(and_(*token_conditions, Token.status == TokenStatus.done)).group_by(Queue.id, Token.org_id).order_by(func.count(Token.id).desc()).limit(10)
    
    queue_res = await db.execute(queue_q)
    queue_analytics = []
    for r in queue_res.all():
        queue_analytics.append({
            "queue_name": r.name,
            "branch": org_map[r.org_id]["name"],
            "customers_served": r.served,
            "avg_wait_time": format_time(r.avg_wait_sec),
            "avg_service_time": format_time(r.avg_serve_sec)
        })
        
    # 8. Peak Traffic (Hourly distribution)
    peak_q = select(
        func.extract('hour', func.timezone('Asia/Kolkata', Token.created_at)).label('hr'),
        func.count(Token.id).label("arrived"),
        func.sum(case((Token.status == TokenStatus.done, 1), else_=0)).label("served"),
    ).where(and_(*token_conditions)).group_by('hr').order_by('hr')
    
    peak_res = await db.execute(peak_q)
    peak_traffic = []
    max_arrived = 0
    peak_hr = None
    
    rows = peak_res.all()
    for r in rows:
        if r.arrived > max_arrived:
            max_arrived = r.arrived
            peak_hr = r.hr
            
    # Format peak hour for TimeMetrics
    formatted_peak = "-"
    if peak_hr is not None:
        hr_int = int(peak_hr)
        ampm = "AM" if hr_int < 12 else "PM"
        display_hr = hr_int if hr_int <= 12 else hr_int - 12
        if display_hr == 0: display_hr = 12
        formatted_peak = f"{display_hr}:00 {ampm} - {display_hr}:59 {ampm}"
        
    for r in rows:
        hr_int = int(r.hr)
        ampm = "AM" if hr_int < 12 else "PM"
        display_hr = hr_int if hr_int <= 12 else hr_int - 12
        if display_hr == 0: display_hr = 12
        
        peak_traffic.append({
            "time_block": f"{display_hr}:00 {ampm}",
            "customers_arrived": r.arrived,
            "customers_served": int(r.served or 0),
            "is_peak": (r.hr == peak_hr)
        })
        
    # 9. Staff Performance
    staff_q = select(
        User.first_name, User.last_name, User.email,
        Token.org_id,
        func.count(Token.id).label("served"),
        func.avg(func.extract('epoch', Token.completed_at - Token.served_at)).label('avg_serve_sec'),
    ).join(User, Token.served_by_id == User.id).where(and_(*token_conditions, Token.status == TokenStatus.done)).group_by(User.id, Token.org_id).order_by(func.count(Token.id).desc()).limit(10)
    
    staff_res = await db.execute(staff_q)
    staff_performance = []
    for r in staff_res.all():
        name = f"{r.first_name or ''} {r.last_name or ''}".strip()
        if not name: name = r.email.split('@')[0]
        staff_performance.append({
            "staff_name": name,
            "branch": org_map[r.org_id]["name"],
            "customers_served": r.served,
            "avg_service_time": format_time(r.avg_serve_sec)
        })
        
    # 10. Generate Insights
    insights = []
    if branch_ranking:
        top_branch = branch_ranking[0]
        insights.append(f"{top_branch['branch']} is the top-performing branch, serving {top_branch['customers_served']} customers with a {top_branch['completion_rate']} completion rate.")
    if peak_traffic and formatted_peak != "-":
        insights.append(f"Peak traffic occurs around {formatted_peak}, with {max_arrived} customers arriving.")
    if queue_analytics:
        top_queue = queue_analytics[0]
        insights.append(f"The '{top_queue['queue_name']}' queue at {top_queue['branch']} handled the highest volume ({top_queue['customers_served']} customers).")

    return {
        "customer_metrics": {
            "total_customers": total_customers,
            "customers_served": served,
            "customers_waiting": waiting,
            "completion_rate": completion_rate
        },
        "time_metrics": {
            "avg_wait_time": avg_wait,
            "avg_service_time": avg_serve,
            "peak_hour": formatted_peak
        },
        "operations_metrics": {
            "active_branches": active_branches,
            "active_sessions": active_sessions,
            "active_queues": active_queues
        },
        "volume_trend": volume_trend,
        "branch_ranking": branch_ranking,
        "queue_analytics": queue_analytics,
        "peak_traffic": peak_traffic,
        "staff_performance": staff_performance,
        "insights": insights
    }
