"""
app/services/token_service.py
Token engine — the concurrency-critical core of the system.

KEY DESIGN: Every mutating operation uses SELECT FOR UPDATE on the queue row.
This serialises concurrent requests at the database level, guaranteeing:
  - No duplicate token numbers
  - No double-serving
  - No skipped positions under parallel load

SECURITY: All admin-facing operations that acquire row locks now include
org_id in the initial locking query to prevent cross-tenant DoS attacks.
Public (unauthenticated) operations use the unsafe lock only on public queues.
"""
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.queue import Queue
from app.models.token import Token, TokenStatus
from app.models.session import Session
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.queue import JoinResponse, NextResponse, JoinRequest
from app.websocket.connection_manager import manager as ws_manager
from app.websocket.pubsub import publish_queue_update
from app.websocket.helpers import build_queue_snapshot
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _lock_queue_public(db: AsyncSession, queue_id: uuid.UUID) -> Queue:
    """
    Public path: acquire a row-level EXCLUSIVE lock on the queue.
    Used only for unauthenticated customer join flows where no org_id
    is available. No admin/mutating operation should call this.
    """
    result = await db.execute(
        select(Queue)
        .where(Queue.id == queue_id)
        .with_for_update()
    )
    queue = result.scalar_one_or_none()
    if queue is None:
        raise ValueError("Queue not found")
    return queue


async def _lock_queue_for_org(
    db: AsyncSession,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
) -> Queue:
    """
    Admin/staff path: acquire a row-level EXCLUSIVE lock on the queue
    and simultaneously assert tenant ownership.

    SECURITY FIX: org_id is included inside the FOR UPDATE query so that
    the lock is never acquired on a row that belongs to another org.
    A missing row (wrong org OR genuinely absent) raises ValueError → 404.
    """
    result = await db.execute(
        select(Queue)
        .where(
            Queue.id == queue_id,
            Queue.org_id == org_id,   # ← TENANT ISOLATION inside lock
        )
        .with_for_update()
    )
    queue = result.scalar_one_or_none()
    if queue is None:
        raise ValueError("Queue not found")
    return queue


async def _require_current_operational_session(
    db: AsyncSession,
    queue: Queue,
    *,
    allow_paused: bool = False,
    enforce_hours: bool = False,
) -> Session:
    """Reject mutations against ended, stale, or paused sessions."""
    if not queue.is_active or queue.is_deleted or not queue.token_session_id:
        raise ValueError("Queue is not active")

    session = await db.get(Session, queue.token_session_id)
    if (
        session is None
        or session.queue_id != queue.id
        or session.org_id != queue.org_id
        or not session.is_active
    ):
        raise ValueError("This queue session is closed")
    if not allow_paused and (queue.is_paused or session.is_paused):
        raise ValueError("This queue session is paused")
    return session


def _validate_service_line(queue: Queue, line_number: int | None, *, required: bool = False) -> None:
    configured_lines = int(queue.service_lines or 0)
    if line_number is None:
        if required:
            raise ValueError("A service line is required")
        return
    if configured_lines <= 0:
        raise ValueError("This queue does not use service lines")
    if line_number < 1 or line_number > configured_lines:
        raise ValueError(f"Service line must be between 1 and {configured_lines}")


async def _log_audit(
    db: AsyncSession,
    *,
    event_type: str,
    org_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    resource_type: Optional[str] = "token",
    resource_id: Optional[str] = None,
    details: Optional[dict] = None,
) -> None:
    try:
        from app.models.organization import Organization
        from app.audit.service import record_event

        parent_org_id = None
        if org_id:
            res = await db.execute(
                select(Organization.parent_organization_id).where(Organization.id == org_id)
            )
            parent_org_id = res.scalar_one_or_none()

        sanitized_details = dict(details) if isinstance(details, dict) else {}
        for pii_key in ("name", "customer_name", "phone", "customer_phone", "age", "customer_age", "custom_data"):
            sanitized_details.pop(pii_key, None)

        await record_event(
            event_type=event_type,
            org_id=org_id,
            parent_org_id=parent_org_id,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            details=sanitized_details,
        )
    except Exception as e:
        logger.error("Error in token_service _log_audit: %s", e)



async def _count_waiting_ahead(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    token_number: int,
    session_id: Optional[uuid.UUID] = None,
) -> int:
    where_clause = [
        Token.queue_id == queue_id,
        Token.status == TokenStatus.waiting,
        Token.token_number < token_number,
    ]
    if session_id:
        where_clause.append(Token.session_id == session_id)
    result = await db.execute(
        select(func.count())
        .select_from(Token)
        .where(*where_clause)
    )
    return result.scalar_one()


async def _current_serving_number(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = None,
) -> int:
    where_clause = [
        Token.queue_id == queue_id,
        Token.status == TokenStatus.serving,
    ]
    if session_id:
        where_clause.append(Token.session_id == session_id)
    result = await db.execute(
        select(Token.token_number)
        .where(*where_clause)
        .order_by(Token.token_number.desc())
        .limit(1)
    )
    val = result.scalar_one_or_none()
    return val if val is not None else 0


