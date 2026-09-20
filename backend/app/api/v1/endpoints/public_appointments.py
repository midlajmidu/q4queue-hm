"""
app/api/v1/endpoints/public_appointments.py
Public endpoints for customer appointment bookings, slot availability, and day-of-service check-in.
"""
import uuid
from datetime import date, datetime, timedelta
from typing import Optional, List
from zoneinfo import ZoneInfo

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.models.queue import Queue
from app.models.organization import Organization
from app.models.parent_organization import ParentOrganization
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentPublicPass,
    AvailableSlotsResponse,
)
from app.core.tz_helpers import queue_business_date
from app.services.appointment_service import (
    get_available_slots,
    create_appointment,
    get_appointment_by_ref,
    get_queue_timezone,
    maybe_remove_appointment_token,
    _is_next_day_slot,
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
    business_date = queue_business_date(now_local, queue.open_time, queue.close_time)
    today_local = business_date.isoformat()

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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Customer submits an appointment booking."""
    try:
        appointment = await create_appointment(db, queue_id=queue_id, data=data, booked_by="customer_online")
        await db.commit()
        await db.refresh(appointment)
        queue = await db.get(Queue, queue_id)
        appointment.queue_name = queue.name if queue else ""
        appointment.is_next_day = _is_next_day_slot(
            appointment.start_time,
            queue.open_time if queue else None,
            queue.close_time if queue else None,
        )

        # Dispatch WhatsApp appointment booking confirmation
        if appointment.customer_phone:
            from app.services.notification_service import notify_appointment_booked
            org = await db.get(Organization, appointment.org_id)
            org_name = org.name if org else ""

            date_str = appointment.appointment_date.strftime("%d %b %Y")
            start_str = appointment.start_time.strftime("%I:%M %p").lstrip("0")
            end_str = appointment.end_time.strftime("%I:%M %p").lstrip("0")
            time_slot_str = f"{start_str} - {end_str}"

            background_tasks.add_task(
                notify_appointment_booked,
                appointment_id=appointment.id,
                org_id=appointment.org_id,
                queue_id=appointment.queue_id,
                customer_name=appointment.customer_name,
                customer_phone=appointment.customer_phone,
                booking_reference=appointment.booking_reference,
                appointment_date=date_str,
                time_slot=time_slot_str,
                queue_name=queue.name if queue else "",
                organization_name=org_name,
            )

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

    # Self check-in is disabled for customers (only staff can check in)
    can_check_in = False
    window_msg = "Please present your booking reference to reception staff upon arrival to check in."

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

    is_next_day = _is_next_day_slot(
        appt.start_time,
        queue.open_time if queue else None,
        queue.close_time if queue else None,
    )

    org = await db.get(Organization, appt.org_id)
    org_name = org.name if org else None
    org_slug = org.slug if org else None
    branch_address = org.address if org else None
    branch_phone = org.phone_number if org else None

    parent_org_name = None
    if org and org.parent_organization_id:
        parent_org = await db.get(ParentOrganization, org.parent_organization_id)
        if parent_org:
            parent_org_name = parent_org.name

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
        can_check_in=False,
        check_in_window_message=window_msg,
        token_id=appt.token_id,
        token_number=token_number,
        token_prefix=token_prefix,
        tracking_id=tracking_id,
        is_next_day=is_next_day,
        org_name=org_name,
        org_slug=org_slug,
        parent_org_name=parent_org_name,
        branch_address=branch_address,
        branch_phone=branch_phone,
        notes=appt.notes,
    )


@router.post("/appointments/{booking_reference}/check-in")
async def public_self_check_in(
    booking_reference: str,
    db: AsyncSession = Depends(get_db),
):
    """Public customer self check-in is disabled. Check-in is handled exclusively by staff."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Self-check-in is disabled. Please present your booking reference at the reception desk upon arrival.",
    )


