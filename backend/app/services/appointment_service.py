"""
app/services/appointment_service.py
Service layer for advance appointment bookings, slot availability computation, and lifecycle transitions.
"""
import logging
import random
import string
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import List, Optional, Tuple, Any
from zoneinfo import ZoneInfo

from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.queue import Queue
from app.models.organization import Organization
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.appointment import (
    AppointmentCreate,
    StaffAppointmentCreate,
    TimeSlot,
    AvailableSlotsResponse,
)

logger = logging.getLogger(__name__)


def _generate_booking_reference() -> str:
    """Generate a clean, readable reference code e.g. APT-7492"""
    digits = "".join(random.choices(string.digits, k=4))
    letters = "".join(random.choices(string.ascii_uppercase, k=2))
    return f"APT-{letters}{digits}"


def _parse_time_hhmm(t_str: str) -> time:
    h, m = map(int, t_str.split(":"))
    return time(hour=h, minute=m)


def _format_time_hhmm(t: time) -> str:
    return t.strftime("%H:%M")


async def get_queue_timezone(db: AsyncSession, org_id: uuid.UUID) -> str:
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    return org.timezone if (org and org.timezone) else "Asia/Kolkata"


async def get_available_slots(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    target_date: date,
) -> AvailableSlotsResponse:
    """
    Compute time slots and remaining capacity for a given queue and date.
    """
    result = await db.execute(select(Queue).where(Queue.id == queue_id, Queue.is_deleted.is_(False)))
    queue = result.scalar_one_or_none()
    if not queue:
        raise ValueError("Queue not found")

    tz_str = await get_queue_timezone(db, queue.org_id)
    local_now = datetime.now(ZoneInfo(tz_str))
    today_date = local_now.date()

    if target_date < today_date:
        return AvailableSlotsResponse(queue_id=queue.id, date=target_date, slot_duration=queue.slot_duration, slots=[])

    max_future_date = today_date + timedelta(days=queue.advance_booking_days or 14)
    if target_date > max_future_date:
        return AvailableSlotsResponse(queue_id=queue.id, date=target_date, slot_duration=queue.slot_duration, slots=[])

    # Check blackout dates
    blackout_list = queue.blackout_dates or []
    if target_date.strftime("%Y-%m-%d") in blackout_list:
        return AvailableSlotsResponse(queue_id=queue.id, date=target_date, slot_duration=queue.slot_duration, slots=[])

    # Determine operating windows for target weekday
    weekday_map = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    target_day_name = weekday_map[target_date.weekday()]

    operating_windows: List[Tuple[time, time]] = []
    sched = queue.schedule_config or {}
    weekly = sched.get("weekly", {})

    if target_day_name in weekly and isinstance(weekly[target_day_name], list):
        for interval in weekly[target_day_name]:
            try:
                s_t = _parse_time_hhmm(interval["start"])
                e_t = _parse_time_hhmm(interval["end"])
                if s_t < e_t:
                    operating_windows.append((s_t, e_t))
            except Exception:
                continue
    else:
        # Fallback to queue.open_time and close_time
        open_t = _parse_time_hhmm(queue.open_time) if queue.open_time else time(9, 0)
        close_t = _parse_time_hhmm(queue.close_time) if queue.close_time else time(18, 0)
        if open_t < close_t:
            operating_windows.append((open_t, close_t))

    slot_duration = queue.slot_duration or 15
    slot_capacity = queue.slot_capacity or 1
    min_lead_time = queue.min_lead_time_mins or 60

    generated_slots: List[TimeSlot] = []

    for start_w, end_w in operating_windows:
        cur_dt = datetime.combine(target_date, start_w)
        end_dt = datetime.combine(target_date, end_w)
        step = timedelta(minutes=slot_duration)

        while cur_dt + step <= end_dt:
            slot_start = cur_dt.time()
            slot_end = (cur_dt + step).time()

            # Check lead time if today
            is_in_past = False
            if target_date == today_date:
                slot_full_dt = datetime.combine(target_date, slot_start, tzinfo=ZoneInfo(tz_str))
                earliest_valid = local_now + timedelta(minutes=min_lead_time)
                if slot_full_dt < earliest_valid:
                    is_in_past = True

            generated_slots.append(
                TimeSlot(
                    start_time=_format_time_hhmm(slot_start),
                    end_time=_format_time_hhmm(slot_end),
                    capacity=slot_capacity,
                    booked_count=0,
                    available=not is_in_past,
                )
            )
            cur_dt += step

    if not generated_slots:
        return AvailableSlotsResponse(queue_id=queue.id, date=target_date, slot_duration=slot_duration, slots=[])

    # Query existing active appointments for that queue and date
    appt_counts_q = await db.execute(
        select(Appointment.start_time, func.count(Appointment.id))
        .where(
            Appointment.queue_id == queue_id,
            Appointment.appointment_date == target_date,
            Appointment.status.notin_([AppointmentStatus.cancelled, AppointmentStatus.no_show]),
        )
        .group_by(Appointment.start_time)
    )
    booked_counts_map = {_format_time_hhmm(row[0]): row[1] for row in appt_counts_q.all()}

    for s in generated_slots:
        booked = booked_counts_map.get(s.start_time, 0)
        s.booked_count = booked
        if booked >= s.capacity or not s.available:
            s.available = False

    return AvailableSlotsResponse(
        queue_id=queue.id,
        date=target_date,
        slot_duration=slot_duration,
        slots=generated_slots,
    )


