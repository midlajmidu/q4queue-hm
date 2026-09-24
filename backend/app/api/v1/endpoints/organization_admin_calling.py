import math
import uuid
import csv
import io
from typing import List, Optional
from datetime import datetime, date, time
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.core.deps import require_organization_admin
from app.models.user import User
from app.models.organization import Organization
from app.models.system_setting import SystemSetting
from app.models.call_log import CallLog
from app.services.call_log_service import calculate_billable_minutes, _apply_date_filters
from app.schemas.call_log import (
    ParentOrgBranchCallingStat,
    ParentOrgCallingOverviewResponse,
    ParentOrgCallLogItem,
    PaginatedCallLogsResponse,
)
from app.services.plivo_sync_service import sync_plivo_calls

router = APIRouter()


async def _get_global_call_rate(db: AsyncSession) -> tuple[float, str]:
    sys_stmt = select(SystemSetting).where(
        SystemSetting.key.in_(["global_call_rate_per_minute", "calling_currency"])
    )
    sys_res = await db.execute(sys_stmt)
    settings = {s.key: s.value for s in sys_res.scalars().all()}
    global_rate = 1.50
    if "global_call_rate_per_minute" in settings:
        try:
            global_rate = float(settings["global_call_rate_per_minute"])
        except ValueError:
            pass
    currency = settings.get("calling_currency", "₹")
    return global_rate, currency