async def _count_waiting(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = None,
) -> int:
    where_clause = [
        Token.queue_id == queue_id,
        Token.status == TokenStatus.waiting,
    ]
    if session_id:
        where_clause.append(Token.session_id == session_id)
    result = await db.execute(
        select(func.count())
        .select_from(Token)
        .where(*where_clause)
    )
    return result.scalar_one()


async def notify_queue_update(queue_id: uuid.UUID, org_id: uuid.UUID) -> None:
    """
    Build a fresh snapshot and publish it to Redis.
    Designed to be run as a BackgroundTask (post-commit).
    """
    try:
        from app.redis.client import get_redis
        redis = get_redis()
        channel = ws_manager.get_channel(str(org_id), str(queue_id))

        from app.websocket.helpers import build_queue_snapshots_dual
        # Build fresh snapshots in a single DB pass (cuts queries by 50%)
        async with AsyncSessionLocal() as snapshot_db:
            snapshots = await build_queue_snapshots_dual(snapshot_db, queue_id=queue_id)

        payload = {
            "type": "queue_update",
            "public": snapshots["public"],
            "admin": snapshots["admin"]
        }
        await publish_queue_update(redis, channel=channel, payload=payload)
    except Exception as exc:
        logger.error("Failed to publish background queue update: %s", exc)

async def notify_new_customer(queue_id: uuid.UUID, org_id: uuid.UUID, token: str, name: str, time_str: str) -> None:
    try:
        from app.redis.client import get_redis
        redis = get_redis()
        channel = ws_manager.get_channel(str(org_id), str(queue_id))
        
        payload = {
            "type": "new_customer",
            "token": token,
            "name": name,
            "time": time_str
        }
        await publish_queue_update(redis, channel=channel, payload=payload)
    except Exception as exc:
        logger.error("Failed to publish new customer event: %s", exc)


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$")


def validate_and_sanitize_custom_data(
    custom_fields_def: Optional[list],
    custom_data: Optional[dict],
    *,
    top_level_name: Optional[str] = None,
    top_level_phone: Optional[str] = None,
    top_level_pax: Optional[int] = None,
) -> dict:
    """
    Validates custom_data against the queue's configured custom_fields schema.
    Enforces required fields, supported types, value constraints, and strips unknown keys.
    """
    if custom_data is not None and not isinstance(custom_data, dict):
        raise ValueError("custom_data must be a JSON object")

    data = dict(custom_data) if custom_data else {}

    # Check overall payload size (max 100KB serialized)
    import json
    if len(json.dumps(data)) > 100000:
        raise ValueError("custom_data payload exceeds maximum allowed size (100KB)")

    if not custom_fields_def:
        # If no custom fields configured on queue, strip arbitrary custom_data keys
        return {}

    sanitized = {}

    for field in custom_fields_def:
        if isinstance(field, dict):
            key = field.get("key")
            label = field.get("label", key)
            field_type = field.get("type", "text")
            is_required = bool(field.get("required", False))
            options = field.get("options") or []
        else:
            key = getattr(field, "key", None)
            label = getattr(field, "label", key)
            field_type = getattr(field, "type", "text")
            is_required = bool(getattr(field, "required", False))
            options = getattr(field, "options", []) or []

        if not key:
            continue

        val = data.get(key)

        # Standard top-level field fallbacks
        if (val is None or (isinstance(val, str) and not val.strip())):
            if key == "name" and top_level_name:
                val = top_level_name
            elif key == "phone" and top_level_phone:
                val = top_level_phone
            elif key in ("pax", "pax_count") and top_level_pax is not None:
                val = top_level_pax

        # Required check
        if is_required:
            if val is None or (isinstance(val, str) and not val.strip()):
                raise ValueError(f"'{label}' is required")

        if val is None or (isinstance(val, str) and not val.strip()):
            continue

        # Type validations
        field_type_str = str(field_type).lower()

        if field_type_str == "text":
            val_str = str(val).strip()
            if len(val_str) > 500:
                raise ValueError(f"'{label}' cannot exceed 500 characters")
            sanitized[key] = val_str

        elif field_type_str == "textarea":
            val_str = str(val).strip()
            if len(val_str) > 2000:
                raise ValueError(f"'{label}' cannot exceed 2000 characters")
            sanitized[key] = val_str

        elif field_type_str == "number":
            try:
                num_val = float(val) if "." in str(val) else int(val)
            except (ValueError, TypeError):
                raise ValueError(f"'{label}' must be a valid number")
            if num_val < -1000000 or num_val > 1000000:
                raise ValueError(f"'{label}' value is out of bounds (-1,000,000 to 1,000,000)")
            sanitized[key] = num_val

        elif field_type_str == "phone":
            val_str = str(val).strip()
            digits = re.sub(r"\D", "", val_str)
            if len(digits) < 7 or len(digits) > 15:
                raise ValueError(f"'{label}' must be a valid phone number (7 to 15 digits)")
            sanitized[key] = val_str

        elif field_type_str == "email":
            val_str = str(val).strip()
            if not EMAIL_REGEX.match(val_str):
                raise ValueError(f"'{label}' must be a valid email address")
            sanitized[key] = val_str

        elif field_type_str == "date":
            val_str = str(val).strip()
            if not DATE_REGEX.match(val_str):
                raise ValueError(f"'{label}' must be a valid date (YYYY-MM-DD)")
            sanitized[key] = val_str

        elif field_type_str == "select":
            val_str = str(val).strip()
            if options and val_str not in options:
                raise ValueError(f"Invalid selection for '{label}'. Allowed options: {', '.join(options)}")
            sanitized[key] = val_str

        else:
            sanitized[key] = str(val).strip()[:500]

    return sanitized