async def create_appointment(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    data: AppointmentCreate,
    booked_by: str = "customer_online",
) -> Appointment:
    """
    Atomically reserve and create an appointment slot.
    Uses SELECT FOR UPDATE on the queue row to prevent concurrent overbooking.
    """
    res = await db.execute(
        select(Queue).where(Queue.id == queue_id, Queue.is_deleted.is_(False)).with_for_update()
    )
    queue = res.scalar_one_or_none()
    if not queue:
        raise ValueError("Queue not found")

    if not queue.appointment_enabled and booked_by == "customer_online":
        raise ValueError("Appointments are not enabled for this service")

    start_t = _parse_time_hhmm(data.start_time)
    slot_dur = queue.slot_duration or 15
    end_dt = datetime.combine(data.appointment_date, start_t) + timedelta(minutes=slot_dur)
    end_t = end_dt.time()

    # Verify slot availability under lock
    existing_count_res = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.queue_id == queue_id,
            Appointment.appointment_date == data.appointment_date,
            Appointment.start_time == start_t,
            Appointment.status.notin_([AppointmentStatus.cancelled, AppointmentStatus.no_show]),
        )
    )
    current_booked = existing_count_res.scalar() or 0
    cap = queue.slot_capacity or 1

    if current_booked >= cap:
        raise ValueError("This time slot is fully booked. Please choose another slot.")

    # Generate unique reference
    booking_ref = ""
    for _ in range(5):
        candidate = _generate_booking_reference()
        ref_check = await db.execute(select(Appointment.id).where(Appointment.booking_reference == candidate))
        if not ref_check.scalar_one_or_none():
            booking_ref = candidate
            break

    if not booking_ref:
        booking_ref = f"APT-{uuid.uuid4().hex[:6].upper()}"

    initial_status = (
        AppointmentStatus.pending_approval
        if queue.approval_mode == "requires_approval" and booked_by == "customer_online"
        else AppointmentStatus.confirmed
    )

    clean_phone = data.customer_phone.strip()

    appointment = Appointment(
        org_id=queue.org_id,
        queue_id=queue.id,
        booking_reference=booking_ref,
        security_pin=data.security_pin or "".join(random.choices(string.digits, k=4)),
        customer_name=data.customer_name.strip(),
        customer_phone=clean_phone,
        customer_email=data.customer_email.strip() if data.customer_email else None,
        pax_count=data.pax_count or 1,
        appointment_date=data.appointment_date,
        start_time=start_t,
        end_time=end_t,
        status=initial_status,
        custom_data=data.custom_data,
        field_schema=queue.custom_fields,
        booked_by=booked_by,
    )

    db.add(appointment)
    await db.flush()

    return appointment


