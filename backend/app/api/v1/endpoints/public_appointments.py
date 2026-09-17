"""
app/api/v1/endpoints/public_appointments.py
Public endpoints for customer appointment bookings, slot availability, and day-of-service check-in.
"""
import uuid
from datetime import date, datetime, timedelta
from typing import Optional, List
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.models.queue import Queue
from app.models.organization import Organization
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentPublicPass,
    AvailableSlotsResponse,
)
from app.services.appointment_service import (
    get_available_slots,
    create_appointment,
    check_in_appointment,
    get_appointment_by_ref,
    get_queue_timezone,
)

router = APIRouter()


@router.get("/queues/{queue_id}/info")
async def public_get_queue_booking_info(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve queue and organization profile for appointment booking."""
    q_res = await db.execute(
        select(Queue).where(Queue.id == queue_id, Queue.is_deleted.is_(False))
    )
    queue = q_res.scalar_one_or_none()
    if not queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found")

    org = await db.get(Organization, queue.org_id)
    if not org or not org.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    tz_str = org.timezone if (org and org.timezone) else "Asia/Kolkata"
    now_local = datetime.now(ZoneInfo(tz_str))
    today_local = now_local.date().isoformat()

    return {
        "queue_id": str(queue.id),
        "queue_name": queue.name,
        "prefix": queue.prefix,
        "org_id": str(org.id),
        "org_name": org.name,
        "org_slug": org.slug,
        "org_logo_url": getattr(org, "logo_url", None),
        "address": getattr(org, "address", None),
        "phone_number": getattr(org, "phone_number", None),
        "timezone": tz_str,
        "today_date": today_local,
        "open_time": queue.open_time,
        "close_time": queue.close_time,
        "slot_duration": queue.slot_duration or 15,
        "slot_capacity": queue.slot_capacity or 1,
        "advance_booking_days": queue.advance_booking_days or 7,
        "appointment_enabled": queue.appointment_enabled if queue.appointment_enabled is not None else True,
        "industry_template": queue.industry_template or "general",
        "custom_fields": queue.custom_fields or [],
    }


@router.get("/queues/{queue_id}/available-slots", response_model=AvailableSlotsResponse)
async def public_get_available_slots(
    queue_id: uuid.UUID,
    date_param: date = Query(..., alias="date"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve time slots and remaining capacity for a queue on a specific date."""
    try:
        return await get_available_slots(db, queue_id=queue_id, target_date=date_param)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load slots")


@router.post("/queues/{queue_id}/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def public_book_appointment(
    queue_id: uuid.UUID,
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Customer submits an appointment booking."""
    try:
        appointment = await create_appointment(db, queue_id=queue_id, data=data, booked_by="customer_online")
        await db.commit()
        await db.refresh(appointment)
        return appointment
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create booking")


@router.get("/appointments/{booking_reference}", response_model=AppointmentPublicPass)
async def public_get_appointment_pass(
    booking_reference: str,
    db: AsyncSession = Depends(get_db),
):
    """Get sanitized public details of an appointment pass by booking reference."""
    appt = await get_appointment_by_ref(db, booking_reference)
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    queue = await db.get(Queue, appt.queue_id)
    queue_name = queue.name if queue else "Service"
    tz_str = await get_queue_timezone(db, appt.org_id)
    local_now = datetime.now(ZoneInfo(tz_str))

    # Mask phone number: e.g. +91 98****3210
    raw_phone = appt.customer_phone
    if len(raw_phone) > 6:
        masked_phone = raw_phone[:4] + "****" + raw_phone[-4:]
    else:
        masked_phone = "****"

    # Evaluate check-in window
    can_check_in = False
    window_msg = None

    if appt.status == AppointmentStatus.confirmed:
        appt_dt = datetime.combine(appt.appointment_date, appt.start_time, tzinfo=ZoneInfo(tz_str))
        win_before = queue.checkin_window_before if queue else 30
        win_after = queue.checkin_window_after if queue else 15

        early_window = appt_dt - timedelta(minutes=win_before)
        late_window = appt_dt + timedelta(minutes=win_after)

        if local_now < early_window:
            window_msg = f"Check-in opens {win_before} minutes before your slot."
        elif local_now > late_window:
            window_msg = "The check-in window for this appointment has expired."
        else:
            can_check_in = True
    elif appt.status == AppointmentStatus.checked_in:
        window_msg = "You are checked in! Please wait for your token to be called."

    token_number = None
    token_prefix = None
    tracking_id = None

    if appt.token_id:
        from app.models.token import Token
        tok = await db.get(Token, appt.token_id)
        if tok:
            token_number = tok.token_number
            token_prefix = queue.prefix if queue else "A"
            tracking_id = tok.tracking_id

    return AppointmentPublicPass(
        booking_reference=appt.booking_reference,
        org_id=appt.org_id,
        queue_id=appt.queue_id,
        queue_name=queue_name,
        customer_name=appt.customer_name,
        customer_phone_masked=masked_phone,
        appointment_date=appt.appointment_date,
        start_time=appt.start_time.strftime("%H:%M"),
        end_time=appt.end_time.strftime("%H:%M"),
        status=appt.status,
        pax_count=appt.pax_count or 1,
        can_check_in=can_check_in,
        check_in_window_message=window_msg,
        token_id=appt.token_id,
        token_number=token_number,
        token_prefix=token_prefix,
        tracking_id=tracking_id,
    )


@router.post("/appointments/{booking_reference}/check-in")
async def public_self_check_in(
    booking_reference: str,
    db: AsyncSession = Depends(get_db),
):
    """Customer performs self-service arrival check-in."""
    appt = await get_appointment_by_ref(db, booking_reference)
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if appt.status == AppointmentStatus.checked_in:
        return {"message": "Already checked in", "token_id": appt.token_id}

    if appt.status != AppointmentStatus.confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot check in appointment with status: {appt.status.value}",
        )

    queue = await db.get(Queue, appt.queue_id)
    tz_str = await get_queue_timezone(db, appt.org_id)
    local_now = datetime.now(ZoneInfo(tz_str))

    appt_dt = datetime.combine(appt.appointment_date, appt.start_time, tzinfo=ZoneInfo(tz_str))
    win_before = queue.checkin_window_before if queue else 30
    win_after = queue.checkin_window_after if queue else 15

    early_window = appt_dt - timedelta(minutes=win_before)
    late_window = appt_dt + timedelta(minutes=win_after)

    if local_now < early_window:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Check-in is not open yet. It opens {win_before} minutes before your slot time.",
        )
    if local_now > late_window:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The arrival check-in window for this appointment has expired. Please speak with reception.",
        )

    try:
        updated_appt, token = await check_in_appointment(db, appointment=appt, checked_in_by="self_qr")
        await db.commit()
        return {
            "message": "Checked in successfully",
            "token_id": str(token.id),
            "token_number": token.token_number,
            "prefix": queue.prefix if queue else "A",
            "tracking_id": str(token.tracking_id),
        }
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Check-in failed")


@router.post("/appointments/{booking_reference}/cancel")
async def public_cancel_appointment(
    booking_reference: str,
    pin: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Customer cancels their appointment booking."""
    appt = await get_appointment_by_ref(db, booking_reference)
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if appt.security_pin and pin and appt.security_pin != pin.strip():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid security PIN")

    if appt.status in (AppointmentStatus.cancelled, AppointmentStatus.completed, AppointmentStatus.serving):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel appointment in {appt.status.value} status",
        )

    appt.status = AppointmentStatus.cancelled
    await db.commit()
    return {"message": "Appointment cancelled successfully"}


@router.get("/branch/{org_slug}/directory")
@router.get("/branches/{org_slug}/directory")
async def public_get_branch_directory(
    org_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get active queues and branch info for the public booking portal."""
    org_res = await db.execute(
        select(Organization).where(Organization.slug == org_slug, Organization.is_active.is_(True))
    )
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    queues_res = await db.execute(
        select(Queue).where(
            Queue.org_id == org.id,
            Queue.is_active.is_(True),
            Queue.is_deleted.is_(False),
        ).order_by(Queue.created_at.asc())
    )
    queues_list = queues_res.scalars().all()

    tz_str = org.timezone or "Asia/Kolkata"
    now_local = datetime.now(ZoneInfo(tz_str))
    today_local = now_local.date().isoformat()

    return {
        "org_name": org.name,
        "org_slug": org.slug,
        "address": org.address,
        "phone_number": org.phone_number,
        "timezone": tz_str,
        "today_date": today_local,
        "queues": [
            {
                "id": str(q.id),
                "name": q.name,
                "prefix": q.prefix,
                "appointment_enabled": q.appointment_enabled if q.appointment_enabled is not None else True,
                "slot_duration": q.slot_duration or 15,
                "advance_booking_days": q.advance_booking_days or 7,
                "industry_template": q.industry_template or "general",
                "open_time": q.open_time or "00:00",
                "close_time": q.close_time or "23:59",
                "custom_fields": q.custom_fields or [],
            }
            for q in queues_list
            if (q.appointment_enabled if q.appointment_enabled is not None else True)
        ],
    }