async def join_queue(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    data: JoinRequest,
    bypass_duplicate_check: bool = False,
    bypass_operating_hours: bool = False,
) -> JoinResponse:
    """
    Atomically assign the next token number.
    Uses the public lock (no org_id) because this is a customer endpoint.
    Caller must handle commit and background notification.

    DUPLICATE PREVENTION:
        Before creating a new token, checks if the same phone number already
        has an active (waiting/serving) token in this queue's current session.
        If so, returns the existing token data — no new row is created.
    """
    queue = await _lock_queue_public(db, queue_id)

    if not queue.is_active:
        raise ValueError("Queue is not accepting customers")

    if getattr(queue, "is_paused", False):
        raise ValueError("Queue is temporarily not accepting walk-ins")

    # Validate and sanitize custom_data against queue.custom_fields
    phone_cleaned_initial = data.phone.strip() if data.phone else ""
    digits_initial = re.sub(r"\D", "", phone_cleaned_initial)
    phone_cleaned_initial = f"+{digits_initial}" if phone_cleaned_initial.startswith("+") else digits_initial

    data.custom_data = validate_and_sanitize_custom_data(
        queue.custom_fields,
        data.custom_data,
        top_level_name=data.name,
        top_level_phone=phone_cleaned_initial,
        top_level_pax=data.pax_count,
    )

    # The queue's current-session pointer is authoritative. Never trust a public
    # or admin request to select a different session.
    target_session_id = queue.token_session_id
    if not target_session_id:
        raise ValueError("No active queue session is available")

    session = await db.get(Session, target_session_id)
    from app.models.organization import Organization
    from zoneinfo import ZoneInfo
    org = await db.scalar(select(Organization).where(Organization.id == queue.org_id))
    tz_str = org.timezone if org and org.timezone else "Asia/Kolkata"
    local_now = datetime.now(ZoneInfo(tz_str))
    from app.core.tz_helpers import queue_business_date
    business_date = queue_business_date(local_now, queue.open_time, queue.close_time)
    if (
        session is None
        or session.queue_id != queue.id
        or session.org_id != queue.org_id
        or not session.is_active
    ):
        raise ValueError("This queue session is closed and is no longer accepting new tokens.")
    if session.is_paused:
        raise ValueError("This queue session is temporarily on a break and not accepting walk-ins.")

    # ── Duplicate prevention: check for existing active token by phone ──
    phone_cleaned = data.phone.strip()
    if not bypass_duplicate_check:
        existing_result = await db.execute(
            select(Token)
            .where(
                Token.queue_id == queue_id,
                Token.session_id == queue.token_session_id,
                Token.customer_phone == phone_cleaned,
                Token.status.in_([TokenStatus.waiting, TokenStatus.serving]),
            )
            .order_by(Token.created_at.desc())
            .limit(1)
        )
        existing_token = existing_result.scalar_one_or_none()

        if existing_token is not None:
            logger.info(
                "Duplicate join prevented: phone=%s already has active token #%d in queue %s",
                phone_cleaned, existing_token.token_number, queue_id,
            )
            position = await _count_waiting_ahead(
                db, queue_id=queue_id, token_number=existing_token.token_number, session_id=queue.token_session_id
            )
            current_serving = await _current_serving_number(db, queue_id=queue_id, session_id=queue.token_session_id)
            return JoinResponse(
                id=existing_token.id,
                token_number=existing_token.token_number,
                position=position,
                current_serving=current_serving,
                queue_prefix=queue.prefix,
                session_id=queue.token_session_id,
                tracking_id=existing_token.tracking_id,
                pax_count=existing_token.pax_count if hasattr(existing_token, 'pax_count') else 1,
                is_existing=True,
            )

    # ── No active token found — create a new one ──
    from app.services.entitlement_service import consume
    await consume(
        db,
        org_id=queue.org_id,
        key="tokens.created.max_per_session",
        scope_type="session",
        scope_id=target_session_id,
    )

    max_token_res = await db.execute(
        select(func.max(Token.token_number)).where(
            Token.queue_id == queue_id,
            Token.session_id == target_session_id,
        )
    )
    max_existing_number = max_token_res.scalar() or 0
    next_number = max(queue.current_token_number + 1, max_existing_number + 1)
    queue.current_token_number = next_number
    new_number = next_number

    token = Token(
        org_id=queue.org_id,
        queue_id=queue.id,
        session_id=target_session_id,
        token_number=new_number,
        status=TokenStatus.waiting,
        customer_name=data.name.strip(),
        customer_age=data.age,
        customer_phone=phone_cleaned,
        pax_count=data.pax_count,
        called_via_invite=False,
        entry_type=data.entry_type,
        is_whatsapp_enabled=data.send_whatsapp,
        custom_data=data.custom_data,
        field_schema=queue.custom_fields,
    )
    db.add(token)
    await db.flush()

    position = await _count_waiting_ahead(db, queue_id=queue_id, token_number=new_number, session_id=target_session_id)
    current_serving = await _current_serving_number(db, queue_id=queue_id, session_id=target_session_id)

    return JoinResponse(
        id=token.id,
        token_number=new_number,
        position=position,
        current_serving=current_serving,
        queue_prefix=queue.prefix,
        session_id=target_session_id,
        tracking_id=token.tracking_id,
        pax_count=token.pax_count if hasattr(token, 'pax_count') else 1,
    )


