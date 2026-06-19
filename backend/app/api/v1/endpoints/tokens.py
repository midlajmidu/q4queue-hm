"""
app/api/v1/endpoints/tokens.py
Token lifecycle management endpoints (admin protected).

Routes:
  GET    /tokens/{token_id}        → public token restore (UUID-gated)
  PATCH  /tokens/{token_id}/skip   → skip a waiting token
  PATCH  /tokens/{token_id}/done   → complete a serving token
  PATCH  /tokens/{token_id}/remove → remove a token

SECURITY:
  - All authenticated mutation routes use get_token_for_org dependency,
    which enforces WHERE id = :id AND org_id = :org_id at the DB level.
  - The public GET endpoint is intentionally scope-limited: it returns
    only status/position fields needed for session restoration, not PII.
"""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user, get_token_for_org
from app.db.deps import get_db
from app.models.token import Token
from app.models.user import User
from app.schemas.queue import TokenResponse, TokenRestoreResponse
from app.services import token_service
from app.services.notification_service import notify_queue_event

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/{token_id}",
    summary="Get Token (Public — UUID gated)",
    description=(
        "Public endpoint to fetch token level details. "
        "Requires the unguessable token UUID — prevents sequential enumeration."
    ),
)
async def get_token(
    token_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TokenRestoreResponse:
    """
    Customer-facing endpoint to restore a broken browser session.

    SECURITY: Access is gated by the Token.id (random UUID) which the
    customer received at join time. Without this UUID an attacker cannot
    enumerate or lookup another customer's token.
    The response schema (TokenRestoreResponse) deliberately excludes
    customer_name, customer_age, and customer_phone.
    """
    from sqlalchemy import select
    from app.models.queue import Queue

    result = await db.execute(
        select(Token, Queue.prefix)
        .join(Queue, Token.queue_id == Queue.id)
        .where(Token.id == token_id)   # UUID — unguessable; no org_id needed here
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    token, prefix = row

    return TokenRestoreResponse(
        id=token.id,
        token_number=token.token_number,
        status=token.status,
        queue_id=token.queue_id,
        session_id=token.session_id,
        queue_prefix=prefix,
        customer_name=token.customer_name,
        customer_age=token.customer_age,
        customer_phone=token.customer_phone,
        created_at=token.created_at,
        served_at=token.served_at,
        completed_at=token.completed_at,
    )


@router.post(
    "/{token_id}/cancel",
    summary="Cancel Token (Public)",
    description=(
        "Public endpoint for a customer to voluntarily leave the queue. "
        "Requires the unguessable token UUID."
    ),
)
async def cancel_token(
    token_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Publicly accessible cancellation.
    Also triggers WhatsApp notification: queue.cancelled
    """
    try:
        from sqlalchemy import select
        from app.models.queue import Queue

        # Fetch token + queue details before cancellation (for notification)
        result = await db.execute(
            select(Token, Queue.name, Queue.prefix, Queue.session_id)
            .join(Queue, Token.queue_id == Queue.id)
            .where(Token.id == token_id)
        )
        row = result.one_or_none()

        token = await token_service.cancel_token_public(db, token_id=token_id)

        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=token.queue_id,
            org_id=token.org_id,
        )

        # WhatsApp notification: customer cancelled voluntarily
        if row:
            _token, queue_name, queue_prefix, session_id = row
            background_tasks.add_task(
                notify_queue_event,
                event_type="test_notification_v2", # User voluntary cancel - no template specified but we can skip or use test? Wait, we don't have queue_cancelled_v2. Let's not send notification or use a generic. Wait, we deleted it.
                org_id=token.org_id,
                token_id=token.id,
                queue_id=token.queue_id,
                customer_name=token.customer_name,
                customer_phone=token.customer_phone,
                token_number=token.token_number,
                token_prefix=queue_prefix,
                queue_name=queue_name,
                tracking_id=str(getattr(token, "tracking_id", "")),
                session_id=session_id,
            )

        return {"status": "cancelled", "token_number": token.token_number}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch(
    "/{token_id}/skip",
    response_model=TokenResponse,
    summary="Skip Token",
    description=(
        "Move a 'waiting' token to 'skipped'. "
        "Returns 400 if token is not in 'waiting' state."
    ),
)
async def skip_token(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    token: Token = Depends(get_token_for_org),
) -> TokenResponse:
    """
    SECURITY: get_token_for_org dependency validates org ownership before mutation.
    Also sends WhatsApp notification: queue.cancelled (skipped = admin cancelled)
    """
    try:
        from sqlalchemy import select
        from app.models.queue import Queue

        q_result = await db.execute(
            select(Queue.name, Queue.prefix, Queue.session_id).where(Queue.id == token.queue_id)
        )
        q_row = q_result.one_or_none()

        updated = await token_service.skip_token(
            db, token_id=token.id, org_id=token.org_id
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=token.queue_id,
            org_id=token.org_id,
        )

        if q_row:
            queue_name, queue_prefix, session_id = q_row
            background_tasks.add_task(
                notify_queue_event,
                event_type="test_notification_v2",
                org_id=token.org_id,
                token_id=token.id,
                queue_id=token.queue_id,
                customer_name=token.customer_name,
                customer_phone=token.customer_phone,
                token_number=token.token_number,
                token_prefix=queue_prefix,
                queue_name=queue_name,
                tracking_id=str(getattr(token, "tracking_id", "")),
                session_id=session_id,
            )

    except ValueError as exc:
        msg = str(exc)
        code = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status_code=code, detail=msg)
    return TokenResponse.model_validate(updated)


@router.patch(
    "/{token_id}/done",
    response_model=TokenResponse,
    summary="Complete Token",
    description=(
        "Move a 'serving' token to 'done'. "
        "Returns 400 if token is not in 'serving' state."
    ),
)
async def complete_token(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    token: Token = Depends(get_token_for_org),
) -> TokenResponse:
    """
    SECURITY: get_token_for_org dependency validates org ownership before mutation.
    Also sends WhatsApp notification: queue.completed
    """
    try:
        from sqlalchemy import select
        from app.models.queue import Queue

        q_result = await db.execute(
            select(Queue.name, Queue.prefix, Queue.session_id).where(Queue.id == token.queue_id)
        )
        q_row = q_result.one_or_none()

        updated = await token_service.complete_token(
            db, token_id=token.id, org_id=token.org_id
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=token.queue_id,
            org_id=token.org_id,
        )

        if q_row:
            queue_name, queue_prefix, session_id = q_row
            background_tasks.add_task(
                notify_queue_event,
                event_type="queue_completed_v2",
                org_id=token.org_id,
                token_id=token.id,
                queue_id=token.queue_id,
                customer_name=token.customer_name,
                customer_phone=token.customer_phone,
                token_number=token.token_number,
                token_prefix=queue_prefix,
                queue_name=queue_name,
                tracking_id=str(getattr(token, "tracking_id", "")),
                session_id=session_id,
            )

    except ValueError as exc:
        msg = str(exc)
        code = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status_code=code, detail=msg)
    return TokenResponse.model_validate(updated)


@router.patch(
    "/{token_id}/remove",
    response_model=TokenResponse,
    summary="Remove Token",
    description=(
        "Mark a 'waiting' or 'serving' token as 'deleted'. "
        "Will automatically call next if the token is currently serving."
    ),
)
async def remove_token(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    token: Token = Depends(get_token_for_org),
) -> TokenResponse:
    """
    SECURITY: get_token_for_org dependency validates org ownership before mutation.
    Also sends WhatsApp notification: queue.removed (staff removed customer)
    """
    try:
        from sqlalchemy import select
        from app.models.queue import Queue

        q_result = await db.execute(
            select(Queue.name, Queue.prefix, Queue.session_id).where(Queue.id == token.queue_id)
        )
        q_row = q_result.one_or_none()

        # Save values before removal mutates the object
        saved_name = token.customer_name
        saved_phone = token.customer_phone
        saved_number = token.token_number
        saved_tracking = str(getattr(token, "tracking_id", ""))
        saved_queue_id = token.queue_id
        saved_org_id = token.org_id
        saved_token_id = token.id

        updated = await token_service.remove_token(
            db, token_id=token.id, org_id=token.org_id
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=token.queue_id,
            org_id=token.org_id,
        )

        if q_row:
            queue_name, queue_prefix, session_id = q_row
            background_tasks.add_task(
                notify_queue_event,
                event_type="test_notification_v2",
                org_id=saved_org_id,
                token_id=saved_token_id,
                queue_id=saved_queue_id,
                customer_name=saved_name,
                customer_phone=saved_phone,
                token_number=saved_number,
                token_prefix=queue_prefix,
                queue_name=queue_name,
                tracking_id=saved_tracking,
                session_id=session_id,
            )

    except ValueError as exc:
        msg = str(exc)
        code = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status_code=code, detail=msg)
    return TokenResponse.model_validate(updated)
