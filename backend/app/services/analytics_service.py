"""
app/services/analytics_service.py
Service for fetching overview statistics and graphs.
"""
import uuid
from typing import Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.token import Token, TokenStatus

async def get_overview_metrics(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = None,
    queue_id: Optional[uuid.UUID] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    recent_limit: int = 5,
    recent_offset: int = 0,
) -> dict:
    """Fetch aggregated metrics for the dashboard."""
    from dateutil.parser import parse as parse_date
    
    # Base conditions
    conditions = [Token.org_id == org_id]
    
    from app.models.queue import Queue
    
    if queue_id:
        conditions.append(Token.queue_id == queue_id)
        
    if start_date:
        try:
            conditions.append(Token.created_at >= parse_date(start_date))
        except Exception:
            pass
            
    if end_date:
        try:
            ed = parse_date(end_date)
            if ed.hour == 0 and ed.minute == 0 and ed.second == 0:
                ed = ed.replace(hour=23, minute=59, second=59, microsecond=999999)
            conditions.append(Token.created_at <= ed)
        except Exception:
            pass
    
    # If session_id (date session) is provided, we must join with Queue or filter by a session_id on Token
    # Current Token.session_id stores the rotating token_session_id, so we join to filter by date session.
    join_queue = False
    if session_id:
        join_queue = True
        conditions.append(Queue.session_id == session_id)

    # Filter out deleted tokens from most metrics
    active_conditions = conditions.copy()
    from app.models.token import TokenStatus
    active_conditions.append(Token.status != TokenStatus.deleted)

    # 1. Status Counts
    count_query = select(Token.status, func.count(Token.id)).where(and_(*conditions)).group_by(Token.status)
    if join_queue:
        count_query = count_query.join(Queue, Token.queue_id == Queue.id)
    
    count_result = await db.execute(count_query)
    
    counts = {s.value: 0 for s in TokenStatus}
    for row in count_result.all():
        counts[row[0].value] = row[1]
        
    # Total visits should NOT include deleted tokens
    total_visits = counts[TokenStatus.waiting.value] + counts[TokenStatus.serving.value] + \
                   counts[TokenStatus.done.value] + counts[TokenStatus.skipped.value]
    
    served_visits = counts[TokenStatus.done.value]
    cancelled_visits = counts[TokenStatus.skipped.value] + counts[TokenStatus.deleted.value]
    waiting_visits = counts[TokenStatus.waiting.value]

    # 2. Timing Aggregations - Exclude deleted
    timing_query = select(
        func.avg(func.extract('epoch', Token.served_at - Token.created_at)).label('avg_wait_sec'),
        func.max(func.extract('epoch', Token.served_at - Token.created_at)).label('max_wait_sec'),
        func.avg(func.extract('epoch', Token.completed_at - Token.served_at)).label('avg_serve_sec'),
        func.max(func.extract('epoch', Token.completed_at - Token.served_at)).label('max_serve_sec'),
    ).where(and_(*active_conditions))
    
    if join_queue:
        timing_query = timing_query.join(Queue, Token.queue_id == Queue.id)

    timing_res = await db.execute(timing_query)
    row = timing_res.first()
    
    def format_time(seconds: float | None) -> str:
        if not seconds:
            return "00:00:00"
        m, s = divmod(int(seconds), 60)
        h, m = divmod(m, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"

    # 3. Hourly Chart (Visits by hour) - Exclude deleted
    hourly_query = select(
        func.extract('hour', func.timezone('Asia/Kolkata', Token.created_at)).label('hr'),
        func.count(Token.id)
    ).where(and_(*active_conditions)).group_by('hr').order_by('hr')
    
    if join_queue:
        hourly_query = hourly_query.join(Queue, Token.queue_id == Queue.id)

    hourly_res = await db.execute(hourly_query)
    hourly_data = [{"hour": f"{int(row[0]):02d}:00", "visits": row[1]} for row in hourly_res.all()]

    # 4. Monthly Chart - Exclude deleted
    monthly_query = select(
        func.extract('month', func.timezone('Asia/Kolkata', Token.created_at)).label('mon'),
        func.extract('year', func.timezone('Asia/Kolkata', Token.created_at)).label('yr'),
        func.count(Token.id)
    ).where(and_(*active_conditions)).group_by('yr', 'mon').order_by('yr', 'mon')
    
    if join_queue:
        monthly_query = monthly_query.join(Queue, Token.queue_id == Queue.id)

    monthly_res = await db.execute(monthly_query)
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_data = [{"month": f"{months[int(row[0])-1]} {int(row[1])}", "visits": row[2]} for row in monthly_res.all()]

    # 5. Daily Timings Chart - Exclude deleted
    daily_timings_query = select(
        func.date(func.timezone('Asia/Kolkata', Token.created_at)).label('dt'),
        func.avg(func.extract('epoch', Token.served_at - Token.created_at)).label('avg_wait'),
        func.avg(func.extract('epoch', Token.completed_at - Token.served_at)).label('avg_serve'),
    ).where(and_(*active_conditions)).group_by('dt').order_by('dt')
    
    if join_queue:
        daily_timings_query = daily_timings_query.join(Queue, Token.queue_id == Queue.id)

    daily_timings_res = await db.execute(daily_timings_query)
    daily_timings_data = [
        {
            "date": row.dt.isoformat() if row.dt else "",
            "avg_wait": float(row.avg_wait) if row.avg_wait else 0,
            "avg_serve": float(row.avg_serve) if row.avg_serve else 0,
        }
        for row in daily_timings_res.all()
    ]

    # 6. Staff Performance - completed/served tokens by user
    from app.models.user import User
    staff_perf_query = select(
        User.id,
        User.first_name,
        User.last_name,
        User.email,
        func.count(Token.id).label('total_served'),
        func.avg(func.extract('epoch', Token.completed_at - Token.served_at)).label('avg_serve'),
    ).join(
        User, Token.served_by_id == User.id
    ).where(
        and_(*active_conditions, Token.status == TokenStatus.done)
    ).group_by(User.id).order_by(func.count(Token.id).desc())
    
    if join_queue:
        staff_perf_query = staff_perf_query.join(Queue, Token.queue_id == Queue.id)

    staff_perf_res = await db.execute(staff_perf_query)
    staff_performance_data = [
        {
            "staff_id": str(row.id),
            "name": f"{row.first_name} {row.last_name}".strip() if row.first_name else row.email.split('@')[0],
            "total_served": row.total_served,
            "avg_serve": float(row.avg_serve) if row.avg_serve else 0,
        }
        for row in staff_perf_res.all()
    ]

    # 7. Recent Activity (for show last details request)
    recent_query = select(
        Token.token_number,
        Token.status,
        Token.created_at,
        Token.served_at,
        Token.completed_at,
        Token.customer_name,
        Queue.name.label('queue_name')
    ).join(Queue, Token.queue_id == Queue.id).where(
        and_(*active_conditions)
    ).order_by(Token.created_at.desc()).limit(recent_limit).offset(recent_offset)
    
    # No special join needed for recent_activity as it already joins Queue

    recent_res = await db.execute(recent_query)
    recent_activity = [
        {
            "number": r.token_number,
            "status": r.status.value,
            "queue": r.queue_name,
            "customer_name": r.customer_name or "Walk-in",
            "time": r.created_at.isoformat(),
            "served_at": r.served_at.isoformat() if r.served_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in recent_res.all()
    ]

    return {
        "status_counts": {
            "total": total_visits,
            "served": served_visits,
            "cancelled": cancelled_visits,
            "waiting": waiting_visits,
        },
        "timings": {
            "avg_waiting_time": format_time(row.avg_wait_sec),
            "max_waiting_time": format_time(row.max_wait_sec),
            "avg_served_time": format_time(row.avg_serve_sec),
            "max_served_time": format_time(row.max_serve_sec),
        },
        "charts": {
            "hourly": hourly_data,
            "monthly": monthly_data,
        },
        "daily_timings": daily_timings_data,
        "staff_performance": staff_performance_data,
        "recent_activity": recent_activity
    }

async def get_history_details(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = None,
    queue_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """Fetch detailed token history with pagination and filters."""
    from app.models.queue import Queue
    from sqlalchemy import or_, cast, String
    
    conditions = [Token.org_id == org_id, Token.status != TokenStatus.deleted]
    if queue_id:
        conditions.append(Token.queue_id == queue_id)
    if status:
        conditions.append(Token.status == status)
    
    if search:
        search_term = f"%{search.lower()}%"
        conditions.append(or_(
            func.lower(Token.customer_name).like(search_term),
            Token.customer_phone.like(search_term),
            cast(Token.token_number, String).like(search_term)
        ))
    
    join_queue = False
    if session_id:
        join_queue = True
        conditions.append(Queue.session_id == session_id)

    query = select(
        Token,
        Queue.name.label('queue_name'),
        Queue.prefix.label('queue_prefix')
    ).join(Queue, Token.queue_id == Queue.id).where(
        and_(*conditions)
    ).order_by(Token.created_at.desc())

    # Count total for pagination
    count_query = select(func.count(Token.id)).where(and_(*conditions))
    if join_queue:
        count_query = count_query.join(Queue, Token.queue_id == Queue.id)
    
    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    # Apply pagination
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    
    items = []
    for row in result.all():
        token, q_name, q_prefix = row
        items.append({
            "id": str(token.id),
            "token_number": token.token_number,
            "queue_name": q_name,
            "queue_prefix": q_prefix,
            "status": token.status.value,
            "customer_name": token.customer_name,
            "customer_phone": token.customer_phone,
            "customer_age": token.customer_age,
            "companion_names": token.companion_names if hasattr(token, 'companion_names') else [],
            "created_at": token.created_at.isoformat(),
            "served_at": token.served_at.isoformat() if token.served_at else None,
            "completed_at": token.completed_at.isoformat() if token.completed_at else None,
        })

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset
    }

async def get_analytics_csv_data(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    queue_id: Optional[uuid.UUID] = None,
    session_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> str:
    """Generate a CSV report of all queue interactions within the date range."""
    import csv
    import io
    from dateutil.parser import parse as parse_date
    from sqlalchemy import and_
    from app.models.queue import Queue
    from app.models.user import User

    conditions = [Token.org_id == org_id, Token.status != TokenStatus.deleted]
    if queue_id:
        conditions.append(Token.queue_id == queue_id)
    if status:
        conditions.append(Token.status == status)
        
    if search:
        from sqlalchemy import or_, cast, String
        search_term = f"%{search.lower()}%"
        conditions.append(or_(
            func.lower(Token.customer_name).like(search_term),
            Token.customer_phone.like(search_term),
            cast(Token.token_number, String).like(search_term)
        ))

    join_queue = False
    if session_id:
        join_queue = True
        conditions.append(Queue.session_id == session_id)

    if start_date:
        try:
            conditions.append(Token.created_at >= parse_date(start_date))
        except Exception:
            pass
            
    if end_date:
        try:
            ed = parse_date(end_date)
            if ed.hour == 0 and ed.minute == 0 and ed.second == 0:
                ed = ed.replace(hour=23, minute=59, second=59, microsecond=999999)
            conditions.append(Token.created_at <= ed)
        except Exception:
            pass

    query = select(
        Token,
        Queue.name.label('queue_name'),
        User.first_name,
        User.last_name,
        User.email
    ).outerjoin(Queue, Token.queue_id == Queue.id)\
     .outerjoin(User, Token.served_by_id == User.id)\
     .where(and_(*conditions))\
     .order_by(Token.created_at.desc())

    result = await db.execute(query)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Token Number", "Queue", "Customer Name", "Customer Phone", 
        "Status", "Created At", "Served At", "Completed At", 
        "Wait Time (mins)", "Serve Time (mins)", "Served By"
    ])

    for row in result.all():
        token, q_name, f_name, l_name, u_email = row
        
        wait_time_mins = ""
        if token.served_at and token.created_at:
            wait_time_mins = round((token.served_at - token.created_at).total_seconds() / 60.0, 1)
            
        serve_time_mins = ""
        if token.completed_at and token.served_at:
            serve_time_mins = round((token.completed_at - token.served_at).total_seconds() / 60.0, 1)

        served_by = ""
        if f_name or l_name:
            served_by = f"{f_name or ''} {l_name or ''}".strip()
        elif u_email:
            served_by = u_email.split('@')[0]

        writer.writerow([
            token.created_at.strftime("%Y-%m-%d"),
            token.token_number,
            q_name or "Unknown",
            token.customer_name or "Walk-in",
            token.customer_phone or "",
            token.status.value,
            token.created_at.isoformat(),
            token.served_at.isoformat() if token.served_at else "",
            token.completed_at.isoformat() if token.completed_at else "",
            wait_time_mins,
            serve_time_mins,
            served_by
        ])

    return output.getvalue()
