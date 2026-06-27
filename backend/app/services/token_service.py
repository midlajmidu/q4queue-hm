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
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.queue import Queue
from app.models.token import Token, TokenStatus
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


async def _count_waiting_ahead(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    token_number: int,
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.waiting,
            Token.token_number < token_number,
        )
    )
    return result.scalar_one()


async def _current_serving_number(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
) -> int:
    result = await db.execute(
        select(Token.token_number)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.serving,
        )
        .order_by(Token.token_number.desc())
        .limit(1)
    )
    val = result.scalar_one_or_none()
    return val if val is not None else 0


async def _count_waiting(db: AsyncSession, *, queue_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.waiting,
        )
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

        # Build a fresh snapshot from a NEW session (to see committed data)
        async with AsyncSessionLocal() as snapshot_db:
            snapshot = await build_queue_snapshot(snapshot_db, queue_id=queue_id)

        snapshot["type"] = "queue_update"
        await publish_queue_update(redis, channel=channel, payload=snapshot)
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


# ─────────────────────────────────────────────────────────────────────────────
# Public API — Join (unauthenticated customer endpoint)
# ─────────────────────────────────────────────────────────────────────────────

async def join_queue(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    data: JoinRequest,
    bypass_duplicate_check: bool = False,
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
                db, queue_id=queue_id, token_number=existing_token.token_number
            )
            current_serving = await _current_serving_number(db, queue_id=queue_id)
            return JoinResponse(
                id=existing_token.id,
                token_number=existing_token.token_number,
                position=position,
                current_serving=current_serving,
                queue_prefix=queue.prefix,
                session_id=queue.token_session_id,
                tracking_id=existing_token.tracking_id,
                companion_names=existing_token.companion_names if hasattr(existing_token, 'companion_names') else [],
                is_existing=True,
            )

    # ── No active token found — create a new one ──
    queue.current_token_number += 1
    new_number = queue.current_token_number

    token = Token(
        org_id=queue.org_id,
        queue_id=queue.id,
        session_id=queue.token_session_id,
        token_number=new_number,
        status=TokenStatus.waiting,
        customer_name=data.name.strip(),
        customer_age=data.age,
        customer_phone=phone_cleaned,
        companion_names=data.companion_names,
        entry_type=data.entry_type or "qr",
    )
    db.add(token)
    await db.flush()

    position = await _count_waiting_ahead(db, queue_id=queue_id, token_number=new_number)
    current_serving = await _current_serving_number(db, queue_id=queue_id)

    return JoinResponse(
        id=token.id,
        token_number=new_number,
        position=position,
        current_serving=current_serving,
        queue_prefix=queue.prefix,
        session_id=queue.token_session_id,
        tracking_id=token.tracking_id,
        companion_names=token.companion_names if hasattr(token, 'companion_names') else [],
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

async def call_next(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    action: str = "done",
    line_number: int | None = None,
) -> NextResponse | None:
    now = datetime.now(timezone.utc)

    # SECURITY FIX: Lock acquired WITH org_id — no cross-tenant lock possible.
    queue = await _lock_queue_for_org(db, queue_id, org_id)

    if not queue.is_active:
        raise ValueError("Queue is not active")

    if action not in ("done", "skipped", "deleted"):
        raise ValueError("Invalid action")

    if action == "done":
        target_status = TokenStatus.done
    elif action == "deleted":
        target_status = TokenStatus.deleted
    else:
        target_status = TokenStatus.skipped

    # ── In multi-lane mode, only mark the token on the specified line as done ──
    if line_number is not None:
        serving_query = (
            select(Token)
            .where(
                Token.queue_id == queue_id,
                Token.org_id == org_id,
                Token.status == TokenStatus.serving,
                Token.assigned_line == line_number,
            )
        )
    else:
        # Single counter: mark all serving tokens as done
        serving_query = (
            select(Token)
            .where(
                Token.queue_id == queue_id,
                Token.org_id == org_id,
                Token.status == TokenStatus.serving,
            )
        )
    serving_result = await db.execute(serving_query)
    currently_serving_tokens = serving_result.scalars().all()
    
    for currently_serving in currently_serving_tokens:
        currently_serving.status = target_status
        currently_serving.completed_at = now
        if target_status == TokenStatus.done:
            queue.total_served += 1
            
        # If the action was 'done', trigger the completed notification immediately
        if action in ["done", "skipped", "deleted"]:
            try:
                from app.services.notification_service import notify_queue_event
                # Need the queue info for the notification
                q_result = await db.execute(select(Queue).where(Queue.id == queue_id))
                q_row = q_result.scalar_one_or_none()
                if q_row:
                    import asyncio
                    event_map = {
                        "done": "queue_completed_v2",
                        "skipped": "queue_skipped_v2",
                        "deleted": "queue_removed_v2"
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
                            session_id=q_row.session_id,
                        )
                    )
            except Exception as e:
                logger.error("Failed to dispatch completion notification: %s", e)

    # Find next waiting token
    next_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,           # ← TENANT ISOLATION
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
        # In multi-lane mode, assign the token to the specified line
        if line_number is not None:
            next_token.assigned_line = line_number

    await db.flush()

    if next_token is None:
        return None

    remaining = await _count_waiting(db, queue_id=queue_id)
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
) -> bool:
    """
    Mark the currently-serving token on a specific service line as 'done',
    WITHOUT automatically calling the next customer. Frees the lane.
    Returns True if a token was cleared, False if the line was already empty.
    """
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,
            Token.status == TokenStatus.serving,
            Token.assigned_line == line_number,
        )
    )
    token = result.scalar_one_or_none()
    if token is None:
        return False
    token.status = TokenStatus.done
    token.completed_at = now
    # Find the queue to update total_served
    q_res = await db.execute(select(Queue).where(Queue.id == queue_id))
    queue = q_res.scalar_one_or_none()
    if queue:
        queue.total_served += 1
    await db.flush()
    return True


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
    return token