@router.post("/appointments/{booking_reference}/cancel")
async def public_cancel_appointment(
    booking_reference: str,
    background_tasks: BackgroundTasks,
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
    token_removed = await maybe_remove_appointment_token(db, appt)
    await db.commit()

    # If a waiting token was removed, notify the queue WebSocket
    if token_removed:
        from app.services.token_service import notify_queue_update
        background_tasks.add_task(notify_queue_update, queue_id=appt.queue_id, org_id=appt.org_id)

    return {"message": "Appointment cancelled successfully"}


@router.get("/branch/{org_slug}/directory")
@router.get("/branches/{org_slug}/directory")
async def public_get_branch_directory(
    org_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get active queues and branch/organization info for the public booking portal."""
    # First check if org_slug matches an active branch (Organization)
    org_res = await db.execute(
        select(Organization).where(Organization.slug == org_slug, Organization.is_active.is_(True))
    )
    branch = org_res.scalar_one_or_none()

    if branch:
        # Check if this branch belongs to a ParentOrganization
        if branch.parent_organization_id:
            po = await db.get(ParentOrganization, branch.parent_organization_id)
            branches_res = await db.execute(
                select(Organization).where(
                    Organization.parent_organization_id == branch.parent_organization_id,
                    Organization.is_active.is_(True),
                )
            )
            all_branches = branches_res.scalars().all()
            branch_ids = [b.id for b in all_branches]
            branch_map = {b.id: b for b in all_branches}

            # Fetch queues for all branches in this org, current branch queues first
            queues_res = await db.execute(
                select(Queue).where(
                    Queue.org_id.in_(branch_ids),
                    Queue.is_active.is_(True),
                    Queue.is_deleted.is_(False),
                    Queue.appointment_enabled.is_(True),
                ).order_by(
                    case((Queue.org_id == branch.id, 0), else_=1),
                    Queue.created_at.asc(),
                )
            )
            queues_list = queues_res.scalars().all()

            tz_str = branch.timezone or (po.timezone if po else None) or "Asia/Kolkata"
            display_org_name = po.name if po else branch.name
            parent_org_name = po.name if po else None
            branch_name = branch.name
            display_slug = branch.slug
            address = branch.address or (po.address if po else None)
            phone_number = branch.phone_number or (po.contact_phone if po else None)
        else:
            branch_map = {branch.id: branch}
            queues_res = await db.execute(
                select(Queue).where(
                    Queue.org_id == branch.id,
                    Queue.is_active.is_(True),
                    Queue.is_deleted.is_(False),
                    Queue.appointment_enabled.is_(True),
                ).order_by(Queue.created_at.asc())
            )
            queues_list = queues_res.scalars().all()

            tz_str = branch.timezone or "Asia/Kolkata"
            display_org_name = branch.name
            parent_org_name = None
            branch_name = branch.name
            display_slug = branch.slug
            address = branch.address
            phone_number = branch.phone_number
    else:
        # Check if org_slug matches an active ParentOrganization
        po_res = await db.execute(
            select(ParentOrganization).where(ParentOrganization.slug == org_slug, ParentOrganization.is_active.is_(True))
        )
        po = po_res.scalar_one_or_none()
        if not po:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch or organization not found")

        branches_res = await db.execute(
            select(Organization).where(
                Organization.parent_organization_id == po.id,
                Organization.is_active.is_(True),
            )
        )
        all_branches = branches_res.scalars().all()
        branch_ids = [b.id for b in all_branches]
        branch_map = {b.id: b for b in all_branches}

        queues_res = await db.execute(
            select(Queue).where(
                Queue.org_id.in_(branch_ids),
                Queue.is_active.is_(True),
                Queue.is_deleted.is_(False),
                Queue.appointment_enabled.is_(True),
            ).order_by(Queue.created_at.asc())
        )
        queues_list = queues_res.scalars().all()

        first_branch = all_branches[0] if all_branches else None
        tz_str = po.timezone or (first_branch.timezone if first_branch else "Asia/Kolkata")
        display_org_name = po.name
        parent_org_name = po.name
        branch_name = first_branch.name if len(all_branches) == 1 else None
        display_slug = po.slug
        address = po.address or (first_branch.address if first_branch else None)
        phone_number = po.contact_phone or (first_branch.phone_number if first_branch else None)

    now_local = datetime.now(ZoneInfo(tz_str))
    # If any queue is currently in its overnight window before close_time, use that operating business date
    business_date = now_local.date()
    for q in queues_list:
        if q.open_time and q.close_time and q.open_time > q.close_time:
            q_bdate = queue_business_date(now_local, q.open_time, q.close_time)
            if q_bdate < business_date:
                business_date = q_bdate
                break
    today_local = business_date.isoformat()

    return {
        "org_name": display_org_name,
        "org_slug": display_slug,
        "parent_org_name": parent_org_name,
        "branch_name": branch_name,
        "address": address,
        "phone_number": phone_number,
        "timezone": tz_str,
        "today_date": today_local,
        "queues": [
            {
                "id": str(q.id),
                "name": q.name,
                "prefix": q.prefix,
                "branch_id": str(q.org_id),
                "branch_name": branch_map[q.org_id].name if q.org_id in branch_map else None,
                "appointment_enabled": q.appointment_enabled if q.appointment_enabled is not None else True,
                "slot_duration": q.slot_duration or 15,
                "advance_booking_days": q.advance_booking_days or 7,
                "industry_template": q.industry_template or "general",
                "open_time": q.open_time or "09:00",
                "close_time": q.close_time or "18:00",
                "custom_fields": q.custom_fields or [],
            }
            for q in queues_list
        ],
    }

