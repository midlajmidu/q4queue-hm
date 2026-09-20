"""
app/api/v1/endpoints/appointments.py
Staff and branch admin endpoints for managing appointments and early bookings.
"""
import uuid
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_branch_admin_or_staff
from app.db.deps import get_db
from app.models.user import User
from app.models.queue import Queue
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.appointment import (
    AppointmentResponse,
    StaffAppointmentCreate,
    AppointmentUpdate,
    AppointmentCreate,
)
from app.services.appointment_service import (
    list_appointments,
    create_appointment,
    check_in_appointment,
    maybe_remove_appointment_token,
    _is_next_day_slot,
)

router = APIRouter()


@router.get("", response_model=List[AppointmentResponse])
async def get_appointments(
    queue_id: Optional[uuid.UUID] = Query(None),
    target_date: Optional[date] = Query(None, alias="date"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status_param: Optional[AppointmentStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_branch_admin_or_staff()),
    db: AsyncSession = Depends(get_db),
):
    """List appointments for the current user's organization with optional filters."""
    appts = await list_appointments(
        db,
        org_id=current_user.org_id,
        queue_id=queue_id,
        target_date=target_date,
        start_date=start_date,
        end_date=end_date,
        status=status_param,
        search=search,
        limit=limit,
        offset=offset,
    )

    # Attach queue_name, token info, and is_next_day for UI display
    queue_obj_map: dict = {}
    for a in appts:
        if a.queue_id not in queue_obj_map:
            q = await db.get(Queue, a.queue_id)
            queue_obj_map[a.queue_id] = q
        q = queue_obj_map.get(a.queue_id)
        a.queue_name = q.name if q else ""
        a.is_next_day = _is_next_day_slot(
            a.start_time,
            q.open_time if q else None,
            q.close_time if q else None,
        )

        if a.token_id:
            from app.models.token import Token
            tok = await db.get(Token, a.token_id)
            if tok:
                a.token_number = tok.token_number
                a.token_prefix = q.prefix if q else ""

    # Attach call statistics for each appointment
    if appts:
        from app.models.call_log import CallLog
        from sqlalchemy import func
        appt_ids = [a.id for a in appts]
        call_stats_res = await db.execute(
            select(
                CallLog.appointment_id,
                func.count(CallLog.id).label("call_count"),
                func.sum(CallLog.duration_seconds).label("total_duration"),
                func.max(CallLog.created_at).label("last_called_at"),
            )
            .where(CallLog.appointment_id.in_(appt_ids))
            .group_by(CallLog.appointment_id)
        )
        call_stats_map = {
            row.appointment_id: {
                "call_count": row.call_count or 0,
                "total_duration": row.total_duration or 0,
                "last_called_at": row.last_called_at,
            }
            for row in call_stats_res.all()
        }
        for a in appts:
            cstats = call_stats_map.get(a.id, {})
            a.call_count = cstats.get("call_count", 0)
            a.total_call_duration_seconds = cstats.get("total_duration", 0)
            a.last_called_at = cstats.get("last_called_at", None)

    return appts


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def staff_create_appointment(
    data: StaffAppointmentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_branch_admin_or_staff()),
    db: AsyncSession = Depends(get_db),
):
    """Staff books an appointment manually for a customer."""
    # Verify queue belongs to user's org
    q_res = await db.execute(
        select(Queue).where(
            Queue.id == data.queue_id,
            Queue.org_id == current_user.org_id,
            Queue.is_deleted.is_(False),
        )
    )
    queue = q_res.scalar_one_or_none()
    if not queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found in this organization")

    appt_create_data = AppointmentCreate(
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_email=data.customer_email,
        appointment_date=data.appointment_date,
        start_time=data.start_time,
        pax_count=data.pax_count,
        custom_data=data.custom_data,
    )

    try:
        appt = await create_appointment(
            db,
            queue_id=data.queue_id,
            data=appt_create_data,
            booked_by=f"staff_{current_user.email or current_user.id}",
        )
        if data.notes:
            appt.notes = data.notes
        await db.commit()
        await db.refresh(appt)
        appt.queue_name = queue.name
        appt.is_next_day = _is_next_day_slot(appt.start_time, queue.open_time, queue.close_time)

        # Dispatch WhatsApp appointment booking confirmation
        if appt.customer_phone:
            from app.services.notification_service import notify_appointment_booked
            from app.models.organization import Organization
            org = await db.get(Organization, appt.org_id)
            org_name = org.name if org else ""

            date_str = appt.appointment_date.strftime("%d %b %Y")
            start_str = appt.start_time.strftime("%I:%M %p").lstrip("0")
            end_str = appt.end_time.strftime("%I:%M %p").lstrip("0")
            time_slot_str = f"{start_str} - {end_str}"

            background_tasks.add_task(
                notify_appointment_booked,
                appointment_id=appt.id,
                org_id=appt.org_id,
                queue_id=appt.queue_id,
                customer_name=appt.customer_name,
                customer_phone=appt.customer_phone,
                booking_reference=appt.booking_reference,
                appointment_date=date_str,
                time_slot=time_slot_str,
                queue_name=queue.name,
                organization_name=org_name,
            )

        return appt
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create appointment")


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment_detail(
    appointment_id: uuid.UUID,
    current_user: User = Depends(require_branch_admin_or_staff()),
    db: AsyncSession = Depends(get_db),
):
    """Get single appointment details."""
    res = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.org_id == current_user.org_id,
        )
    )
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    q = await db.get(Queue, appt.queue_id)
    appt.queue_name = q.name if q else ""
    appt.is_next_day = _is_next_day_slot(
        appt.start_time,
        q.open_time if q else None,
        q.close_time if q else None,
    )

    from app.models.call_log import CallLog
    from sqlalchemy import func
    call_stats_res = await db.execute(
        select(
            func.count(CallLog.id).label("call_count"),
            func.sum(CallLog.duration_seconds).label("total_duration"),
            func.max(CallLog.created_at).label("last_called_at"),
        )
        .where(CallLog.appointment_id == appt.id)
    )
    row = call_stats_res.first()
    if row:
        appt.call_count = row.call_count or 0
        appt.total_call_duration_seconds = row.total_duration or 0
        appt.last_called_at = row.last_called_at

    return appt


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    current_user: User = Depends(require_branch_admin_or_staff()),
    db: AsyncSession = Depends(get_db),
):
    """Update appointment status, notes, or reschedule slot."""
    res = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.org_id == current_user.org_id,
        )
    )
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if data.status is not None:
        appt.status = data.status
    if data.notes is not None:
        appt.notes = data.notes
    if data.custom_data is not None:
        appt.custom_data = data.custom_data

    if data.appointment_date or data.start_time:
        new_date = data.appointment_date or appt.appointment_date
        new_start = data.start_time or appt.start_time.strftime("%H:%M")
        from app.services.appointment_service import _parse_time_hhmm
        appt.appointment_date = new_date
        appt.start_time = _parse_time_hhmm(new_start)
        q = await db.get(Queue, appt.queue_id)
        from datetime import datetime, timedelta
        appt.end_time = (datetime.combine(new_date, appt.start_time) + timedelta(minutes=q.slot_duration or 15)).time()

    # If appointment is being cancelled, remove the linked waiting token
    if data.status == AppointmentStatus.cancelled:
        await maybe_remove_appointment_token(db, appt)

    await db.commit()
    await db.refresh(appt)
    q = await db.get(Queue, appt.queue_id)
    appt.queue_name = q.name if q else ""
    appt.is_next_day = _is_next_day_slot(
        appt.start_time,
        q.open_time if q else None,
        q.close_time if q else None,
    )
    return appt


