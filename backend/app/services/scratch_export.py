import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.models.token import Token, TokenStatus
from app.models.queue import Queue
from app.models.user import User
from app.models.organization import Organization

async def get_cross_branch_csv_data(
    db: AsyncSession,
    org_ids: List[uuid.UUID],
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> str:
    import csv
    import io
    from dateutil.parser import parse as parse_date
    from zoneinfo import ZoneInfo

    tz = ZoneInfo("Asia/Kolkata")
    
    conditions = [Token.org_id.in_(org_ids), Token.status != TokenStatus.deleted]
    
    if start_date:
        try:
            dt = parse_date(start_date)
            if dt.tzinfo is None: dt = dt.replace(tzinfo=tz)
            else: dt = dt.astimezone(tz)
            conditions.append(Token.created_at >= dt.astimezone(ZoneInfo("UTC")).replace(tzinfo=None))
        except: pass
        
    if end_date:
        try:
            ed = parse_date(end_date)
            if ed.tzinfo is None: ed = ed.replace(tzinfo=tz)
            else: ed = ed.astimezone(tz)
            if ed.hour == 0 and ed.minute == 0 and ed.second == 0:
                ed = ed.replace(hour=23, minute=59, second=59, microsecond=999999)
            conditions.append(Token.created_at <= ed.astimezone(ZoneInfo("UTC")).replace(tzinfo=None))
        except: pass

    query = select(
        Token,
        Queue.name.label('queue_name'),
        Organization.name.label('branch_name'),
        User.first_name,
        User.last_name,
        User.email
    ).outerjoin(Queue, Token.queue_id == Queue.id)\
     .outerjoin(Organization, Token.org_id == Organization.id)\
     .outerjoin(User, Token.served_by_id == User.id)\
     .where(and_(*conditions))\
     .order_by(Token.created_at.desc())

    result = await db.execute(query)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Branch", "Token Number", "Queue", "Customer Name", "Customer Phone", 
        "Status", "Created At", "Served At", "Completed At", 
        "Wait Time (mins)", "Serve Time (mins)", "Served By", "Call Method"
    ])

    for row in result.all():
        token, q_name, b_name, f_name, l_name, u_email = row
        
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
            b_name or "Unknown",
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
            served_by,
            "Invite by Number" if token.called_via_invite else "Call Next"
        ])

    return output.getvalue()
