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
                case((WhatsAppMessage.status.in_([WhatsAppDeliveryStatus.delivered, WhatsAppDeliveryStatus.read]), 1))
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
        ).where(WhatsAppMessage.status != WhatsAppDeliveryStatus.skipped)
    )
    row = result.one()

    total = row.total or 0
    delivered = row.delivered or 0
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
                case((WhatsAppMessage.status.in_([WhatsAppDeliveryStatus.delivered, WhatsAppDeliveryStatus.read]), 1))
            ).label("delivered"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))
            ).label("read"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))
            ).label("failed"),
        )
        .where(WhatsAppMessage.created_at >= cutoff, WhatsAppMessage.status != WhatsAppDeliveryStatus.skipped)
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


async def get_stats_by_org(db: AsyncSession, limit: int = 50) -> list[dict]:
    """
    Returns WhatsApp usage statistics grouped by Organization (Parent Organization / main entity),
    with an expandable breakdown of all child branches (Organization models).
    """
    from app.models.organization import Organization
    from app.models.parent_organization import ParentOrganization

    # 1. Fetch message counts grouped by organization_id (branch id)
    msg_result = await db.execute(
        select(
            WhatsAppMessage.organization_id,
            func.count(WhatsAppMessage.id).label("total"),
            func.count(
                case((WhatsAppMessage.status.in_([WhatsAppDeliveryStatus.delivered, WhatsAppDeliveryStatus.read]), 1))
            ).label("delivered"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))
            ).label("read"),
            func.count(
                case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))
            ).label("failed"),
        )
        .where(WhatsAppMessage.status != WhatsAppDeliveryStatus.skipped)
        .group_by(WhatsAppMessage.organization_id)
    )
    branch_stats_map = {
        row.organization_id: {
            "total": row.total,
            "delivered": row.delivered,
            "read": row.read,
            "failed": row.failed,
        }
        for row in msg_result.all()
    }

    # 2. Fetch all parent organizations and all branches (organizations)
    parent_orgs_res = await db.execute(
        select(ParentOrganization).order_by(ParentOrganization.name.asc())
    )
    parent_orgs = parent_orgs_res.scalars().all()

    branches_res = await db.execute(
        select(Organization).order_by(Organization.name.asc())
    )
    all_branches = branches_res.scalars().all()

    # Group branches by parent_organization_id
    grouped_by_parent: dict[uuid.UUID | None, list[Organization]] = {}
    for b in all_branches:
        grouped_by_parent.setdefault(b.parent_organization_id, []).append(b)

    results = []

    # 3. Process each ParentOrganization (e.g. Org Group)
    for p in parent_orgs:
        p_branches = grouped_by_parent.get(p.id, [])
        
        branch_items = []
        p_total = 0
        p_delivered = 0
        p_read = 0
        p_failed = 0

        for b in p_branches:
            b_stats = branch_stats_map.get(b.id, {"total": 0, "delivered": 0, "read": 0, "failed": 0})
            b_total = b_stats["total"]
            b_delivered = b_stats["delivered"]
            b_read = b_stats["read"]
            b_failed = b_stats["failed"]
            b_success = round((b_delivered / b_total * 100), 1) if b_total > 0 else 0.0

            p_total += b_total
            p_delivered += b_delivered
            p_read += b_read
            p_failed += b_failed

            branch_items.append({
                "organization_id": str(b.id),
                "branch_name": b.name,
                "slug": b.slug,
                "is_active": b.is_active,
                "total": b_total,
                "delivered": b_delivered,
                "read": b_read,
                "failed": b_failed,
                "success_rate": b_success,
            })

        # Sort branch items by message volume descending
        branch_items.sort(key=lambda x: x["total"], reverse=True)
        p_success = round((p_delivered / p_total * 100), 1) if p_total > 0 else 0.0

        results.append({
            "id": str(p.id),
            "organization_id": str(p.id),
            "org_name": p.name,
            "name": p.name,
            "slug": p.slug,
            "is_parent": True,
            "branch_count": len(p_branches),
            "total": p_total,
            "delivered": p_delivered,
            "read": p_read,
            "failed": p_failed,
            "success_rate": p_success,
            "branches": branch_items,
        })

    # 4. Process Standalone Branches (branches without parent_organization_id)
    standalone_branches = grouped_by_parent.get(None, [])
    for b in standalone_branches:
        b_stats = branch_stats_map.get(b.id, {"total": 0, "delivered": 0, "read": 0, "failed": 0})
        b_total = b_stats["total"]
        b_delivered = b_stats["delivered"]
        b_read = b_stats["read"]
        b_failed = b_stats["failed"]
        b_success = round((b_delivered / b_total * 100), 1) if b_total > 0 else 0.0

        results.append({
            "id": str(b.id),
            "organization_id": str(b.id),
            "org_name": b.name,
            "name": b.name,
            "slug": b.slug,
            "is_parent": False,
            "branch_count": 1,
            "total": b_total,
            "delivered": b_delivered,
            "read": b_read,
            "failed": b_failed,
            "success_rate": b_success,
            "branches": [
                {
                    "organization_id": str(b.id),
                    "branch_name": b.name,
                    "slug": b.slug,
                    "is_active": b.is_active,
                    "total": b_total,
                    "delivered": b_delivered,
                    "read": b_read,
                    "failed": b_failed,
                    "success_rate": b_success,
                }
            ],
        })

    # Sort results by total messages descending, then by name
    results.sort(key=lambda x: (x["total"], x["name"]), reverse=True)

    if limit and limit > 0:
        return results[:limit]
    return results