async def cancel_token_public(db: AsyncSession, *, token_id: uuid.UUID) -> Token:
    """
    Public path: allow a customer to cancel their own token using its secret UUID.
    This effectively calls remove_token but doesn't require admin auth.
    """
    result = await db.execute(select(Token).where(Token.id == token_id))
    token = result.scalar_one_or_none()
    if token is None:
        raise ValueError("Token not found")

    if token.status not in (TokenStatus.waiting, TokenStatus.serving):
        raise ValueError(f"Cannot cancel token with status '{token.status}'")

    # Reuse the removal logic
    return await remove_token(db, token_id=token.id, org_id=token.org_id, removed_by="customer")


# ─────────────────────────────────────────────────────────────────────────────
# Admin API — Call Next
# ─────────────────────────────────────────────────────────────────────────────


def _mark_line_completed(token: Token, line_number: int) -> bool:
    """
    Marks a specific line as completed for the token.
    Returns True if the token is completely done (all assigned/shared lines are completed).
    """
    from sqlalchemy.orm.attributes import flag_modified
    comps = list(getattr(token, "completed_lines", []))
    if line_number not in comps:
        comps.append(line_number)
        token.completed_lines = comps
        flag_modified(token, "completed_lines")

    main_done = token.assigned_line in comps
    shared_lines = getattr(token, "shared_lines", [])
    all_shared_done = all(sl in comps for sl in shared_lines)

    return main_done and all_shared_done

