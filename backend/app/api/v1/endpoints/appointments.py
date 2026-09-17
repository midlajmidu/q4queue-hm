"""
app/api/v1/endpoints/appointments.py
Staff and branch admin endpoints for managing appointments and early bookings.
"""
import uuid
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
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

    # Attach queue_name and token info for UI display
    queue_map = {}
    for a in appts:
        if a.queue_id not in queue_map:
            q = await db.get(Queue, a.queue_id)
            queue_map[a.queue_id] = q.name if q else ""
        a.queue_name = queue_map.get(a.queue_id, "")

        if a.token_id:
            from app.models.token import Token
            tok = await db.get(Token, a.token_id)
            if tok:
                a.token_number = tok.token_number
                q = await db.get(Queue, a.queue_id)
                a.token_prefix = q.prefix if q else ""

    return appts


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def staff_create_appointment(
    data: StaffAppointmentCreate,
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

    await db.commit()
    await db.refresh(appt)
    q = await db.get(Queue, appt.queue_id)
    appt.queue_name = q.name if q else ""
    return appt


@router.post("/{appointment_id}/check-in")
async def staff_check_in_appointment(
    appointment_id: uuid.UUID,
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
