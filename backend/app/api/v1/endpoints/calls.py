import uuid
import csv
import io
import logging
from typing import Optional
from datetime import date, datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_

from app.db.deps import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.call_log import CallLog
from app.models.organization import Organization
from app.schemas.call_log import (
    CallLogCreate,
    CallLogRead,
    CallLogsOverviewResponse,
    PaginatedCallLogsResponse,
)
from app.services import call_log_service
from app.services.plivo_sync_service import sync_plivo_calls

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/sync")
async def trigger_plivo_call_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Explicitly trigger synchronization of Call Detail Records from Plivo."""
    org_id = current_user.org_id
    synced = await sync_plivo_calls(db, org_id=org_id, force=True)
    return {"status": "success", "synced": synced}


@router.post("/save", response_model=CallLogRead)
async def log_call(
    call_in: CallLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Log a WebRTC call from the frontend client.
    Reconciles with any authoritative Plivo webhook log created within the last 3 minutes.
    """
    # Enforce strict tenant isolation: non-superadmin users cannot log calls to arbitrary organizations
    if getattr(current_user, "role", "") == "super_admin":
        org_id = call_in.organization_id or current_user.org_id
    elif current_user.org_id:
        org_id = current_user.org_id
    elif current_user.parent_organization_id and call_in.organization_id:
        # Verify the target branch belongs to this parent organization
        p_res = await db.execute(
            select(Organization.id).where(
                and_(
                    Organization.id == call_in.organization_id,
                    Organization.parent_organization_id == current_user.parent_organization_id,
                )
            )
        )
        if not p_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Branch does not belong to your organization")
        org_id = call_in.organization_id
    else:
        org_id = current_user.org_id

    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization")

    # Check if a recent CallLog was already created by Plivo webhook
    recent_cutoff = datetime.now(timezone.utc) - timedelta(minutes=3)
    conditions = [
        CallLog.organization_id == org_id,
        CallLog.customer_phone == call_in.customer_phone,
        CallLog.created_at >= recent_cutoff,
    ]
    if call_in.token_id:
        conditions.append(CallLog.token_id == call_in.token_id)

    res = await db.execute(
        select(CallLog).where(and_(*conditions)).order_by(desc(CallLog.created_at)).limit(1)
    )
    existing_log = res.scalar_one_or_none()

    if existing_log:
        if not existing_log.called_by_id:
            existing_log.called_by_id = current_user.id
        if not existing_log.customer_name and call_in.customer_name:
            existing_log.customer_name = call_in.customer_name
        if call_in.queue_id and not existing_log.queue_id:
            existing_log.queue_id = call_in.queue_id
        await db.commit()
        await db.refresh(existing_log)
        call_log = existing_log
    else:
        call_log = CallLog(
            organization_id=org_id,
            queue_id=call_in.queue_id,
            session_id=call_in.session_id,
            token_id=call_in.token_id,
            customer_name=call_in.customer_name,
            customer_phone=call_in.customer_phone,
            duration_seconds=call_in.duration_seconds,
            ring_duration_seconds=call_in.ring_duration_seconds,
            call_status=call_in.call_status or "no_answer",
            called_by_id=current_user.id
        )
        db.add(call_log)
        await db.commit()
        await db.refresh(call_log)

    called_by_name = None
    if current_user:
        name_parts = [p for p in [current_user.first_name, current_user.last_name] if p]
        called_by_name = " ".join(name_parts) if name_parts else current_user.email

    rate_per_min, _ = await call_log_service.get_effective_call_rate(db, org_id)
    billable_mins = call_log_service.calculate_billable_minutes(call_log.duration_seconds)
    cost_amount = round(billable_mins * rate_per_min, 2)

    return CallLogRead(
        id=call_log.id,
        organization_id=call_log.organization_id,
        queue_id=call_log.queue_id,
        session_id=call_log.session_id,
        token_id=call_log.token_id,
        customer_name=call_log.customer_name,
        customer_phone=call_log.customer_phone,
        duration_seconds=call_log.duration_seconds,
        ring_duration_seconds=getattr(call_log, "ring_duration_seconds", 0) or 0,
        call_status=getattr(call_log, "call_status", "completed") or "completed",
        billable_minutes=billable_mins,
        cost_amount=cost_amount,
        called_by_id=call_log.called_by_id,
        called_by_name=called_by_name,
        created_at=call_log.created_at,
    )


@router.get("/logs", response_model=PaginatedCallLogsResponse)
async def get_call_logs(
    queue_id: Optional[uuid.UUID] = None,
    staff_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get paginated call logs history for an organization with optional date range filter.
    """
    org_id = current_user.org_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization")

    return await call_log_service.get_call_logs_paginated(
        db,
        org_id=org_id,
        page=page,
        limit=limit,
        queue_id=queue_id,
        staff_id=staff_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/overview", response_model=CallLogsOverviewResponse)
async def get_call_logs_overview(
    queue_id: Optional[uuid.UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get call metrics, total cost amount & billable minutes overview for an organization.
    """
    org_id = current_user.org_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization")

    return await call_log_service.get_call_logs_overview(
        db,
        org_id=org_id,
        queue_id=queue_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/logs/export")
async def export_call_logs_csv(
    queue_id: Optional[uuid.UUID] = None,
    staff_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Export call logs as CSV file.
    """
    org_id = current_user.org_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization")

    # Fetch all matching logs
    result = await call_log_service.get_call_logs_paginated(
        db,
        org_id=org_id,
        page=1,
        limit=10000,
        queue_id=queue_id,
        staff_id=staff_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date & Time",
        "Staff Caller",
        "Customer Phone",
        "Customer Name",
        "Queue",
        "Status",
        "Duration (s)",
        "Ring Time (s)",
        "Billable (mins)",
    ])

    for item in result.items:
        writer.writerow([
            item.created_at.strftime("%Y-%m-%d %H:%M:%S") if item.created_at else "",
            item.called_by_name or "Unknown",
            item.customer_phone,
            item.customer_name or "",
            item.queue_name or "",
            item.call_status,
            item.duration_seconds,
            item.ring_duration_seconds,
            item.billable_minutes,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=call_logs_export.csv"}
    )
