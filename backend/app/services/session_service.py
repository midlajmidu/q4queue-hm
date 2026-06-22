"""
app/services/session_service.py
Session (date-based) management business logic.

All methods receive org_id from the authenticated JWT — never from request body.
"""
import logging
import uuid
from datetime import date
from typing import Optional

from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Session
from app.models.queue import Queue
from app.models.token import Token, TokenStatus
from app.models.organization import Organization
from app.schemas.session import SessionCreate, SessionResponse
from app.schemas.queue import QueueCreate

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Session CRUD
# ─────────────────────────────────────────────────────────────────────────────

async def create_session(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    data: SessionCreate,
) -> SessionResponse:
    """Create a new session (one per date per org)."""
    # ── Limit validation ──
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if org:
        current_sessions_count = await db.scalar(select(func.count(Session.id)).where(Session.org_id == org_id)) or 0
        if current_sessions_count >= org.max_sessions:
            raise ValueError(
                f"Organization session limit reached ({org.max_sessions}). "
                f"You have already created the maximum number of sessions allowed for your account. "
                f"Please delete old sessions to free up space or contact support to upgrade your plan."
            )

    # ── Future date validation ──
    if data.session_date > date.today():
        raise ValueError("Cannot create sessions for future dates.")

    session = Session(
        org_id=org_id,
        session_date=data.session_date,
        title=data.title,
    )
    db.add(session)
    try:
        await db.commit()
        await db.refresh(session)
    except Exception as exc:
        await db.rollback()
        raise ValueError(
            f"A session already exists for {data.session_date}. "
            f"Each organization can only have one active session per day. "
            f"Please manage the existing session or choose a different date."
        ) from exc

    logger.info("Session created | id=%s org=%s date=%s", session.id, org_id, session.session_date)
    return SessionResponse(
        id=session.id,
        org_id=session.org_id,
        session_date=session.session_date,
        title=session.title,
        created_at=session.created_at,
        queue_count=0,
    )


async def list_sessions(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
    session_date: Optional[date] = None,
) -> dict:
    """List all sessions for an org, newest first, with queue counts and real stats."""
    # Subquery: count queues and collect names per session
    queue_agg_sq = (
        select(
            Queue.session_id, 
            func.count(Queue.id).label("queue_count"),
            func.array_agg(Queue.name).label("queue_names")
        )
        .where(Queue.org_id == org_id)
        .group_by(Queue.session_id)
        .subquery()
    )

    # Subquery: token stats per session (via queue)
    token_agg_sq = (
        select(
            Queue.session_id.label("session_id"),
            func.sum(case((Token.status == TokenStatus.done, 1), else_=0)).label("total_served"),
            func.count(Token.id).label("total_issued"),
        )
        .select_from(Queue)
        .join(Token, Token.queue_id == Queue.id)
        .where(Queue.org_id == org_id)
        .group_by(Queue.session_id)
        .subquery()
    )

    # Get total count
    count_query = select(func.count(Session.id)).where(Session.org_id == org_id)
    if session_date:
        count_query = count_query.where(Session.session_date == session_date)
    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    # Apply pagination and filter
    base_query = select(
        Session, 
        func.coalesce(queue_agg_sq.c.queue_count, 0).label("queue_count"),
        queue_agg_sq.c.queue_names.label("queue_names"),
        func.coalesce(token_agg_sq.c.total_served, 0).label("total_served"),
        func.coalesce(token_agg_sq.c.total_issued, 0).label("total_issued"),
    )
    base_query = base_query.outerjoin(queue_agg_sq, queue_agg_sq.c.session_id == Session.id)
    base_query = base_query.outerjoin(token_agg_sq, token_agg_sq.c.session_id == Session.id)
    base_query = base_query.where(Session.org_id == org_id)
    if session_date:
        base_query = base_query.where(Session.session_date == session_date)
    base_query = base_query.order_by(Session.session_date.desc())
    base_query = base_query.limit(limit).offset(offset)

    result = await db.execute(base_query)
    rows = result.all()
    
    items = [
        SessionResponse(
            id=row.Session.id,
            org_id=row.Session.org_id,
            session_date=row.Session.session_date,
            title=row.Session.title,
            created_at=row.Session.created_at,
            queue_count=row.queue_count,
            queue_names=row.queue_names or [],
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
    org_id: uuid.UUID,
) -> Session:
    """Fetch a session scoped to org. Raises ValueError → 404."""
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.org_id == org_id,  # TENANT ISOLATION
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise ValueError(f"Session {session_id} not found")
    return session


async def delete_session(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    org_id: uuid.UUID,
) -> None:
    """Delete a session (cascades to queues and tokens)."""
    session = await get_session_or_404(db, session_id=session_id, org_id=org_id)
    await db.delete(session)
    await db.commit()
    logger.info("Session deleted | id=%s org=%s", session_id, org_id)


# ─────────────────────────────────────────────────────────────────────────────
# Session-scoped Queue CRUD
# ─────────────────────────────────────────────────────────────────────────────

async def list_session_queues(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    org_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
    name: Optional[str] = None,
) -> dict:
    """List all queues within a specific session (tenant-scoped)."""
    # Total count
    count_query = select(func.count(Queue.id)).where(
        Queue.session_id == session_id, Queue.org_id == org_id
    )
    if name:
        count_query = count_query.where(Queue.name.ilike(f"%{name}%"))
    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    # Paginated items
    select_query = select(Queue).where(Queue.session_id == session_id, Queue.org_id == org_id)
    if name:
        select_query = select_query.where(Queue.name.ilike(f"%{name}%"))
    
    result = await db.execute(
        select_query.order_by(Queue.created_at.desc()).limit(limit).offset(offset)
    )
    items = list(result.scalars().all())
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


async def create_session_queue(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    org_id: uuid.UUID,
    data: QueueCreate,
) -> Queue:
    """Create a queue scoped to a specific session."""
    # Verify session exists and belongs to org
    await get_session_or_404(db, session_id=session_id, org_id=org_id)

    # ── Limit validation ──
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if org:
        current_queues_count = await db.scalar(select(func.count(Queue.id)).where(Queue.session_id == session_id)) or 0
        if current_queues_count >= org.max_queues_per_session:
            raise ValueError(f"Session limit reached: maximum {org.max_queues_per_session} queues allowed per session.")

    # ── Prefix validation ──
    if data.prefix:
        existing_prefix = await db.scalar(
            select(Queue.id).where(
                Queue.session_id == session_id, 
                func.upper(Queue.prefix) == data.prefix.upper()
            )
        )
        if existing_prefix:
            raise ValueError(f"prefix '{data.prefix.upper()}' is already there today")

    queue = Queue(
        org_id=org_id,
        session_id=session_id,
        name=data.name,
        prefix=data.prefix,
        starting_sequence=data.starting_sequence,
        current_token_number=data.starting_sequence - 1,
    )
    db.add(queue)
    try:
        await db.commit()
        await db.refresh(queue)
    except Exception as exc:
        await db.rollback()
        raise ValueError(f"A queue named '{data.name}' already exists in this session") from exc

    logger.info(
        "Queue created in session | id=%s session=%s org=%s name=%r",
        queue.id, session_id, org_id, queue.name,
    )
    return queue