async def call_next(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    user_id: Optional[uuid.UUID] = None,
    action: str = "done",
    line_number: int | None = None,
) -> NextResponse | None:
    now = datetime.now(timezone.utc)

    # SECURITY FIX: Lock acquired WITH org_id — no cross-tenant lock possible.
    queue = await _lock_queue_for_org(db, queue_id, org_id)

    await _require_current_operational_session(
        db, queue, enforce_hours=True
    )
    _validate_service_line(queue, line_number)

    if action not in ("done", "skipped", "deleted"):
        raise ValueError("Invalid action")

    if action == "done":
        target_status = TokenStatus.done
    elif action == "deleted":
        target_status = TokenStatus.deleted
    else:
        target_status = TokenStatus.skipped

    # ── Handle currently serving token(s) ──
    if line_number is not None:
        # Find token assigned or shared to this line
        serving_query = select(Token).where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.serving
        )
        serving_result = await db.execute(serving_query)
        all_serving = serving_result.scalars().all()
        
        currently_serving_tokens = []
        for t in all_serving:
            if t.assigned_line == line_number or line_number in getattr(t, "shared_lines", []):
                currently_serving_tokens.append(t)
    else:
        serving_query = select(Token).where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.serving
        )
        serving_result = await db.execute(serving_query)
        currently_serving_tokens = serving_result.scalars().all()
    
    for currently_serving in currently_serving_tokens:
        is_fully_done = True
        
        if line_number is not None and action == "done":
            is_fully_done = _mark_line_completed(currently_serving, line_number)
            if is_fully_done:
                currently_serving.status = target_status
                currently_serving.completed_at = now
                currently_serving.completed_by_id = user_id
                queue.total_served += 1
        else:
            currently_serving.status = target_status
            if target_status == TokenStatus.done:
                currently_serving.completed_at = now
                currently_serving.completed_by_id = user_id
                queue.total_served += 1
                if getattr(currently_serving, "entry_type", None) == "appointment":
                    await db.execute(
                        update(Appointment)
                        .where(Appointment.token_id == currently_serving.id)
                        .values(status=AppointmentStatus.completed)
                    )
            elif target_status == TokenStatus.deleted:
                currently_serving.deleted_at = now
            else:
                from sqlalchemy.orm.attributes import flag_modified
                currently_serving.skipped_at = now
                currently_serving.shared_lines = []
                currently_serving.completed_lines = []
                flag_modified(currently_serving, "shared_lines")
                flag_modified(currently_serving, "completed_lines")
                
        # Audit log token status transition
        if is_fully_done:
            audit_tag = "COMPLETE_TOKEN" if action == "done" else "SKIP_TOKEN" if action == "skipped" else "REMOVE_TOKEN"
            await _log_audit(
                db,
                event_type=audit_tag,
                org_id=org_id,
                user_id=user_id,
                resource_type="token",
                resource_id=str(currently_serving.id),
                details={"token_number": currently_serving.token_number, "customer_name": currently_serving.customer_name}
            )

        # If the action was 'done' and token is fully done, trigger notification
        if is_fully_done and action in ["done", "skipped", "deleted"]:
            try:
                from app.services.notification_service import notify_queue_event
                # Need the queue info for the notification
                q_result = await db.execute(select(Queue).where(Queue.id == queue_id))
                q_row = q_result.scalar_one_or_none()
                if q_row:
                    import asyncio
                    event_map = {
                        "done": "queue_completed_v3",
                        "skipped": "queue_skipped_v3",
                        "deleted": "queue_removed_v3"
                    }
                    # Dispatch fire-and-forget task
                    asyncio.create_task(
                        notify_queue_event(
                            event_type=event_map[action],
                            org_id=org_id,
                            token_id=currently_serving.id,
                            queue_id=queue_id,
                            customer_name=currently_serving.customer_name,
                            customer_phone=currently_serving.customer_phone,
                            token_number=currently_serving.token_number,
                            token_prefix=q_row.prefix,
                            queue_name=q_row.name,
                            tracking_id=str(getattr(currently_serving, "tracking_id", "")),
                            session_id=q_row.token_session_id,
                        )
                    )
            except Exception as e:
                logger.error("Failed to dispatch completion notification: %s", e)

    # If in multi-lane, check if there's any shared token left in this lane
    if line_number is not None:
        check_query = select(Token).where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.serving
        )
        check_result = await db.execute(check_query)
        all_active = check_result.scalars().all()
        for t in all_active:
            comps = getattr(t, "completed_lines", [])
            if (t.assigned_line == line_number or line_number in getattr(t, "shared_lines", [])) and line_number not in comps:
                # There is still an active token hanging out in this lane, don't pull a new one!
                return None

    # Find next waiting token
    next_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,           # ← TENANT ISOLATION
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.waiting,
        )
        .order_by(Token.token_number.asc())
        .limit(1)
        .with_for_update(skip_locked=False)
    )
    next_token = next_result.scalar_one_or_none()

    if next_token:
        next_token.status = TokenStatus.serving
        next_token.served_at = now
        next_token.served_by_id = user_id
        next_token.called_via_invite = False
        next_token.completed_at = None
        next_token.completed_by_id = None
        # In multi-lane mode, assign the token to the specified line
        if line_number is not None:
            next_token.assigned_line = line_number

        if getattr(next_token, "entry_type", None) == "appointment":
            await db.execute(
                update(Appointment)
                .where(Appointment.token_id == next_token.id)
                .values(status=AppointmentStatus.serving)
            )

        await _log_audit(
            db,
            event_type="CALL_NEXT_TOKEN",
            org_id=org_id,
            user_id=user_id,
            resource_type="token",
            resource_id=str(next_token.id),
            details={"token_number": next_token.token_number, "customer_name": next_token.customer_name, "line_number": line_number}
        )


    await db.flush()

    if next_token is None:
        return None

    remaining = await _count_waiting(
        db, queue_id=queue_id, session_id=queue.token_session_id
    )
    return NextResponse(
        serving=next_token.token_number,
        remaining=remaining,
    )



# ─────────────────────────────────────────────────────────────────────────────
# Admin API — Clear a specific service line (multi-lane mode)
# ─────────────────────────────────────────────────────────────────────────────

async def clear_line(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    line_number: int,
    user_id: uuid.UUID,
) -> bool:
    """
    Mark the currently-serving token on a specific service line as 'done',
    WITHOUT automatically calling the next customer. Frees the lane.
    Returns True if a token was cleared, False if the line was already empty.
    """
    now = datetime.now(timezone.utc)
    queue = await _lock_queue_for_org(db, queue_id, org_id)
    await _require_current_operational_session(db, queue, allow_paused=True)
    _validate_service_line(queue, line_number, required=True)
    result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.serving,
        )
    )
    tokens = result.scalars().all()
    token = None
    for t in tokens:
        if t.assigned_line == line_number or line_number in getattr(t, "shared_lines", []):
            token = t
            break
            
    if token is None:
        return False
        
    is_fully_done = _mark_line_completed(token, line_number)
    if is_fully_done:
        token.status = TokenStatus.done
        token.completed_at = now
        token.completed_by_id = user_id
        queue.total_served += 1
    await db.flush()
    await _log_audit(
        db,
        event_type="CLEAR_SERVICE_LINE",
        org_id=org_id,
        user_id=user_id,
        resource_type="token",
        resource_id=str(token.id),
        details={
            "token_number": token.token_number,
            "line_number": line_number,
            "fully_completed": is_fully_done,
        },
    )
    return True