async def skip_token(db: AsyncSession, *, token_id: uuid.UUID, org_id: uuid.UUID) -> Token:
    token = await _get_token_for_org(db, token_id=token_id, org_id=org_id)
    if token.status != TokenStatus.waiting:
        raise ValueError(f"Cannot skip token with status '{token.status}'")

    token.status = TokenStatus.skipped
    token.completed_at = datetime.now(timezone.utc)
    await db.flush()
    return token


async def complete_token(db: AsyncSession, *, token_id: uuid.UUID, org_id: uuid.UUID) -> Token:
    token = await _get_token_for_org(db, token_id=token_id, org_id=org_id)
    if token.status != TokenStatus.serving:
        raise ValueError(f"Cannot complete token with status '{token.status}'")

    queue = await _lock_queue_for_org(db, token.queue_id, org_id)

    token.status = TokenStatus.done
    token.served_at = token.served_at or datetime.now(timezone.utc)
    token.completed_at = datetime.now(timezone.utc)
    queue.total_served += 1
    await db.flush()
    return token


async def remove_token(db: AsyncSession, *, token_id: uuid.UUID, org_id: uuid.UUID, removed_by: str = "admin") -> Token:
    token = await _get_token_for_org(db, token_id=token_id, org_id=org_id)
    # SECURITY FIX: use org-scoped lock to avoid cross-tenant DoS
    queue = await _lock_queue_for_org(db, token.queue_id, org_id)

    if token.status == TokenStatus.waiting:
        token.status = TokenStatus.deleted
        token.removed_by = removed_by
        token.completed_at = datetime.now(timezone.utc)
        await db.flush()
    elif token.status == TokenStatus.serving:
        token.removed_by = removed_by
        await call_next(db, queue_id=queue.id, org_id=org_id, action="deleted")
        await db.refresh(token)
    else:
        raise ValueError("Cannot remove completed or already skipped/deleted token")
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

    if not queue.is_active:
        raise ValueError("Queue is not active")

    # SECURITY FIX: Token fetched with org_id in WHERE clause.
    specific_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,            # ← TENANT ISOLATION
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
        Token.status == TokenStatus.serving,
    ]
    if line_number is not None:
        where_clause.append(Token.assigned_line == line_number)
        
    await db.execute(
        update(Token)
        .where(*where_clause)
        .values(status=TokenStatus.skipped, completed_at=now)
    )

    specific_token.status = TokenStatus.serving
    specific_token.served_at = now
    specific_token.served_by_id = user_id
    specific_token.called_via_invite = True
    if line_number is not None:
        specific_token.assigned_line = line_number

    await db.flush()

    remaining = await _count_waiting(db, queue_id=queue_id)
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
    result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.org_id == org_id,            # ← TENANT ISOLATION
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
                    Token.token_number == serving_token_number,
                    Token.org_id == org_id,
                )
            )
            serving_token = tok_res.scalar_one_or_none()

            if serving_token:
                event_name = "queue_recalled_v2" if getattr(serving_token, "called_via_invite", False) else "queue_called_v2"
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
                    session_id=queue.session_id,
                    assigned_line=serving_token.assigned_line,
                )

            # ── 2. Check for tokens now at position == 3 or position == 5 ─────
            waiting_res = await db.execute(
                select(Token)
                .where(
                    Token.queue_id == queue_id,
                    Token.org_id == org_id,
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
                        session_id=queue.session_id,
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
                            session_id=queue.session_id,
                        )

            if waiting_tokens:
                await db.commit()

    except Exception as exc:
        logger.error("send_called_and_reminder_notifications error: %s", exc)
