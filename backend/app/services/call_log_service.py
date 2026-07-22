import math
import uuid
from typing import Optional, List, Tuple
from datetime import datetime
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models.call_log import CallLog
from app.models.user import User
from app.models.queue import Queue
from app.schemas.call_log import (
    CallLogRead,
    CallLogsOverviewResponse,
    StaffCallStat,
    PaginatedCallLogsResponse,
)

def calculate_billable_minutes(duration_seconds: int) -> int:
    """
    Plivo Voice API Billing Rule:
    Call duration is rounded up to the nearest 60-second increment.
    E.g.:
      0s   -> 0 mins
      1-60s -> 1 min
      61-120s -> 2 mins
    """
    if not duration_seconds or duration_seconds <= 0:
        return 0
    return math.ceil(duration_seconds / 60.0)


async def get_call_logs_paginated(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    queue_id: Optional[uuid.UUID] = None,
    staff_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
) -> PaginatedCallLogsResponse:
    page = max(1, page)
    limit = max(1, min(100, limit))
    offset = (page - 1) * limit

    query = select(CallLog).where(CallLog.organization_id == org_id)

    if queue_id:
        query = query.where(CallLog.queue_id == queue_id)

    if staff_id:
        query = query.where(CallLog.called_by_id == staff_id)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                CallLog.customer_phone.ilike(search_pattern),
                CallLog.customer_name.ilike(search_pattern),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar_one_or_none() or 0

    # Fetch paginated items with joins
    query = (
        query.options(joinedload(CallLog.called_by), joinedload(CallLog.queue))
        .order_by(desc(CallLog.created_at))
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    logs = result.scalars().all()

    items: List[CallLogRead] = []
    for log in logs:
        called_by_name = None
        if log.called_by:
            name_parts = [p for p in [log.called_by.first_name, log.called_by.last_name] if p]
            called_by_name = " ".join(name_parts) if name_parts else log.called_by.email

        queue_name = log.queue.name if log.queue else None

        items.append(
            CallLogRead(
                id=log.id,
                organization_id=log.organization_id,
                queue_id=log.queue_id,
                session_id=log.session_id,
                token_id=log.token_id,
                customer_name=log.customer_name,
                customer_phone=log.customer_phone,
                duration_seconds=log.duration_seconds,
                billable_minutes=calculate_billable_minutes(log.duration_seconds),
                called_by_id=log.called_by_id,
                called_by_name=called_by_name,
                queue_name=queue_name,
                created_at=log.created_at,
            )
        )

    pages = math.ceil(total / limit) if limit > 0 else 1

    return PaginatedCallLogsResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=max(1, pages),
    )


async def get_call_logs_overview(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    queue_id: Optional[uuid.UUID] = None,
) -> CallLogsOverviewResponse:
    query = select(CallLog).where(CallLog.organization_id == org_id)
    if queue_id:
        query = query.where(CallLog.queue_id == queue_id)

    query = query.options(joinedload(CallLog.called_by))
    result = await db.execute(query)
    logs = result.scalars().all()

    total_calls = len(logs)
    total_duration_seconds = sum(l.duration_seconds for l in logs)
    total_billable_minutes = sum(calculate_billable_minutes(l.duration_seconds) for l in logs)
    avg_duration_seconds = (
        round(total_duration_seconds / total_calls, 1) if total_calls > 0 else 0.0
    )

    # Group by staff
    staff_map = {}
    for l in logs:
        s_id = l.called_by_id
        if s_id not in staff_map:
            staff_name = "Unknown Staff"
            if l.called_by:
                name_parts = [p for p in [l.called_by.first_name, l.called_by.last_name] if p]
                staff_name = " ".join(name_parts) if name_parts else l.called_by.email
            staff_map[s_id] = {
                "staff_id": s_id,
                "staff_name": staff_name,
                "call_count": 0,
                "total_duration_seconds": 0,
                "total_billable_minutes": 0,
            }
        staff_map[s_id]["call_count"] += 1
        staff_map[s_id]["total_duration_seconds"] += l.duration_seconds
        staff_map[s_id]["total_billable_minutes"] += calculate_billable_minutes(l.duration_seconds)

    staff_stats = [
        StaffCallStat(**data)
        for data in sorted(staff_map.values(), key=lambda x: x["call_count"], reverse=True)
    ]

    return CallLogsOverviewResponse(
        total_calls=total_calls,
        total_duration_seconds=total_duration_seconds,
        total_billable_minutes=total_billable_minutes,
        avg_duration_seconds=avg_duration_seconds,
        staff_stats=staff_stats,
    )
