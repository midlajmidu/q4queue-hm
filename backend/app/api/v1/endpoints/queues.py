"""
app/api/v1/endpoints/queues.py
Queue management endpoints (admin protected).

Routes:
  POST   /queues                         → create queue
  GET    /queues                         → list org's queues
  GET    /queues/{queue_id}              → queue detail
  PATCH  /queues/{queue_id}/active       → activate / deactivate
  POST   /queues/{queue_id}/tokens       → customer joins (public)
  GET    /queues/{queue_id}/tokens/{n}   → customer token status (public)
  POST   /queues/{queue_id}/next         → admin calls next token
  POST   /queues/{queue_id}/serve/{n}    → admin invites specific token
  POST   /queues/{queue_id}/admin-join   → admin manually adds customer

SECURITY:
  - All authenticated routes use get_queue_for_org / get_admin_queue_for_org
    dependencies (see app/core/deps.py) which enforce WHERE org_id = :org_id
    at the DB level before any handler executes.
  - Public token status endpoint is scoped by token UUID, not enumerable
    token_number, except where queue_id + token_number is strictly needed for
    the customer join page (the customer already knows their number).
"""
import logging
import uuid
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    get_current_active_user,
    get_current_admin_or_staff,
    get_current_admin,
    get_queue_for_org,
    get_admin_queue_for_org,
)
from app.db.deps import get_db
from app.models.queue import Queue
from app.models.user import User
from app.schemas.queue import (
    JoinRequest,
    JoinResponse,
    NextResponse,
    NoTokenResponse,
    QueueCreate,
    QueueResponse,
    TokenResponse,
    AnnouncementUpdate,
)
from app.services import queue_service, token_service
from app.middleware.rate_limiter import join_rate_limit, api_rate_limit
from app.audit.service import record_event

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _raise_404(exc: Exception) -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _raise_400(exc: Exception) -> None:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _raise_403(exc: Exception) -> None:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# Admin — Queue Management
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=QueueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Queue",
    dependencies=[Depends(api_rate_limit)],
)
async def create_queue(
    body: QueueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> QueueResponse:
    """Create a new queue for the authenticated organization."""
    try:
        queue = await queue_service.create_queue(
            db, org_id=current_user.org_id, data=body
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return QueueResponse.model_validate(queue)


@router.get(
    "",
    response_model=list[QueueResponse],
    summary="List Queues",
)
async def list_queues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[QueueResponse]:
    """List all queues for the authenticated organization."""
    queues = await queue_service.list_queues(db, org_id=current_user.org_id)
    return [QueueResponse.model_validate(q) for q in queues]


@router.get(
    "/{queue_id}",
    response_model=QueueResponse,
    summary="Get Queue",
)
async def get_queue(
    queue: Queue = Depends(get_queue_for_org),
) -> QueueResponse:
    """
    Get a specific queue (tenant-scoped).
    SECURITY: queue ownership is verified by get_queue_for_org dependency.
    """
    return QueueResponse.model_validate(queue)


@router.get(
    "/{queue_id}/tokens",
    response_model=list[TokenResponse],
    summary="List tokens in a specific queue (Admin History)",
)
async def list_tokens(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_staff),
    queue: Queue = Depends(get_queue_for_org),
) -> list[TokenResponse]:
    """
    Retrieve all tokens in a queue (history/details view).
    SECURITY: queue ownership verified by dependency before token list is fetched.
    """
    tokens = await token_service.list_queue_tokens(
        db, queue_id=queue.id, org_id=queue.org_id
    )
    return [TokenResponse.model_validate(t) for t in tokens]


@router.patch(
    "/{queue_id}/active",
    response_model=QueueResponse,
    summary="Toggle Queue Active State",
)
async def toggle_queue_active(
    is_active: bool,
    db: AsyncSession = Depends(get_db),
    queue: Queue = Depends(get_admin_queue_for_org),
) -> QueueResponse:
    """
    Activate or deactivate a queue.
    SECURITY: queue ownership verified by dependency.
    """
    try:
        updated = await queue_service.set_queue_active(
            db, queue_id=queue.id, org_id=queue.org_id, is_active=is_active
        )
    except ValueError as exc:
        _raise_404(exc)
    return QueueResponse.model_validate(updated)


@router.patch(
    "/{queue_id}/announcement",
    response_model=QueueResponse,
    summary="Update Queue Announcement",
)
async def update_queue_announcement(
    body: AnnouncementUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    queue: Queue = Depends(get_admin_queue_for_org),
) -> QueueResponse:
    """
    Update the announcement for a queue.
    SECURITY: queue ownership verified by dependency.
    """
    try:
        announcement = body.announcement or ""
        updated = await queue_service.set_queue_announcement(
            db, queue_id=queue.id, org_id=queue.org_id, announcement=announcement
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
    except ValueError as exc:
        _raise_404(exc)
    return QueueResponse.model_validate(updated)


@router.delete(
    "/{queue_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Queue",
)
async def delete_queue(
    db: AsyncSession = Depends(get_db),
    queue: Queue = Depends(get_admin_queue_for_org),
) -> None:
    """
    Delete a queue and all its tokens.
    SECURITY: queue ownership verified by dependency.
    """
    try:
        await queue_service.delete_queue(db, queue_id=queue.id, org_id=queue.org_id)
    except ValueError as exc:
        _raise_404(exc)


@router.post(
    "/{queue_id}/reset",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reset Queue",
)
async def reset_queue(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    queue: Queue = Depends(get_admin_queue_for_org),
) -> None:
    """
    Reset a queue — delete all tokens, restart counter.
    SECURITY: queue ownership verified by dependency.
    """
    try:
        await queue_service.reset_queue(db, queue_id=queue.id, org_id=queue.org_id)
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
    except ValueError as exc:
        _raise_404(exc)


# ─────────────────────────────────────────────────────────────────────────────
# Public — Customer joins queue
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{queue_id}/tokens",
    response_model=JoinResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Take Token (Public)",
    dependencies=[Depends(join_rate_limit)],
    description=(
        "Public endpoint — no auth required. Customer provides name, age (optional), phone. "
        "Rate limited to 30/min per IP. Atomically assigns the next token number."
    ),
)
async def create_token(
    queue_id: uuid.UUID,
    body: JoinRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> JoinResponse:
    """
    Customer joins a queue.
    Returns token number and current position.

    SECURITY NOTE: This is a public, unauthenticated endpoint. The only data
    it acts on is the queue_id (public knowledge — printed on QR codes).
    The join_queue service uses _lock_queue_public which does NOT expose
    any other org's data; it just joins whatever public queue is at that ID.
    """
    try:
        result = await token_service.join_queue(db, queue_id=queue_id, data=body)
        # org_id comes from the queue row that was already fetched inside join_queue
        # We re-read it from the result rather than making a second DB round-trip
        from sqlalchemy import select as sa_select
        from app.models.queue import Queue as QueueModel
        q_res = await db.execute(sa_select(QueueModel).where(QueueModel.id == queue_id))
        queue = q_res.scalar_one_or_none()
        if queue:
            background_tasks.add_task(
                token_service.notify_queue_update,
                queue_id=queue_id,
                org_id=queue.org_id,
            )
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg.lower():
            _raise_404(exc)
        _raise_400(exc)

    await record_event(
        event_type="token.join",
        ip_address=request.client.host if request.client else None,
        resource_type="queue",
        resource_id=str(queue_id),
        details={"token_number": result.token_number, "customer_name": body.name},
    )
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Admin — Manually add customer
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{queue_id}/admin-join",
    response_model=JoinResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Customer (Admin)",
    description="Admin manually generates a token for a customer.",
)
async def admin_join(
    body: JoinRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    queue: Queue = Depends(get_queue_for_org),
) -> JoinResponse:
    """
    Admin manually creates a token.
    SECURITY: get_queue_for_org dependency verifies org ownership before join.
    """
    try:
        result = await token_service.join_queue(
            db, queue_id=queue.id, data=body, bypass_duplicate_check=True
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg.lower():
            _raise_404(exc)
        _raise_400(exc)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Admin — Invite specific token
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{queue_id}/serve/{token_number}",
    response_model=NextResponse,
    summary="Invite by Number (Admin)",
    description="Directly call a specific waiting token.",
)
async def serve_specific_token(
    token_number: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_staff),
    queue: Queue = Depends(get_queue_for_org),
) -> NextResponse:
    """
    Admin invites a specific token number.
    SECURITY: get_queue_for_org verifies org ownership before locking.
    """
    try:
        result = await token_service.serve_specific_token(
            db,
            queue_id=queue.id,
            org_id=current_user.org_id,
            user_id=current_user.id,
            token_number=token_number,
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
    except Exception as exc:
        msg = str(exc)
        if "not found" in msg.lower() or "not waiting" in msg.lower():
            _raise_400(exc)
        raise HTTPException(status_code=400, detail=msg)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Admin — Advance queue to next token (Auto)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{queue_id}/next",
    response_model=Union[NextResponse, NoTokenResponse],
    summary="Call Next Token (Admin)",
)
async def call_next(
    background_tasks: BackgroundTasks,
    action: str = "done",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_staff),
    queue: Queue = Depends(get_queue_for_org),
) -> Union[NextResponse, NoTokenResponse]:
    """
    Admin endpoint — move to the next waiting token.
    Concurrency-safe: row-level lock in token_service includes org_id,
    preventing cross-tenant DoS.
    """
    try:
        result = await token_service.call_next(
            db,
            queue_id=queue.id,
            org_id=current_user.org_id,
            user_id=current_user.id,
            action=action,
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
    except PermissionError as exc:
        _raise_403(exc)
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg.lower():
            _raise_404(exc)
        _raise_400(exc)

    if result is None:
        return NoTokenResponse()
    return result