async def share_token(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    user_id: Optional[uuid.UUID] = None,
    token_number: int,
    line_number: int,
) -> Token:
    """
    Share a currently serving token to an additional service line.
    The token will appear as 'serving' on both the original lane and this new lane.
    """
    from sqlalchemy.orm.attributes import flag_modified

    queue = await _lock_queue_for_org(db, queue_id, org_id)
    await _require_current_operational_session(db, queue)
    _validate_service_line(queue, line_number, required=True)
    # Find the serving token by token_number
    result = await db.execute(
        select(Token).where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,
            Token.session_id == queue.token_session_id,
            Token.token_number == token_number,
            Token.status == TokenStatus.serving,
        )
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise ValueError(f"No serving token #{token_number} found")

    # Validate target line is not already the assigned line
    if token.assigned_line == line_number:
        raise ValueError(f"Token is already assigned to lane {line_number}")

    # Validate the target lane is not already in shared_lines
    shared = list(token.shared_lines or [])
    if line_number in shared:
        raise ValueError(f"Token is already shared to lane {line_number}")

    # Validate target line is not already in completed_lines
    comps = list(token.completed_lines or [])
    if line_number in comps:
        raise ValueError(f"Token has already completed service on lane {line_number}")

    # Limit total serving lanes to pax_count
    pax_count = getattr(token, "pax_count", 1) or 1
    current_lanes = 1 + len(shared)
    if current_lanes >= pax_count:
        raise ValueError(f"Token cannot be shared to more than {pax_count} lane(s) based on Pax count ({pax_count})")

    # Add the lane to shared_lines
    shared.append(line_number)
    token.shared_lines = shared
    flag_modified(token, "shared_lines")

    await db.flush()
    return token


async def remove_shared_token(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    user_id: Optional[uuid.UUID] = None,
    line_number: int,
) -> bool:
    """
    Remove a lane's participation in a shared token WITHOUT marking the token as done.
    This simply frees the lane. The token continues serving on its other lanes.
    Returns True if a shared token was found and updated.
    """
    from sqlalchemy.orm.attributes import flag_modified

    queue = await _lock_queue_for_org(db, queue_id, org_id)
    await _require_current_operational_session(db, queue, allow_paused=True)
    _validate_service_line(queue, line_number, required=True)
    result = await db.execute(
        select(Token).where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.serving,
        )
    )
    tokens = result.scalars().all()

    for token in tokens:
        shared = list(token.shared_lines or [])
        if line_number in shared:
            shared.remove(line_number)
            token.shared_lines = shared
            flag_modified(token, "shared_lines")

            # Check if this token is now fully done (because it was the last lane holding it)
            comps = list(token.completed_lines or [])
            main_done = token.assigned_line in comps
            all_shared_done = all(sl in comps for sl in shared)
            
            if main_done and all_shared_done:
                token.status = TokenStatus.done
                from datetime import datetime, timezone
                token.completed_at = datetime.now(timezone.utc)
                if user_id:
                    token.completed_by_id = user_id
                
                # Increment total_served
                queue = await db.execute(select(Queue).where(Queue.id == token.queue_id))
                q = queue.scalar_one_or_none()
                if q:
                    q.total_served += 1

            await db.flush()
            return True

    return False

# ─────────────────────────────────────────────────────────────────────────────
# Admin API — Token state transitions (skip / done / remove)
# ─────────────────────────────────────────────────────────────────────────────

