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
from app.models.queue import Queue
from app.models.session import Session
from app.models.token import Token
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


async def _resolve_target_org(
    db: AsyncSession,
    current_user: User,
    requested_org_id: Optional[uuid.UUID] = None,
    requested_org_slug: Optional[str] = None
) -> uuid.UUID:
    """Resolve target organization for call logs respecting user role and tenant scoping."""
    if getattr(current_user, "role", "") == "super_admin":
        if requested_org_id:
            return requested_org_id
        if requested_org_slug:
            r = await db.execute(select(Organization.id).where(Organization.slug == requested_org_slug))
            s_id = r.scalar_one_or_none()
            if s_id:
                return s_id
        if current_user.org_id:
            return current_user.org_id
        r = await db.execute(select(Organization.id).order_by(Organization.created_at.asc()).limit(1))
        f_id = r.scalar_one_or_none()
        if f_id:
            return f_id
        raise HTTPException(status_code=400, detail="No organization exists")

    if current_user.parent_organization_id and (requested_org_id or requested_org_slug):
        stmt = select(Organization.id).where(Organization.parent_organization_id == current_user.parent_organization_id)
        if requested_org_id:
            stmt = stmt.where(Organization.id == requested_org_id)
        if requested_org_slug:
            stmt = stmt.where(Organization.slug == requested_org_slug)
        r = await db.execute(stmt)
        p_id = r.scalar_one_or_none()
        if p_id:
            return p_id

    if current_user.org_id:
        return current_user.org_id

    raise HTTPException(status_code=400, detail="User does not belong to any organization")