async def check_in_appointment(
    db: AsyncSession,
    *,
    appointment: Appointment,
    session_id: Optional[uuid.UUID] = None,
    checked_in_by: str = "self_qr",
) -> Tuple[Appointment, Any]:
    """
    Check in an arriving appointment holder:
    1. Validates that the queue has an active session today or for the specified session_id.
    2. Atomically increments token sequence and creates a Token with entry_type='appointment'.
    3. Links the appointment to the new token and session.
    4. Updates appointment status to checked_in.
    """
    from app.models.token import Token, TokenStatus
    from app.models.session import Session
    from app.core.tz_helpers import queue_business_date, safe_zoneinfo
    from app.services.token_service import _lock_queue_public, _count_waiting_ahead, _current_serving_number
    from app.websocket.pubsub import publish_queue_update
    from app.websocket.helpers import build_queue_snapshot

    if appointment.status == AppointmentStatus.checked_in and appointment.token_id:
        existing_token = await db.get(Token, appointment.token_id)
        if existing_token:
            return appointment, existing_token

    if appointment.status in (AppointmentStatus.cancelled, AppointmentStatus.no_show):
        raise ValueError(f"Cannot check in an appointment with status: {appointment.status.value}")

    queue = await _lock_queue_public(db, appointment.queue_id)
    if not queue.is_active or queue.is_deleted:
        raise ValueError("Queue is not currently active")

    session = None
    target_session_id = None

    if session_id:
        session = await db.get(Session, session_id)
        if session and session.queue_id == queue.id:
            target_session_id = session.id

    if not session:
        if queue.token_session_id:
            session = await db.get(Session, queue.token_session_id)
            if session and session.is_active:
                target_session_id = session.id

    if not session or not session.is_active:
        # Fallback: look up any active session for this queue matching the appointment date or latest active
        s_res = await db.execute(
            select(Session).where(
                Session.queue_id == queue.id,
                Session.session_date == appointment.appointment_date,
                Session.is_active.is_(True),
            ).limit(1)
        )
        session = s_res.scalar_one_or_none()
        if not session:
            # Look for any current active session for this queue
            s_res2 = await db.execute(
                select(Session).where(
                    Session.queue_id == queue.id,
                    Session.is_active.is_(True),
                ).order_by(Session.created_at.desc()).limit(1)
            )
            session = s_res2.scalar_one_or_none()

        if session:
            target_session_id = session.id
            queue.token_session_id = session.id

    if not session or not session.is_active or not target_session_id:
        raise ValueError("No active queue session is currently running for this queue. Please start or open a session first.")

    now_utc = datetime.now(timezone.utc) if "timezone" in globals() else datetime.utcnow()

    # Assign next token number
    max_token_res = await db.execute(
        select(func.max(Token.token_number)).where(
            Token.queue_id == queue.id,
            Token.session_id == target_session_id,
        )
    )
    max_existing_number = max_token_res.scalar() or 0
    next_number = max(queue.current_token_number + 1, max_existing_number + 1)
    queue.current_token_number = next_number

    token = Token(
        org_id=queue.org_id,
        queue_id=queue.id,
        session_id=target_session_id,
        token_number=next_number,
        status=TokenStatus.waiting,
        customer_name=appointment.customer_name,
        customer_phone=appointment.customer_phone,
        pax_count=appointment.pax_count or 1,
        called_via_invite=False,
        entry_type="appointment",
        is_whatsapp_enabled=True,
        custom_data=appointment.custom_data,
        field_schema=appointment.field_schema or queue.custom_fields,
    )
    db.add(token)
    await db.flush()

    # Link appointment
    appointment.token_id = token.id
    appointment.session_id = target_session_id
    appointment.status = AppointmentStatus.checked_in
    appointment.checked_in_at = func.now()
    appointment.checked_in_by = checked_in_by
    await db.flush()

    try:
        from app.services.token_service import notify_queue_update
        await notify_queue_update(queue.id, queue.org_id)
    except Exception as e:
        logger.warning("Failed to publish queue update on appointment check-in: %s", e)

    return appointment, token


async def list_appointments(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    queue_id: Optional[uuid.UUID] = None,
    target_date: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[AppointmentStatus] = None,
    search: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> List[Appointment]:
    """List appointments for staff with optional filters."""
    query = (
        select(Appointment)
        .where(Appointment.org_id == org_id)
        .order_by(Appointment.appointment_date.asc(), Appointment.start_time.asc())
    )

    if queue_id:
        query = query.where(Appointment.queue_id == queue_id)
    if target_date:
        query = query.where(Appointment.appointment_date == target_date)
    elif start_date and end_date:
        query = query.where(Appointment.appointment_date.between(start_date, end_date))

    if status:
        query = query.where(Appointment.status == status)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Appointment.customer_name.ilike(search_term),
                Appointment.customer_phone.ilike(search_term),
                Appointment.booking_reference.ilike(search_term),
            )
        )

    query = query.limit(limit).offset(offset)
    res = await db.execute(query)
    return list(res.scalars().all())


async def get_appointment_by_ref(
    db: AsyncSession,
    booking_reference: str,
) -> Optional[Appointment]:
    """Fetch appointment by its unique booking reference code."""
    res = await db.execute(
        select(Appointment).where(Appointment.booking_reference == booking_reference.strip().upper())
    )
    return res.scalar_one_or_none()
