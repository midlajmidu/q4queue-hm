"""
app/services/session_service.py
Session (date-based) management business logic.

All methods receive org_id from the authenticated JWT — never from request body.
"""
import logging
import uuid
from datetime import date, datetime
from zoneinfo import ZoneInfo
from typing import Optional

from sqlalchemy import func, select, case, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Session
from app.models.queue import Queue
from app.models.token import Token, TokenStatus
from app.models.organization import Organization
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from app.schemas.queue import QueueCreate

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Session CRUD
# ─────────────────────────────────────────────────────────────────────────────

async def get_or_create_active_session(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
) -> Session:
    """Fetch or create active session for the queue. Never auto-ends until staff explicitly ends it."""
    from app.services.queue_service import get_queue_or_404
    from app.core.tz_helpers import queue_business_date, safe_zoneinfo
    
    from app.models.organization import Organization
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    tz_str = org.timezone if org and org.timezone else "Asia/Kolkata"
    local_now = datetime.now(safe_zoneinfo(tz_str))
    queue_obj = await db.scalar(select(Queue).where(Queue.id == queue_id))
    today = queue_business_date(
        local_now,
        queue_obj.open_time if queue_obj else None,
        queue_obj.close_time if queue_obj else None,
    )

    # 1. If queue currently points to an active session, keep it open and return it!
    if queue_obj and queue_obj.token_session_id:
        current_session = await db.get(Session, queue_obj.token_session_id)
        if current_session and current_session.is_active:
            return current_session

    # 2. Check if any active session exists for this queue
    active_session = await db.scalar(
        select(Session).where(Session.queue_id == queue_id, Session.is_active == True)
    )
    if active_session:
        queue = await get_queue_or_404(db, queue_id=queue_id, org_id=org_id)
        queue.token_session_id = active_session.id
        await db.commit()
        return active_session

    # 3. Check if a session exists for today
    query = select(Session).where(
        Session.queue_id == queue_id, 
        Session.session_date == today
    )
    session = await db.scalar(query)
    queue = await get_queue_or_404(db, queue_id=queue_id, org_id=org_id)

    if session:
        queue.token_session_id = session.id
        session.is_active = True
        session.is_paused = False
        await db.execute(
            update(Session)
            .where(Session.queue_id == queue_id, Session.id != session.id, Session.is_active == True)
            .values(is_active=False, is_paused=False)
        )
        await db.commit()
        return session

    from app.services.entitlement_service import consume
    await consume(
        db,
        org_id=org_id,
        key="sessions.created.max",
        scope_type="subscription",
        scope_id=org_id,
    )
    
    # 4. Create new active session
    session = Session(
        org_id=org_id,
        queue_id=queue_id,
        session_date=today,
        title=today.strftime("%Y-%m-%d"),
        is_active=True,
    )
    db.add(session)
    await db.flush()

    await db.execute(
        update(Session)
        .where(Session.queue_id == queue_id, Session.id != session.id, Session.is_active == True)
        .values(is_active=False, is_paused=False)
    )
    
    queue.token_session_id = session.id
    queue.current_token_number = queue.starting_sequence - 1
    queue.total_served = 0
    
    try:
        await db.commit()
        await db.refresh(session)
    except Exception as exc:
        await db.rollback()
        # Concurrency fallback: someone else created it
        session = await db.scalar(query)
        if session:
            return session
        raise ValueError("Failed to create active session") from exc

    logger.info("Active session auto-created | queue=%s date=%s", queue_id, today)
    return session