@router.post("/sync")
async def trigger_plivo_call_sync(
    org_id: Optional[uuid.UUID] = None,
    org_slug: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Explicitly trigger synchronization of Call Detail Records from Plivo for target branch."""
    target_org_id = await _resolve_target_org(db, current_user, org_id, org_slug)
    synced = await sync_plivo_calls(db, org_id=target_org_id, force=True)
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
    # Resolve true organization ground truth from Token or Queue if available
    org_id = None
    if call_in.token_id:
        t_chk = await db.execute(select(Token.org_id).where(Token.id == call_in.token_id))
        org_id = t_chk.scalar_one_or_none()

    if not org_id and call_in.queue_id:
        q_chk = await db.execute(select(Queue.org_id).where(Queue.id == call_in.queue_id))
        org_id = q_chk.scalar_one_or_none()

    if not org_id:
        if getattr(current_user, "role", "") == "super_admin":
            org_id = call_in.organization_id or current_user.org_id
        elif current_user.parent_organization_id and call_in.organization_id:
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
        elif current_user.org_id:
            org_id = current_user.org_id
        else:
            org_id = call_in.organization_id

    if not org_id:
        raise HTTPException(status_code=400, detail="Unable to determine organization for call record")

    # Check if a recent CallLog was already created by Plivo webhook
    recent_cutoff = datetime.now(timezone.utc) - timedelta(minutes=3)
    raw_p = (call_in.customer_phone or "").strip()
    phone_variants = list(set([raw_p, raw_p.lstrip("+"), f"+{raw_p.lstrip('+')}"]))
    conditions = [
        CallLog.organization_id == org_id,
        CallLog.customer_phone.in_(phone_variants),
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
            q_chk = await db.execute(select(Queue.id).where(Queue.id == call_in.queue_id))
            if q_chk.scalar_one_or_none():
                existing_log.queue_id = call_in.queue_id

        # Update duration and call status if the frontend reported an active talk duration
        if call_in.duration_seconds and call_in.duration_seconds > (existing_log.duration_seconds or 0):
            existing_log.duration_seconds = call_in.duration_seconds
        if call_in.ring_duration_seconds and (not existing_log.ring_duration_seconds or existing_log.ring_duration_seconds == 0):
            existing_log.ring_duration_seconds = call_in.ring_duration_seconds

        if (existing_log.duration_seconds or 0) > 0:
            existing_log.call_status = "completed"
        elif call_in.call_status and existing_log.call_status in ["no_answer", "failed", "busy", "cancelled"]:
            existing_log.call_status = call_in.call_status

        await db.commit()
        await db.refresh(existing_log)
        call_log = existing_log
    else:
        # Verify foreign keys before insertion to prevent ForeignKeyViolationError on stale IDs
        valid_queue_id = None
        if call_in.queue_id:
            q_res = await db.execute(select(Queue.id).where(Queue.id == call_in.queue_id))
            if q_res.scalar_one_or_none():
                valid_queue_id = call_in.queue_id

        valid_session_id = None
        if call_in.session_id:
            s_res = await db.execute(select(Session.id).where(Session.id == call_in.session_id))
            if s_res.scalar_one_or_none():
                valid_session_id = call_in.session_id

        valid_token_id = None
        if call_in.token_id:
            t_res = await db.execute(select(Token.id).where(Token.id == call_in.token_id))
            if t_res.scalar_one_or_none():
                valid_token_id = call_in.token_id

        status_to_use = call_in.call_status or "no_answer"
        if (call_in.duration_seconds or 0) > 0:
            status_to_use = "completed"

        caller_id_to_use = current_user.id
        if current_user.org_id and current_user.org_id != org_id and getattr(current_user, "role", "") not in ["super_admin", "organization_admin"]:
            br_user_res = await db.execute(
                select(User.id).where(User.org_id == org_id).order_by(User.created_at.asc()).limit(1)
            )
            caller_id_to_use = br_user_res.scalar_one_or_none() or current_user.id

        normalized_phone = f"+{raw_p.lstrip('+')}" if raw_p else "Unknown"

        call_log = CallLog(
            organization_id=org_id,
            queue_id=valid_queue_id,
            session_id=valid_session_id,
            token_id=valid_token_id,
            customer_name=call_in.customer_name,
            customer_phone=normalized_phone,
            duration_seconds=call_in.duration_seconds or 0,
            ring_duration_seconds=call_in.ring_duration_seconds or 0,
            call_status=status_to_use,
            called_by_id=caller_id_to_use
        )
        db.add(call_log)
        try:
            await db.commit()
            await db.refresh(call_log)
        except Exception as exc:
            await db.rollback()
            logger.error(f"Integrity check failed when saving CallLog: {exc}. Retrying without optional foreign keys.")
            call_log = CallLog(
                organization_id=org_id,
                queue_id=None,
                session_id=None,
                token_id=None,
                customer_name=call_in.customer_name,
                customer_phone=normalized_phone,
                duration_seconds=call_in.duration_seconds or 0,
                ring_duration_seconds=call_in.ring_duration_seconds or 0,
                call_status=status_to_use,
                called_by_id=caller_id_to_use
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
    org_id: Optional[uuid.UUID] = None,
    org_slug: Optional[str] = None,
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
    target_org_id = await _resolve_target_org(db, current_user, org_id, org_slug)

    return await call_log_service.get_call_logs_paginated(
        db,
        org_id=target_org_id,
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
    org_id: Optional[uuid.UUID] = None,
    org_slug: Optional[str] = None,
    queue_id: Optional[uuid.UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get call metrics, total cost amount & billable minutes overview for an organization.
    """
    target_org_id = await _resolve_target_org(db, current_user, org_id, org_slug)

    return await call_log_service.get_call_logs_overview(
        db,
        org_id=target_org_id,
        queue_id=queue_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/logs/export")
async def export_call_logs_csv(
    org_id: Optional[uuid.UUID] = None,
    org_slug: Optional[str] = None,
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
    target_org_id = await _resolve_target_org(db, current_user, org_id, org_slug)

    # Fetch all matching logs
    result = await call_log_service.get_call_logs_paginated(
        db,
        org_id=target_org_id,
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