async def _get_token_for_org(
    db: AsyncSession,
    token_id: uuid.UUID,
    org_id: uuid.UUID,
) -> Token:
    """
    SECURITY: Fetches token with org_id in WHERE clause.
    Returns same 404 for not-found and wrong-org to prevent tenant enumeration.
    """
    result = await db.execute(
        select(Token).where(
            Token.id == token_id,
            Token.org_id == org_id,   # ← TENANT ISOLATION
        )
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise ValueError("Token not found")
    queue = await _lock_queue_for_org(db, token.queue_id, org_id)
    await _require_current_operational_session(db, queue, allow_paused=True)
    if token.session_id != queue.token_session_id:
        raise ValueError("Historical tokens cannot be modified")
    return token


async def skip_token(db: AsyncSession, *, token_id: uuid.UUID, org_id: uuid.UUID, user_id: uuid.UUID | None = None) -> Token:
    token = await _get_token_for_org(db, token_id=token_id, org_id=org_id)
    if token.status != TokenStatus.waiting:
        raise ValueError(f"Cannot skip token with status '{token.status}'")

    token.status = TokenStatus.skipped
    token.skipped_at = datetime.now(timezone.utc)
    await db.flush()

    await _log_audit(
        db,
        event_type="SKIP_TOKEN",
        org_id=org_id,
        user_id=user_id,
        resource_type="token",
        resource_id=str(token.id),
        details={"token_number": token.token_number, "customer_name": token.customer_name}
    )
    return token


async def complete_token(db: AsyncSession, *, token_id: uuid.UUID, org_id: uuid.UUID, user_id: uuid.UUID) -> Token:
    token = await _get_token_for_org(db, token_id=token_id, org_id=org_id)
    if token.status != TokenStatus.serving:
        raise ValueError(f"Cannot complete token with status '{token.status}'")

    queue = await _lock_queue_for_org(db, token.queue_id, org_id)

    token.status = TokenStatus.done
    token.served_at = token.served_at or datetime.now(timezone.utc)
    token.completed_at = datetime.now(timezone.utc)
    token.completed_by_id = user_id
    queue.total_served += 1
    await db.flush()

    await _log_audit(
        db,
        event_type="COMPLETE_TOKEN",
        org_id=org_id,
        user_id=user_id,
        resource_type="token",
        resource_id=str(token.id),
        details={"token_number": token.token_number, "customer_name": token.customer_name}
    )
    return token


async def remove_token(db: AsyncSession, *, token_id: uuid.UUID, org_id: uuid.UUID, user_id: uuid.UUID | None = None, removed_by: str = "admin") -> Token:
    token = await _get_token_for_org(db, token_id=token_id, org_id=org_id)
    # SECURITY FIX: use org-scoped lock to avoid cross-tenant DoS
    queue = await _lock_queue_for_org(db, token.queue_id, org_id)

    now = datetime.now(timezone.utc)

    if token.status == TokenStatus.waiting:
        token.status = TokenStatus.deleted
        token.removed_by = removed_by
        token.deleted_at = now
        await db.flush()
    elif token.status == TokenStatus.serving:
        # ─── BUG FIX ───────────────────────────────────────────────────────────
        # Previously this called call_next(action="deleted") which marks ALL
        # currently serving tokens as deleted (in single-counter mode) — wiping
        # every active service line.  Instead, only mark THIS specific token as
        # deleted and free its assigned line.  The counter slot simply becomes
        # "Available" again without auto-promoting the next waiting customer.
        # ────────────────────────────────────────────────────────────────────────
        token.status = TokenStatus.deleted
        token.removed_by = removed_by
        token.deleted_at = now
        await db.flush()

    else:
        raise ValueError("Cannot remove completed or already skipped/deleted token")

    await _log_audit(
        db,
        event_type="REMOVE_TOKEN",
        org_id=org_id,
        user_id=user_id,
        resource_type="token",
        resource_id=str(token.id),
        details={"token_number": token.token_number, "customer_name": token.customer_name, "removed_by": removed_by}
    )
    return token


async def undo_remove_token(db: AsyncSession, *, token_id: uuid.UUID, org_id: uuid.UUID, user_id: uuid.UUID | None = None) -> Token:
    token = await _get_token_for_org(db, token_id=token_id, org_id=org_id)
    # SECURITY FIX: use org-scoped lock to avoid cross-tenant DoS
    await _lock_queue_for_org(db, token.queue_id, org_id)

    if token.status != TokenStatus.deleted:
        raise ValueError("Cannot undo removal for a token that is not deleted")

    token.status = TokenStatus.waiting
    token.removed_by = None
    token.completed_at = None
    token.deleted_at = None
    await db.flush()

    await _log_audit(
        db,
        event_type="RESTORE_TOKEN",
        org_id=org_id,
        user_id=user_id,
        resource_type="token",
        resource_id=str(token.id),
        details={"token_number": token.token_number, "customer_name": token.customer_name}
    )
    return token



# ─────────────────────────────────────────────────────────────────────────────
# Admin API — Serve Specific Token
# ─────────────────────────────────────────────────────────────────────────────

async def serve_specific_token(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    token_number: int,
    line_number: int | None = None,
) -> NextResponse:
    now = datetime.now(timezone.utc)

    # SECURITY FIX: Lock acquired WITH org_id — no cross-tenant lock possible.
    queue = await _lock_queue_for_org(db, queue_id, org_id)

    await _require_current_operational_session(
        db, queue, enforce_hours=True
    )
    _validate_service_line(queue, line_number)

    # SECURITY FIX: Token fetched with org_id and session_id in WHERE clause.
    specific_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,            # ← TENANT ISOLATION
            Token.session_id == queue.token_session_id,
            Token.token_number == token_number,
        )
        .with_for_update(skip_locked=False)
    )
    specific_token = specific_result.scalar_one_or_none()

    if not specific_token:
        raise ValueError("Token not found")
    if specific_token.status not in (TokenStatus.waiting, TokenStatus.skipped):
        raise ValueError("Token is not waiting or skipped")

    # Mark currently-serving token as skipped on the target line (or all if single-counter)
    where_clause = [
        Token.queue_id == queue_id,
        Token.org_id == org_id,
        Token.session_id == queue.token_session_id,
        Token.status == TokenStatus.serving,
    ]
    if line_number is not None:
        where_clause.append(Token.assigned_line == line_number)
        
    await db.execute(
        update(Token)
        .where(*where_clause)
        .values(status=TokenStatus.skipped, skipped_at=now)
    )

    from sqlalchemy.orm.attributes import flag_modified
    specific_token.status = TokenStatus.serving
    specific_token.served_at = now
    specific_token.served_by_id = user_id
    specific_token.called_via_invite = True
    specific_token.completed_at = None
    specific_token.completed_by_id = None
    specific_token.recalled_at = now
    specific_token.shared_lines = []
    specific_token.completed_lines = []
    flag_modified(specific_token, "shared_lines")
    flag_modified(specific_token, "completed_lines")

    if line_number is not None:
        specific_token.assigned_line = line_number

    await db.flush()

    remaining = await _count_waiting(
        db, queue_id=queue_id, session_id=queue.token_session_id
    )
    return NextResponse(
        serving=specific_token.token_number,
        remaining=remaining,
    )