async def create_queue_session(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    data: SessionCreate,
) -> Session:
    """Create a session for a queue. No artificial date or timing restrictions."""
    from app.services.queue_service import get_queue_or_404
    queue = await get_queue_or_404(db, queue_id=queue_id, org_id=org_id)
    
    session_title = data.title.strip() if data.title and data.title.strip() else data.session_date.strftime("%Y-%m-%d")

    existing = await db.scalar(
        select(Session).where(
            Session.queue_id == queue_id,
            Session.session_date == data.session_date,
        )
    )
    if existing:
        # Re-activate and update title of existing session for this date
        existing.title = session_title
        existing.is_active = True
        existing.is_paused = False
        queue.token_session_id = existing.id
        await db.execute(
            update(Session)
            .where(Session.queue_id == queue_id, Session.id != existing.id, Session.is_active == True)
            .values(is_active=False, is_paused=False)
        )
        await db.commit()
        await db.refresh(existing)
        logger.info("Existing session re-activated | queue=%s date=%s title=%s", queue_id, data.session_date, session_title)
        return existing

    from app.services.entitlement_service import consume
    await consume(
        db,
        org_id=org_id,
        key="sessions.created.max",
        scope_type="subscription",
        scope_id=org_id,
    )

    session = Session(
        org_id=org_id,
        queue_id=queue_id,
        session_date=data.session_date,
        title=session_title,
        is_active=True,
    )
    db.add(session)
    await db.flush()

    await db.execute(
        update(Session)
        .where(Session.queue_id == queue_id, Session.id != session.id, Session.is_active == True)
        .values(is_active=False, is_paused=False)
    )
    queue.token_session_id = session.id
    queue.current_token_number = queue.starting_sequence - 1
    queue.total_served = 0

    try:
        await db.commit()
        await db.refresh(session)
    except Exception as exc:
        await db.rollback()
        raise ValueError("Failed to create session") from exc

    logger.info("Session created | queue=%s date=%s title=%s", queue_id, data.session_date, session_title)
    return session


async def list_sessions(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
    session_date: Optional[date] = None,
) -> dict:
    """List all sessions for a queue, newest first, with token stats."""
    # Verify queue
    from app.services.queue_service import get_queue_or_404
    await get_queue_or_404(db, queue_id=queue_id, org_id=org_id)

    # Tokens now have an authoritative session foreign key. Grouping by token
    # creation date misattributes late/manual imports and overnight queues.
    token_agg_sq = (
        select(
            Token.session_id.label("session_id"),
            func.sum(case((Token.status == TokenStatus.done, 1), else_=0)).label("total_served"),
            func.count(Token.id).label("total_issued"),
        )
        .where(Token.queue_id == queue_id)
        .group_by(Token.session_id)
        .subquery()
    )

    # Base query for sessions
    base_query = select(
        Session, 
        func.coalesce(token_agg_sq.c.total_served, 0).label("total_served"),
        func.coalesce(token_agg_sq.c.total_issued, 0).label("total_issued"),
    ).outerjoin(token_agg_sq, token_agg_sq.c.session_id == Session.id)
    
    base_query = base_query.where(Session.queue_id == queue_id)
    
    if session_date:
        base_query = base_query.where(Session.session_date == session_date)

    # Get total count with filter applied
    count_query = select(func.count(Session.id)).where(Session.queue_id == queue_id)
    if session_date:
        count_query = count_query.where(Session.session_date == session_date)
    total = await db.scalar(count_query)

    # Apply order and pagination
    base_query = base_query.order_by(Session.session_date.desc())
    base_query = base_query.limit(limit).offset(offset)

    result = await db.execute(base_query)
    rows = result.all()
    
    items = [
        SessionResponse(
            id=row.Session.id,
            org_id=row.Session.org_id,
            queue_id=row.Session.queue_id,
            session_date=row.Session.session_date,
            title=row.Session.title,
            is_active=getattr(row.Session, "is_active", True),
            is_paused=getattr(row.Session, "is_paused", False),
            created_at=row.Session.created_at,
            total_served=row.total_served,
            total_issued=row.total_issued,
        )
        for row in rows
    ]
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