@router.get("/calling", response_model=ParentOrgCallingOverviewResponse)
async def get_parent_org_calling_overview(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    """
    Get organization-wide (Parent Organization) calling overview and per-branch pricing breakdown.
    Supports filtering by start_date, end_date, and branch_id.
    """
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not linked to any Parent Organization")

    # Best-effort background sync of recent Plivo calls (cooldown-throttled)
    try:
        await sync_plivo_calls(db)
    except Exception:
        pass

    global_rate, global_currency = await _get_global_call_rate(db)

    # Fetch all branches belonging to this Parent Organization
    org_query = select(Organization).where(
        Organization.parent_organization_id == current_user.parent_organization_id
    ).order_by(Organization.name)
    org_res = await db.execute(org_query)
    branches = org_res.scalars().all()
    branch_map = {b.id: b for b in branches}

    if not branches:
        return ParentOrgCallingOverviewResponse(
            currency=global_currency,
            branches=[],
        )

    # If specific branch filtered, ensure it belongs to this parent org
    target_branch_ids = [branch_id] if (branch_id and branch_id in branch_map) else list(branch_map.keys())

    # Query call logs for these branches
    call_query = select(CallLog).where(CallLog.organization_id.in_(target_branch_ids))
    call_query = _apply_date_filters(call_query, start_date, end_date)

    call_res = await db.execute(call_query)
    all_logs = call_res.scalars().all()

    # Group logs by branch
    branch_logs_map = {b_id: [] for b_id in branch_map.keys()}
    for log in all_logs:
        if log.organization_id in branch_logs_map:
            branch_logs_map[log.organization_id].append(log)

    total_calls_all = 0
    total_duration_all = 0
    total_billable_mins_all = 0
    total_amount_all = 0.0
    connected_calls_all = 0

    branch_stats: List[ParentOrgBranchCallingStat] = []
    for b in branches:
        effective_rate = b.call_rate_per_minute if b.call_rate_per_minute is not None else global_rate
        b_currency = b.calling_currency or global_currency

        logs = branch_logs_map.get(b.id, [])
        b_calls = len(logs)
        b_duration = sum(l.duration_seconds for l in logs)
        b_billable = sum(calculate_billable_minutes(l.duration_seconds) for l in logs)
        b_amount = round(b_billable * effective_rate, 2)
        b_connected = sum(1 for l in logs if l.duration_seconds > 0 or getattr(l, "call_status", "") == "completed")
        b_conn_rate = round((b_connected / b_calls * 100), 1) if b_calls > 0 else 0.0

        if branch_id is None or b.id == branch_id:
            total_calls_all += b_calls
            total_duration_all += b_duration
            total_billable_mins_all += b_billable
            total_amount_all += b_amount
            connected_calls_all += b_connected

        branch_stats.append(
            ParentOrgBranchCallingStat(
                branch_id=b.id,
                branch_name=b.name,
                branch_slug=b.slug,
                rate_per_minute=effective_rate,
                currency=b_currency,
                total_calls=b_calls,
                total_duration_seconds=b_duration,
                total_billable_minutes=b_billable,
                total_amount=b_amount,
                connection_rate=b_conn_rate,
            )
        )

    avg_duration = round(total_duration_all / total_calls_all, 1) if total_calls_all > 0 else 0.0
    overall_conn_rate = round((connected_calls_all / total_calls_all * 100), 1) if total_calls_all > 0 else 0.0

    return ParentOrgCallingOverviewResponse(
        total_calls=total_calls_all,
        connection_rate=overall_conn_rate,
        total_billable_minutes=total_billable_mins_all,
        total_amount=round(total_amount_all, 2),
        total_duration_seconds=total_duration_all,
        avg_duration_seconds=avg_duration,
        currency=global_currency,
        branches=branch_stats,
    )


@router.get("/calling/logs")
async def get_parent_org_calling_logs(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    """
    Get paginated call logs across all branches of the Parent Organization.
    """
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not linked to any Parent Organization")

    global_rate, global_currency = await _get_global_call_rate(db)

    # Fetch all branches
    org_res = await db.execute(
        select(Organization).where(Organization.parent_organization_id == current_user.parent_organization_id)
    )
    branches = org_res.scalars().all()
    branch_map = {b.id: b for b in branches}

    target_branch_ids = [branch_id] if (branch_id and branch_id in branch_map) else list(branch_map.keys())
    if not target_branch_ids:
        return {
            "items": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "pages": 0,
        }

    query = select(CallLog).where(CallLog.organization_id.in_(target_branch_ids))
    query = _apply_date_filters(query, start_date, end_date)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            CallLog.customer_phone.ilike(search_pattern) | CallLog.customer_name.ilike(search_pattern)
        )

    # Total count
    count_res = await db.execute(select(select(CallLog.id).where(query.whereclause).subquery()))
    total = len(count_res.scalars().all())

    # Paginate
    offset = (page - 1) * limit
    query = (
        query.options(joinedload(CallLog.called_by), joinedload(CallLog.queue))
        .order_by(desc(CallLog.created_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    logs = result.scalars().all()

    items = []
    for log in logs:
        branch = branch_map.get(log.organization_id)
        effective_rate = (
            branch.call_rate_per_minute
            if (branch and branch.call_rate_per_minute is not None)
            else global_rate
        )

        called_by_name = None
        if log.called_by:
            parts = [p for p in [log.called_by.first_name, log.called_by.last_name] if p]
            called_by_name = " ".join(parts) if parts else log.called_by.email

        b_mins = calculate_billable_minutes(log.duration_seconds)
        cost_amount = round(b_mins * effective_rate, 2)

        items.append(
            {
                "id": str(log.id),
                "organization_id": str(log.organization_id),
                "branch_name": branch.name if branch else "Unknown Branch",
                "branch_slug": branch.slug if branch else "",
                "queue_id": str(log.queue_id) if log.queue_id else None,
                "queue_name": log.queue.name if log.queue else None,
                "session_id": str(log.session_id) if log.session_id else None,
                "token_id": str(log.token_id) if log.token_id else None,
                "customer_name": log.customer_name,
                "customer_phone": log.customer_phone,
                "duration_seconds": log.duration_seconds,
                "ring_duration_seconds": getattr(log, "ring_duration_seconds", 0) or 0,
                "call_status": getattr(log, "call_status", "completed") or "completed",
                "billable_minutes": b_mins,
                "cost_amount": cost_amount,
                "rate_per_minute": effective_rate,
                "currency": branch.calling_currency if (branch and branch.calling_currency) else global_currency,
                "called_by_id": str(log.called_by_id) if log.called_by_id else None,
                "called_by_name": called_by_name,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
        )

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if limit > 0 else 1,
    }


@router.get("/calling/export")
async def export_parent_org_calling_csv(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    """
    Export all Parent Organization call records as a CSV spreadsheet.
    """
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not linked to any Parent Organization")

    global_rate, _ = await _get_global_call_rate(db)

    org_res = await db.execute(
        select(Organization).where(Organization.parent_organization_id == current_user.parent_organization_id)
    )
    branches = org_res.scalars().all()
    branch_map = {b.id: b for b in branches}

    target_branch_ids = [branch_id] if (branch_id and branch_id in branch_map) else list(branch_map.keys())
    if not target_branch_ids:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Date & Time",
            "Branch",
            "Staff Caller",
            "Customer Phone",
            "Customer Name",
            "Queue",
            "Status",
            "Talk Duration (s)",
            "Ring Duration (s)",
            "Billable Mins",
            "Rate/min",
            "Cost Amount",
        ])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=organization_calling_export.csv"},
        )

    query = select(CallLog).where(CallLog.organization_id.in_(target_branch_ids))
    query = _apply_date_filters(query, start_date, end_date)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            CallLog.customer_phone.ilike(search_pattern) | CallLog.customer_name.ilike(search_pattern)
        )

    query = query.options(joinedload(CallLog.called_by), joinedload(CallLog.queue)).order_by(desc(CallLog.created_at))
    result = await db.execute(query)
    logs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date & Time",
        "Branch",
        "Staff Caller",
        "Customer Phone",
        "Customer Name",
        "Queue",
        "Status",
        "Talk Duration (s)",
        "Ring Duration (s)",
        "Billable Mins",
        "Rate/min",
        "Cost Amount",
    ])

    for log in logs:
        branch = branch_map.get(log.organization_id)
        effective_rate = (
            branch.call_rate_per_minute
            if (branch and branch.call_rate_per_minute is not None)
            else global_rate
        )
        called_by_name = "Unknown"
        if log.called_by:
            parts = [p for p in [log.called_by.first_name, log.called_by.last_name] if p]
            called_by_name = " ".join(parts) if parts else log.called_by.email

        b_mins = calculate_billable_minutes(log.duration_seconds)
        cost_amount = round(b_mins * effective_rate, 2)

        writer.writerow([
            log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else "",
            branch.name if branch else "Unknown",
            called_by_name,
            log.customer_phone,
            log.customer_name or "",
            log.queue.name if log.queue else "",
            getattr(log, "call_status", "completed"),
            log.duration_seconds,
            getattr(log, "ring_duration_seconds", 0) or 0,
            b_mins,
            f"{effective_rate:.2f}",
            f"{cost_amount:.2f}",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=organization_calling_export.csv"},
    )