async def list_queue_tokens(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
) -> list[Token]:
    """Retrieve all tokens in a queue (history/details view)."""
    from app.models.queue import Queue
    result = await db.execute(
        select(Token)
        .join(Queue, Queue.id == Token.queue_id)
        .where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,            # ← TENANT ISOLATION
            Token.session_id == Queue.token_session_id, # ← Only current session
        )
        .order_by(Token.token_number.asc())
    )
    return list(result.scalars().all())


async def send_called_and_reminder_notifications(
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    serving_token_number: int,
) -> None:
    """
    After a token is called (serving), fire two types of notifications:
    1. queue.called  → to the customer whose token was just called
    2. queue.reminder → to any waiting customer now at position == 3 (once only)

    Designed to run as a BackgroundTask (post-commit).
    """
    try:
        from app.services.notification_service import notify_queue_event

        async with AsyncSessionLocal() as db:
            # ── 1. Find the just-served token ───────────────────────────────
            from app.models.queue import Queue

            q_res = await db.execute(
                select(Queue).where(Queue.id == queue_id)
            )
            queue = q_res.scalar_one_or_none()
            if queue is None:
                return

            tok_res = await db.execute(
                select(Token).where(
                    Token.queue_id == queue_id,
                    Token.session_id == queue.token_session_id,
                    Token.token_number == serving_token_number,
                    Token.org_id == org_id,
                )
            )
            serving_token = tok_res.scalar_one_or_none()

            if serving_token:
                event_name = "queue_recalled_v2" if getattr(serving_token, "called_via_invite", False) else "queue_called_v3"
                await notify_queue_event(
                    event_type=event_name,
                    org_id=org_id,
                    token_id=serving_token.id,
                    queue_id=queue_id,
                    customer_name=serving_token.customer_name,
                    customer_phone=serving_token.customer_phone,
                    token_number=serving_token.token_number,
                    token_prefix=queue.prefix,
                    queue_name=queue.name,
                    tracking_id=str(getattr(serving_token, "tracking_id", "")),
                    session_id=queue.token_session_id,
                    assigned_line=serving_token.assigned_line,
                )

            # ── 2. Check for tokens now at position == 5 or == 3 ──────────────
            waiting_res = await db.execute(
                select(Token)
                .where(
                    Token.queue_id == queue_id,
                    Token.org_id == org_id,
                    Token.session_id == queue.token_session_id,
                    Token.status == TokenStatus.waiting,
                )
                .order_by(Token.token_number.asc())
                .limit(5)
            )
            waiting_tokens = waiting_res.scalars().all()

            for i, wt in enumerate(waiting_tokens):
                position = i + 1  # 1-indexed position
                if position == 3 and not wt.whatsapp_reminder_sent:
                    await notify_queue_event(
                        event_type="queue_nearby_3_v2",
                        org_id=org_id,
                        token_id=wt.id,
                        queue_id=queue_id,
                        customer_name=wt.customer_name,
                        customer_phone=wt.customer_phone,
                        token_number=wt.token_number,
                        token_prefix=queue.prefix,
                        queue_name=queue.name,
                        position=position,
                        tracking_id=str(getattr(wt, "tracking_id", "")),
                        session_id=queue.token_session_id,
                    )
                    # Mark reminder as sent so we don't re-send
                    wt.whatsapp_reminder_sent = True
                
                elif position == 5:
                    # Check if we already sent a position 5 reminder for this token
                    from app.whatsapp.models import WhatsAppMessage
                    msg_check = await db.execute(
                        select(WhatsAppMessage).where(
                            WhatsAppMessage.token_id == wt.id,
                            WhatsAppMessage.event_type == "queue_nearby_5_v2"
                        )
                    )
                    already_sent_5 = msg_check.scalars().first() is not None
                    
                    if not already_sent_5:
                        await notify_queue_event(
                            event_type="queue_nearby_5_v2",
                            org_id=org_id,
                            token_id=wt.id,
                            queue_id=queue_id,
                            customer_name=wt.customer_name,
                            customer_phone=wt.customer_phone,
                            token_number=wt.token_number,
                            token_prefix=queue.prefix,
                            queue_name=queue.name,
                            position=position,
                            tracking_id=str(getattr(wt, "tracking_id", "")),
                            session_id=queue.token_session_id,
                        )

            if waiting_tokens:
                await db.commit()

    except Exception as exc:
        logger.error("send_called_and_reminder_notifications error: %s", exc)