async def get_session_or_404(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    org_id: Optional[uuid.UUID] = None,
    user: Optional[User] = None,
) -> Session:
    """Fetch a session scoped to org or user. Raises ValueError → 404."""
    from app.models.organization import Organization
    
    if user is not None:
        if user.role == "super_admin":
            query = select(Session).where(Session.id == session_id)
        elif user.role == "organization_admin":
            query = select(Session).join(Organization, Organization.id == Session.org_id).where(
                Session.id == session_id,
                Organization.parent_organization_id == user.parent_organization_id,
            )
        else:
            query = select(Session).where(
                Session.id == session_id,
                Session.org_id == user.org_id,
            )
    elif org_id is not None:
        query = select(Session).where(
            Session.id == session_id,
            Session.org_id == org_id,
        )
    else:
        query = select(Session).where(Session.id == session_id)

    result = await db.execute(query)
    session = result.scalar_one_or_none()
    if session is None:
        raise ValueError(f"Session {session_id} not found")
    return session

async def update_session(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    org_id: Optional[uuid.UUID] = None,
    user: Optional[User] = None,
    data: SessionUpdate,
) -> SessionResponse:
    """Update a session's properties."""
    session = await get_session_or_404(db, session_id=session_id, org_id=org_id, user=user)
    
    if data.title is not None:
        session.title = data.title
    await db.commit()
    await db.refresh(session)
    
    return SessionResponse(
        id=session.id,
        org_id=session.org_id,
        session_date=session.session_date,
        title=session.title,
        is_active=session.is_active,
        is_paused=session.is_paused,
        created_at=session.created_at,
        queue_id=session.queue_id,
    )

async def set_session_active(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    org_id: Optional[uuid.UUID] = None,
    user: Optional[User] = None,
    is_active: bool,
) -> Session:
    session = await get_session_or_404(db, session_id=session_id, org_id=org_id, user=user)
    queue = await db.scalar(select(Queue).where(Queue.id == session.queue_id, Queue.org_id == session.org_id))

    if is_active:
        session.is_active = True
        session.is_paused = False
        if queue:
            queue.token_session_id = session.id
            queue.is_paused = False
        await db.execute(
            update(Session)
            .where(Session.queue_id == session.queue_id, Session.id != session.id, Session.is_active == True)
            .values(is_active=False, is_paused=False)
        )
    else:
        session.is_active = False
        session.is_paused = False
        if queue and queue.token_session_id == session.id:
            queue.is_paused = False
        # Move remaining unserved tokens to skipped status when session is stopped
        await db.execute(
            update(Token)
            .where(
                Token.session_id == session_id,
                Token.status.in_([TokenStatus.waiting, TokenStatus.serving])
            )
            .values(
                status=TokenStatus.skipped,
                completed_at=func.now(),
                removed_by="session_end"
            )
        )
    await db.commit()
    await db.refresh(session)
    return session

async def set_session_paused(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    org_id: Optional[uuid.UUID] = None,
    user: Optional[User] = None,
    is_paused: bool,
) -> Session:
    session = await get_session_or_404(db, session_id=session_id, org_id=org_id, user=user)
    queue = await db.scalar(select(Queue).where(Queue.id == session.queue_id, Queue.org_id == session.org_id))
    if not session.is_active:
        raise ValueError("Cannot pause or resume an inactive session.")
    session.is_paused = is_paused
    if queue and queue.token_session_id == session.id:
        queue.is_paused = is_paused
    await db.commit()
    await db.refresh(session)
    return session


async def delete_session(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    org_id: Optional[uuid.UUID] = None,
    user: Optional[User] = None,
) -> None:
    """Permanently delete a non-current session and its token history."""
    session = await get_session_or_404(db, session_id=session_id, org_id=org_id, user=user)
    queue = await db.scalar(select(Queue).where(Queue.id == session.queue_id))
    if queue and queue.token_session_id == session.id:
        raise ValueError("The current session cannot be deleted. End it and create/select another session first.")
    await db.execute(Token.__table__.delete().where(Token.session_id == session.id))
    await db.delete(session)
    await db.commit()
    logger.info("Session deleted | id=%s", session_id)


# ─────────────────────────────────────────────────────────────────────────────
