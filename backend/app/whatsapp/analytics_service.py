"""
app/whatsapp/analytics_service.py
WhatsApp usage analytics — all computed from live DB data.

No mock data. All stats are real-time aggregations.
"""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.whatsapp.models import WhatsAppMessage, WhatsAppDeliveryStatus, WhatsAppUsageStat
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)


# ── Global Stats ──────────────────────────────────────────────────────────────

async def get_global_stats(db: AsyncSession) -> dict:
    """
    Platform-wide WhatsApp stats.
    Returns totals across all orgs.
    """
    result = await db.execute(
        select(
            func.count(WhatsAppMessage.id).label("total"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.sent, 1))
            ).label("sent"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.delivered, 1))
            ).label("delivered"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))
            ).label("read"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))
            ).label("failed"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.pending, 1))
            ).label("pending"),
        )
    )
    row = result.one()

    total = row.total or 0
    delivered = (row.delivered or 0) + (row.read or 0)
    failed = row.failed or 0
    success_rate = round((delivered / total * 100), 1) if total > 0 else 0.0

    return {
        "total": total,
        "sent": row.sent or 0,
        "delivered": row.delivered or 0,
        "read": row.read or 0,
        "failed": failed,
        "pending": row.pending or 0,
        "success_rate": success_rate,
    }