@router.post("/{appointment_id}/approve", response_model=AppointmentResponse)
async def approve_appointment(
    appointment_id: uuid.UUID,
    current_user: User = Depends(require_branch_admin_or_staff()),
    db: AsyncSession = Depends(get_db),
):
    """Approve a pending appointment."""
    res = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.org_id == current_user.org_id,
        )
    )
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    appt.status = AppointmentStatus.confirmed
    await db.commit()
    await db.refresh(appt)
    q = await db.get(Queue, appt.queue_id)
    appt.queue_name = q.name if q else ""
    return appt


@router.post("/{appointment_id}/reject", response_model=AppointmentResponse)
async def reject_appointment(
    appointment_id: uuid.UUID,
    current_user: User = Depends(require_branch_admin_or_staff()),
    db: AsyncSession = Depends(get_db),
):
    """Reject a pending appointment."""
    res = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.org_id == current_user.org_id,
        )
    )
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    appt.status = AppointmentStatus.cancelled
    await maybe_remove_appointment_token(db, appt)
    await db.commit()
    await db.refresh(appt)
    q = await db.get(Queue, appt.queue_id)
    appt.queue_name = q.name if q else ""
    appt.is_next_day = _is_next_day_slot(
        appt.start_time,
        q.open_time if q else None,
        q.close_time if q else None,
    )
    return appt


@router.post("/{appointment_id}/check-in")
async def staff_check_in_appointment(
    appointment_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    session_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(require_branch_admin_or_staff()),
    db: AsyncSession = Depends(get_db),
):
    """Staff checks in an arriving customer, admitting them into today's active session."""
    res = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.org_id == current_user.org_id,
        )
    )
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    try:
        updated_appt, token = await check_in_appointment(
            db,
            appointment=appt,
            session_id=session_id,
            checked_in_by=f"staff_{current_user.email or current_user.id}",
        )
        await db.commit()
        q = await db.get(Queue, appt.queue_id)

        # Dispatch WhatsApp "queue_joined_v4" notification to customer's phone
        if token.customer_phone:
            from app.services.token_service import _count_waiting_ahead
            from app.services.notification_service import notify_queue_event
            from app.models.organization import Organization

            position = await _count_waiting_ahead(
                db,
                queue_id=q.id if q else appt.queue_id,
                token_number=token.token_number,
                session_id=token.session_id,
            )
            org = await db.get(Organization, appt.org_id)
            org_name = org.name if org else ""

            background_tasks.add_task(
                notify_queue_event,
                event_type="queue_joined_v4",
                org_id=appt.org_id,
                token_id=token.id,
                queue_id=q.id if q else appt.queue_id,
                customer_name=token.customer_name,
                customer_phone=token.customer_phone,
                token_number=token.token_number,
                token_prefix=q.prefix if q else "",
                queue_name=q.name if q else "",
                position=position,
                tracking_id=str(token.tracking_id) if hasattr(token, "tracking_id") and token.tracking_id else None,
                organization_name=org_name,
                session_id=token.session_id,
            )

        return {
            "message": "Customer checked in successfully",
            "token_id": str(token.id),
            "token_number": token.token_number,
            "prefix": q.prefix if q else "A",
            "status": updated_appt.status.value,
        }
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Staff check-in failed")


@router.delete("/{appointment_id}")
async def delete_appointment(
    appointment_id: uuid.UUID,
    current_user: User = Depends(require_branch_admin_or_staff()),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete an appointment record."""
    res = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.org_id == current_user.org_id,
        )
    )
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    await db.delete(appt)
    await db.commit()
    return {"message": "Appointment deleted successfully"}