# ── Per-Org Stats ─────────────────────────────────────────────────────────────

async def get_org_stats(
    db: AsyncSession, 
    organization_id: uuid.UUID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    queue_id: Optional[uuid.UUID] = None,
    session_id: Optional[uuid.UUID] = None,
) -> dict:
    """Per-org WhatsApp analytics with filters."""
    query = select(
        func.count(WhatsAppMessage.id).label("total"),
        func.count(
            case((WhatsAppMessage.status.in_([WhatsAppDeliveryStatus.delivered, WhatsAppDeliveryStatus.read]), 1))
        ).label("delivered"),
        func.count(
            case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))
        ).label("read"),
        func.count(
            case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))
        ).label("failed"),
    ).where(WhatsAppMessage.organization_id == organization_id, WhatsAppMessage.status != WhatsAppDeliveryStatus.skipped)

    if start_date:
        query = query.where(func.date(WhatsAppMessage.created_at) >= start_date)
    if end_date:
        query = query.where(func.date(WhatsAppMessage.created_at) <= end_date)
    if queue_id:
        query = query.where(WhatsAppMessage.queue_id == queue_id)
    if session_id:
        query = query.where(WhatsAppMessage.session_id == session_id)

    result = await db.execute(query)
    row = result.one()
    total = row.total or 0
    delivered = row.delivered or 0
    return {
        "total": total,
        "delivered": delivered,
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


async def get_stats_by_event(
    db: AsyncSession, 
    organization_id: uuid.UUID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    queue_id: Optional[uuid.UUID] = None,
    session_id: Optional[uuid.UUID] = None,
) -> list[dict]:
    """Return counts grouped by event_type for an organization with filters."""
    query = select(
        WhatsAppMessage.event_type,
        func.count(WhatsAppMessage.id).label("total"),
        func.count(case((WhatsAppMessage.status.in_([WhatsAppDeliveryStatus.delivered, WhatsAppDeliveryStatus.read]), 1))).label("delivered"),
        func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))).label("read"),
        func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))).label("failed"),
    ).where(WhatsAppMessage.organization_id == organization_id, WhatsAppMessage.status != WhatsAppDeliveryStatus.skipped)

    if start_date:
        query = query.where(func.date(WhatsAppMessage.created_at) >= start_date)
    if end_date:
        query = query.where(func.date(WhatsAppMessage.created_at) <= end_date)
    if queue_id:
        query = query.where(WhatsAppMessage.queue_id == queue_id)
    if session_id:
        query = query.where(WhatsAppMessage.session_id == session_id)

    query = query.group_by(WhatsAppMessage.event_type).order_by(func.count(WhatsAppMessage.id).desc())
    
    result = await db.execute(query)
    rows = result.all()
    return [
        {
            "event_type": row.event_type,
            "total": row.total,
            "delivered": row.delivered,
            "read": row.read,
            "failed": row.failed,
            "success_rate": round((row.delivered / row.total * 100), 1) if row.total > 0 else 0.0,
        }
        for row in rows
    ]


async def get_stats_by_queue(db: AsyncSession, organization_id: uuid.UUID) -> list[dict]:
    """Return counts grouped by queue for an organization."""
    result = await db.execute(
        select(
            WhatsAppMessage.queue_id,
            func.count(WhatsAppMessage.id).label("total"),
            func.count(case((WhatsAppMessage.status.in_([WhatsAppDeliveryStatus.delivered, WhatsAppDeliveryStatus.read]), 1))).label("delivered"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))).label("read"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))).label("failed"),
        )
        .where(WhatsAppMessage.organization_id == organization_id, WhatsAppMessage.status != WhatsAppDeliveryStatus.skipped)
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
            func.count(case((WhatsAppMessage.status.in_([WhatsAppDeliveryStatus.delivered, WhatsAppDeliveryStatus.read]), 1))).label("delivered"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.read, 1))).label("read"),
            func.count(case((WhatsAppMessage.status == WhatsAppDeliveryStatus.failed, 1))).label("failed"),
        )
        .where(WhatsAppMessage.organization_id == organization_id, WhatsAppMessage.status != WhatsAppDeliveryStatus.skipped)
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