async def get_daily_chart(db: AsyncSession, days: int = 30) -> list[dict]:
    """
    Messages per day for the last N days.
    Returns list of {date, sent, delivered, read, failed}.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(
            func.date(WhatsAppMessage.created_at).label("day"),
            func.count(WhatsAppMessage.id).label("total"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.delivered, 1))
            ).label("delivered"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))
            ).label("read"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))
            ).label("failed"),
        )
        .where(WhatsAppMessage.created_at >= cutoff)
        .group_by(func.date(WhatsAppMessage.created_at))
        .order_by(func.date(WhatsAppMessage.created_at))
    )

    rows = result.all()
    return [
        {
            "date": str(row.day),
            "total": row.total,
            "delivered": row.delivered,
            "read": row.read,
            "failed": row.failed,
        }
        for row in rows
    ]


async def get_stats_by_org(db: AsyncSession, limit: int = 20) -> list[dict]:
    """Top orgs by WhatsApp message volume."""
    result = await db.execute(
        select(
            WhatsAppMessage.organization_id,
            func.count(WhatsAppMessage.id).label("total"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.delivered, 1))
            ).label("delivered"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))
            ).label("read"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))
            ).label("failed"),
        )
        .group_by(WhatsAppMessage.organization_id)
        .order_by(func.count(WhatsAppMessage.id).desc())
        .limit(limit)
    )

    rows = result.all()

    # Fetch org names
    from app.models.organization import Organization
    org_ids = [row.organization_id for row in rows]
    org_result = await db.execute(
        select(Organization.id, Organization.name).where(Organization.id.in_(org_ids))
    )
    org_names = {row.id: row.name for row in org_result.all()}

    return [
        {
            "organization_id": str(row.organization_id),
            "org_name": org_names.get(row.organization_id, "Unknown"),
            "total": row.total,
            "delivered": row.delivered,
            "read": row.read,
            "failed": row.failed,
            "success_rate": (
                round(((row.delivered + row.read) / row.total * 100), 1)
                if row.total > 0 else 0.0
            ),
        }
        for row in rows
    ]


# ── Per-Org Stats ─────────────────────────────────────────────────────────────

async def get_org_stats(db: AsyncSession, organization_id: uuid.UUID) -> dict:
    """Per-org WhatsApp analytics."""
    result = await db.execute(
        select(
            func.count(WhatsAppMessage.id).label("total"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.delivered, 1))
            ).label("delivered"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))
            ).label("read"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))
            ).label("failed"),
        )
        .where(WhatsAppMessage.organization_id == organization_id)
    )
    row = result.one()
    total = row.total or 0
    delivered = (row.delivered or 0) + (row.read or 0)
    return {
        "total": total,
        "delivered": row.delivered or 0,
        "read": row.read or 0,
        "failed": row.failed or 0,
        "success_rate": round((delivered / total * 100), 1) if total > 0 else 0.0,
    }


async def get_org_messages(
    db: AsyncSession,
    organization_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    customer_phone: Optional[str] = None,
    customer_name: Optional[str] = None,
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    queue_id: Optional[uuid.UUID] = None,
    session_id: Optional[uuid.UUID] = None,
) -> tuple[list[WhatsAppMessage], int]:
    """Paginated message log for an org with filters."""
    query = select(WhatsAppMessage).where(WhatsAppMessage.organization_id == organization_id)
    
    if start_date:
        query = query.where(func.date(WhatsAppMessage.created_at) >= start_date)
    if end_date:
        query = query.where(func.date(WhatsAppMessage.created_at) <= end_date)
    if customer_phone:
        query = query.where(WhatsAppMessage.customer_phone.like(f"%{customer_phone}%"))
    if customer_name:
        query = query.where(WhatsAppMessage.customer_name.ilike(f"%{customer_name}%"))
    if status:
        query = query.where(WhatsAppMessage.status == status)
    if event_type:
        query = query.where(WhatsAppMessage.event_type == event_type)
    if queue_id:
        query = query.where(WhatsAppMessage.queue_id == queue_id)
    if session_id:
        query = query.where(WhatsAppMessage.session_id == session_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    result = await db.execute(
        query.order_by(WhatsAppMessage.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    messages = list(result.scalars().all())
    return messages, total


async def get_recent_messages(
    db: AsyncSession, 
    limit: int = 50,
    offset: int = 0,
    organization_id: Optional[uuid.UUID] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    customer_phone: Optional[str] = None,
    status: Optional[str] = None,
    message_type: Optional[str] = None,
    queue_id: Optional[uuid.UUID] = None,
) -> tuple[list[WhatsAppMessage], int]:
    """Recent messages across all orgs (super admin view) with filters."""
    query = select(WhatsAppMessage)
    
    if organization_id:
        query = query.where(WhatsAppMessage.organization_id == organization_id)
    if start_date:
        query = query.where(func.date(WhatsAppMessage.created_at) >= start_date)
    if end_date:
        query = query.where(func.date(WhatsAppMessage.created_at) <= end_date)
    if customer_phone:
        query = query.where(WhatsAppMessage.customer_phone.like(f"%{customer_phone}%"))
    if status:
        query = query.where(WhatsAppMessage.status == status)
    if message_type:
        query = query.where(WhatsAppMessage.message_type == message_type)
    if queue_id:
        query = query.where(WhatsAppMessage.queue_id == queue_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    result = await db.execute(
        query.order_by(WhatsAppMessage.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    messages = list(result.scalars().all())
    return messages, total


async def get_token_message_status(
    db: AsyncSession, token_id: uuid.UUID
) -> list[dict]:
    """
    All WhatsApp messages for a specific token (for queue monitoring icons).
    Returns list of {event_type, status, sent_at, ...}.
    """
    result = await db.execute(
        select(WhatsAppMessage)
        .where(WhatsAppMessage.token_id == token_id)
        .order_by(WhatsAppMessage.created_at.asc())
    )
    messages = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "event_type": m.event_type,
            "delivery_status": m.status,
            "sent_at": m.sent_at.isoformat() if m.sent_at else None,
            "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
            "read_at": m.read_at.isoformat() if m.read_at else None,
            "failed_at": m.failed_at.isoformat() if m.failed_at else None,
        }
        for m in messages
    ]


async def get_stats_by_event(db: AsyncSession, organization_id: uuid.UUID) -> list[dict]:
    """Return counts grouped by event_type for an organization."""
    result = await db.execute(
        select(
            WhatsAppMessage.event_type,
            func.count(WhatsAppMessage.id).label("total"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.delivered, 1))).label("delivered"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))).label("read"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))).label("failed"),
        )
        .where(WhatsAppMessage.organization_id == organization_id)
        .group_by(WhatsAppMessage.event_type)
        .order_by(func.count(WhatsAppMessage.id).desc())
    )
    rows = result.all()
    return [
        {
            "event_type": row.event_type,
            "total": row.total,
            "delivered": row.delivered,
            "read": row.read,
            "failed": row.failed,
            "success_rate": round(((row.delivered + row.read) / row.total * 100), 1) if row.total > 0 else 0.0,
        }
        for row in rows
    ]


async def get_stats_by_queue(db: AsyncSession, organization_id: uuid.UUID) -> list[dict]:
    """Return counts grouped by queue for an organization."""
    result = await db.execute(
        select(
            WhatsAppMessage.queue_id,
            func.count(WhatsAppMessage.id).label("total"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.delivered, 1))).label("delivered"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))).label("read"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))).label("failed"),
        )
        .where(WhatsAppMessage.organization_id == organization_id)
        .group_by(WhatsAppMessage.queue_id)
        .order_by(func.count(WhatsAppMessage.id).desc())
    )
    rows = result.all()
    
    # Fetch queue names
    queue_ids = [row.queue_id for row in rows if row.queue_id]
    queue_names = {}
    if queue_ids:
        from app.models.queue import Queue
        q_result = await db.execute(select(Queue.id, Queue.name).where(Queue.id.in_(queue_ids)))
        queue_names = {q.id: q.name for q in q_result.all()}

    return [
        {
            "queue_id": str(row.queue_id) if row.queue_id else None,
            "queue_name": queue_names.get(row.queue_id, "Unknown Queue"),
            "total": row.total,
            "delivered": row.delivered,
            "read": row.read,
            "failed": row.failed,
            "success_rate": round(((row.delivered + row.read) / row.total * 100), 1) if row.total > 0 else 0.0,
        }
        for row in rows
    ]


async def get_stats_by_session(db: AsyncSession, organization_id: uuid.UUID) -> list[dict]:
    """Return counts grouped by session for an organization."""
    result = await db.execute(
        select(
            WhatsAppMessage.session_id,
            func.count(WhatsAppMessage.id).label("total"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.delivered, 1))).label("delivered"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))).label("read"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))).label("failed"),
        )
        .where(WhatsAppMessage.organization_id == organization_id)
        .group_by(WhatsAppMessage.session_id)
        .order_by(func.count(WhatsAppMessage.id).desc())
    )
    rows = result.all()
    
    # Fetch session names (or dates)
    session_ids = [row.session_id for row in rows if row.session_id]
    session_names = {}
    if session_ids:
        from app.models.session import Session as SessionModel
        s_result = await db.execute(select(SessionModel.id, SessionModel.date).where(SessionModel.id.in_(session_ids)))
        session_names = {s.id: str(s.date) for s in s_result.all()}

    return [
        {
            "session_id": str(row.session_id) if row.session_id else None,
            "session_date": session_names.get(row.session_id, "Unknown Session"),
            "total": row.total,
            "delivered": row.delivered,
            "read": row.read,
            "failed": row.failed,
            "success_rate": round(((row.delivered + row.read) / row.total * 100), 1) if row.total > 0 else 0.0,
        }
        for row in rows
    ]
