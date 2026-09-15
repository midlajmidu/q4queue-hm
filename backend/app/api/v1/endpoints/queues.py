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
from datetime import datetime, timezone, date
from zoneinfo import ZoneInfo
from typing import Union, Optional
import hmac
import hashlib
import base64
import pyotp

def get_qr_secret_seed(queue_id: uuid.UUID, secret_key: str) -> str:
    """Generate a deterministic base32 seed for TOTP based on queue_id and app secret."""
    h = hmac.new(secret_key.encode(), str(queue_id).encode(), hashlib.sha256).digest()
    return base64.b32encode(h).decode('utf-8')[:32]


from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    get_current_active_user,
    require_branch_admin_or_staff,
    require_branch_admin,
    get_queue_for_org,
    get_admin_queue_for_org,
    get_admin_or_staff_queue_for_org,
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
    QueueUpdate,
    QueueResponse,
    TokenResponse,
    AnnouncementUpdate,
)
from app.services import queue_service, token_service
from app.middleware.rate_limiter import api_rate_limit, join_rate_limit
from app.redis.client import get_redis
from app.core.config import get_settings
from app.audit.service import record_event
from app.services.notification_service import notify_queue_event

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
    current_user: User = Depends(require_branch_admin()),
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
    """List all queues for the authenticated organization with operating hours evaluation."""
    try:
        if not current_user.org_id:
            return []
        queues = await queue_service.list_queues(db, org_id=current_user.org_id)
        return [QueueResponse.model_validate(q) for q in queues]
    except Exception as exc:
        logger.error("Failed to list queues: %s", exc, exc_info=True)
        return []


@router.get(
    "/trash",
    response_model=list[QueueResponse],
    summary="List Deleted Queues",
)
async def list_trash_queues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
) -> list[QueueResponse]:
    """List all soft-deleted queues for the authenticated organization."""
    try:
        if not current_user.org_id:
            return []
        queues = await queue_service.list_trash_queues(db, org_id=current_user.org_id)
        return [QueueResponse.model_validate(q) for q in queues]
    except Exception as exc:
        logger.error("Failed to list trash queues: %s", exc, exc_info=True)
        return []

from app.schemas.session import SessionResponse, PaginatedSessionResponse, SessionCreate

@router.post(
    "/{queue_id}/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Queue Session",
)
async def create_queue_session(
    queue_id: uuid.UUID,
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
) -> SessionResponse:
    """Create a new session for a queue on a specified date. Limit 1 session per day per queue."""
    from app.services.session_service import create_queue_session as create_session_service
    try:
        session = await create_session_service(
            db, queue_id=queue_id, org_id=current_user.org_id, data=body
        )
        return SessionResponse.model_validate(session)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get(
    "/{queue_id}/active-session",
    response_model=SessionResponse,
    summary="Get Current Session",
)
async def get_active_session(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
) -> SessionResponse:
    """Return the queue's current session without mutating operational state."""
    queue = await queue_service.get_queue_or_404(
        db, queue_id=queue_id, org_id=current_user.org_id
    )
    if not queue.token_session_id:
        raise HTTPException(status_code=404, detail="This queue has no current session.")
    from app.models.session import Session
    session = await db.get(Session, queue.token_session_id)
    if session is None or session.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Current session not found.")
    return SessionResponse.model_validate(session)


@router.post(
    "/{queue_id}/active-session",
    response_model=SessionResponse,
    summary="Create Today's Session If Missing",
)
async def ensure_active_session(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
) -> SessionResponse:
    """Explicit command for creating today's session; never reopens an ended one."""
    from app.services.session_service import get_or_create_active_session
    try:
        session = await get_or_create_active_session(
            db, queue_id=queue_id, org_id=current_user.org_id
        )
        return SessionResponse.model_validate(session)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get(
    "/{queue_id}/sessions",
    response_model=PaginatedSessionResponse,
    summary="List Queue Sessions",
)
async def list_queue_sessions(
    queue_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
    date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin_or_staff()),
) -> PaginatedSessionResponse:
    """Lists historical sessions for a queue."""
    from app.services.session_service import list_sessions
    try:
        res = await list_sessions(
            db, 
            queue_id=queue_id, 
            org_id=current_user.org_id, 
            limit=limit, 
            offset=offset,
            session_date=date,
        )
        return PaginatedSessionResponse(**res)
    except ValueError as exc:
        _raise_404(exc)


@router.get(
    "/{queue_id}",
    response_model=QueueResponse,
    summary="Get Queue",
)
async def get_queue(
    db: AsyncSession = Depends(get_db),
    queue: Queue = Depends(get_queue_for_org),
) -> QueueResponse:
    """
    Get a specific queue (tenant-scoped) with operating hours evaluation.
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
    current_user: User = Depends(require_branch_admin_or_staff()),
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


@router.put(
    "/{queue_id}",
    response_model=QueueResponse,
    summary="Update Queue Details",
)
async def update_queue_details(
    queue_id: uuid.UUID,
    data: QueueUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    queue: Queue = Depends(get_admin_queue_for_org),
) -> QueueResponse:
    """
    Update queue details like name, prefix, and timings.
    SECURITY: queue ownership verified by dependency.
    """
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return QueueResponse.model_validate(queue)
        
    try:
        updated = await queue_service.update_queue(
            db,
            queue_id=queue.id,
            org_id=queue.org_id,
            **update_data
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
        return QueueResponse.model_validate(updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update queue: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e) if str(e) else "Failed to update queue")


@router.patch(
    "/{queue_id}/active",
    response_model=QueueResponse,
    summary="Toggle Queue Active State",
)
async def toggle_queue_active(
    is_active: bool,
    background_tasks: BackgroundTasks,
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
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
    except ValueError as exc:
        _raise_404(exc)
    return QueueResponse.model_validate(updated)


@router.patch(
    "/{queue_id}/paused",
    response_model=QueueResponse,
    summary="Toggle Queue Paused State",
)
async def toggle_queue_paused(
    is_paused: bool,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    queue: Queue = Depends(get_admin_queue_for_org),
) -> QueueResponse:
    """
    Pause or resume a queue.
    SECURITY: queue ownership verified by dependency.
    """
    try:
        updated = await queue_service.set_queue_paused(
            db, queue_id=queue.id, org_id=queue.org_id, is_paused=is_paused
        )
        # Notify clients about the queue state change
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
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
    "/{queue_id}/restore",
    response_model=QueueResponse,
    summary="Restore Queue",
)
async def restore_queue(
    queue_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> QueueResponse:
    """
    Restore a soft-deleted queue.
    SECURITY: Only Global/Org Admins (or impersonated branch admins) can do this.
    """
    if current_user.role not in ["super_admin", "organization_admin"] and not getattr(request.state, "is_impersonating", False):
        raise HTTPException(status_code=403, detail="Only Global Admins can restore queues.")
    try:
        updated = await queue_service.restore_queue(db, queue_id=queue_id, org_id=current_user.org_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return QueueResponse.model_validate(updated)




# ─────────────────────────────────────────────────────────────────────────────
# Public — Queue Status (no auth, used by join page on mount)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{queue_id}/public-status",
    summary="Public Queue Status",
    description=(
        "Public, unauthenticated endpoint. Returns minimal queue/session status "
        "so the join page can detect a past/closed session immediately on mount, "
        "before the WebSocket connects."
    ),
)
async def get_queue_public_status(
    queue_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select as sa_select
    from app.models.session import Session as SessionModel
    from app.models.organization import Organization as OrgModel
    from datetime import datetime, timezone
    from zoneinfo import ZoneInfo

    result = await db.execute(sa_select(Queue).where(Queue.id == queue_id))
    queue = result.scalar_one_or_none()
    if not queue or queue.is_deleted:
        raise HTTPException(status_code=404, detail="Queue not found")

    is_past_session = False
    session_date_str = None
    session_active = False
    session_paused = False
    session_is_current = False
    within_hours = True

    # Never let a public caller inspect an arbitrary historical/cross-queue session.
    target_session_id = queue.token_session_id
    if session_id and session_id != target_session_id:
        raise HTTPException(status_code=400, detail="This is not the queue's current session")
    if target_session_id:
        session = await db.get(SessionModel, target_session_id)
        if session:
            session_active = bool(session.is_active)
            session_paused = bool(session.is_paused)
            session_date_str = session.session_date.isoformat()
            org_res = await db.execute(sa_select(OrgModel).where(OrgModel.id == queue.org_id))
            org = org_res.scalar_one_or_none()
            tz_str = org.timezone if org and org.timezone else "Asia/Kolkata"
            local_now = datetime.now(ZoneInfo(tz_str))
            from app.core.tz_helpers import queue_business_date
            today = queue_business_date(local_now, queue.open_time, queue.close_time)
            if session.session_date < today:
                is_past_session = True
            session_is_current = session.session_date == today
            if queue.open_time and queue.close_time:
                current_hm = local_now.strftime("%H:%M")
                within_hours = (
                    queue.open_time <= current_hm <= queue.close_time
                    if queue.open_time <= queue.close_time
                    else current_hm >= queue.open_time or current_hm <= queue.close_time
                )

    return {
        "queue_id": str(queue_id),
        "queue_name": queue.name,
        "is_active": bool(queue.is_active and session_active),
        "is_paused": bool(getattr(queue, "is_paused", False) or session_paused),
        "session_date": session_date_str,
        "is_past_session": is_past_session,
        "is_current_session": session_is_current,
        "has_session": queue.token_session_id is not None,
        "within_operating_hours": True,
    }


@router.get(
    "/{queue_id}/qr-config",
    summary="Get Current Queue QR Code",
    description="Returns only the short-lived current TOTP value. The signing seed never leaves the server.",
    dependencies=[Depends(api_rate_limit)],
)
async def get_queue_qr_config(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select as sa_select
    result = await db.execute(sa_select(Queue).where(Queue.id == queue_id))
    queue = result.scalar_one_or_none()
    if not queue or queue.is_deleted:
        raise HTTPException(status_code=404, detail="Queue not found")

    if not queue.is_active or queue.is_paused or not queue.token_session_id:
        raise HTTPException(status_code=409, detail="Start the queue session before showing its QR code.")
    from app.models.session import Session as SessionModel
    from app.models.organization import Organization as OrgModel
    session = await db.get(SessionModel, queue.token_session_id)
    org = await db.get(OrgModel, queue.org_id)
    tz_str = org.timezone if org and org.timezone else "Asia/Kolkata"
    local_now = datetime.now(ZoneInfo(tz_str))
    from app.core.tz_helpers import queue_business_date
    business_date = queue_business_date(local_now, queue.open_time, queue.close_time)
    if (
        session is None
        or not session.is_active
        or session.is_paused
    ):
        raise HTTPException(status_code=409, detail="The current queue session is not accepting customers.")
    settings = get_settings()
    seed = get_qr_secret_seed(queue.id, settings.SECRET_KEY)
    interval = 15
    now_seconds = int(datetime.now(timezone.utc).timestamp())
    return {
        "totp": pyotp.TOTP(seed, interval=interval).at(now_seconds),
        "interval": interval,
        "valid_for": interval - (now_seconds % interval),
    }


@router.get(
    "/{queue_id}/scan",
    summary="QR Code Scan Redirect",
    description="Validates dynamic TOTP, generates a single-use QR token, and redirects to the join page.",
)
async def scan_queue_qr(
    queue_id: uuid.UUID,
    request: Request,
    totp: Union[str, None] = Query(None),
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(join_rate_limit),
):
    settings = get_settings()

    # Determine base URL dynamically from request header (e.g. localhost:3002, app.localhost:3002, or prod)
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    frontend_base = f"{proto}://{host}" if host else settings.FRONTEND_URL.rstrip("/")
    
    # Verify queue and its current session are open for admission.
    from sqlalchemy import select
    from app.models.session import Session as SessionModel
    from app.models.organization import Organization as OrgModel
    from zoneinfo import ZoneInfo
    result = await db.execute(select(Queue).where(Queue.id == queue_id))
    queue = result.scalar_one_or_none()
    if not queue or queue.is_deleted or not queue.is_active or queue.is_paused:
        return RedirectResponse(url=f"{frontend_base}/join/{queue_id}?error=inactive")

    # Verify session is today
    if not queue.token_session_id:
        return RedirectResponse(url=f"{frontend_base}/join/{queue_id}?error=inactive")
    session = await db.get(SessionModel, queue.token_session_id)
    if (
        not session
        or session.queue_id != queue.id
        or session.org_id != queue.org_id
        or not session.is_active
        or session.is_paused
    ):
        session_date = session.session_date.isoformat() if session else "unknown"
        return RedirectResponse(url=f"{frontend_base}/join/{queue_id}?error=expired_qr&session_date={session_date}")

    # Validate TOTP if secret seed & totp validation is enforced
    seed = get_qr_secret_seed(queue_id, settings.SECRET_KEY)
    totp_verifier = pyotp.TOTP(seed, interval=15)
    
    if not totp or not totp_verifier.verify(totp, valid_window=1):
        return RedirectResponse(url=f"{frontend_base}/join/{queue_id}?error=expired_qr")

    # Generate single-use token and store in Redis for 600 seconds (10 minutes)
    redis = get_redis()
    qr_token = uuid.uuid4().hex
    await redis.setex(f"qr_token:{queue_id}:{qr_token}", 600, "VALID")

    return RedirectResponse(url=f"{frontend_base}/join/{queue_id}?qrToken={qr_token}")



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
    """
    # QR admission is mandatory for public QR joins. Consume the credential
    # atomically so missing, fabricated, expired, and replayed values fail.
    if not body.qr_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scan the active QR code to join this queue.")
    try:
        redis = get_redis()
        token_key = f"qr_token:{queue_id}:{body.qr_token}"
        consumed = await redis.getdel(token_key)
    except Exception:
        logger.exception("QR admission validation unavailable")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="QR validation is temporarily unavailable. Please try again.")
    if consumed != "VALID":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This QR code has expired or was already used. Please scan again.")

    # Public callers cannot select an entry channel or historical session.
    body = body.model_copy(update={"entry_type": "qr", "session_id": None})

    try:
        # Atomic token generation via queue service uses _lock_queue_public which does NOT expose
        # any other org's data; it just joins whatever public queue is at that ID.
        result = await token_service.join_queue(db, queue_id=queue_id, data=body)
        await db.commit()
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
            from datetime import datetime, timezone
            background_tasks.add_task(
                token_service.notify_new_customer,
                queue_id=queue_id,
                org_id=queue.org_id,
                token=f"{queue.prefix or ''}{result.token_number}",
                name=body.name,
                time_str=datetime.now(timezone.utc).isoformat()
            )
            # WhatsApp notification: customer joined via QR — only if they consented
            if body.send_whatsapp:
                background_tasks.add_task(
                    notify_queue_event,
                    event_type="queue_joined_v4",
                    org_id=queue.org_id,
                    token_id=result.id,
                    queue_id=queue_id,
                    customer_name=body.name,
                    customer_phone=body.phone,
                    token_number=result.token_number,
                    token_prefix=queue.prefix,
                    queue_name=queue.name,
                    position=result.position,
                    tracking_id=str(result.tracking_id) if hasattr(result, "tracking_id") else None,
                    session_id=queue.token_session_id,
                )
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg.lower():
            _raise_404(exc)
        _raise_400(exc)
    except Exception as exc:
        logger.error("Unhandled error creating token: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to process token request: {str(exc)}"
        )

    parent_org_id = None
    if queue:
        from app.models.organization import Organization as OrgModel
        org_res = await db.execute(sa_select(OrgModel).where(OrgModel.id == queue.org_id))
        org_obj = org_res.scalar_one_or_none()
        if org_obj:
            parent_org_id = org_obj.parent_organization_id

    await record_event(
        event_type="token.join",
        org_id=queue.org_id if queue else None,
        parent_org_id=parent_org_id,
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
    queue: Queue = Depends(get_admin_or_staff_queue_for_org),
) -> JoinResponse:
    """
    Admin manually creates a token.
    SECURITY: get_queue_for_org dependency verifies org ownership before join.
    """
    try:
        body = body.model_copy(update={"entry_type": "manual", "session_id": None})
        result = await token_service.join_queue(
            db, queue_id=queue.id, data=body, bypass_duplicate_check=True, bypass_operating_hours=True
        )
        await db.commit()
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
        # WhatsApp notification: staff manually added customer
        if body.send_whatsapp:
            background_tasks.add_task(
                notify_queue_event,
                event_type="queue_joined_v4",
                org_id=queue.org_id,
                token_id=result.id,
                queue_id=queue.id,
                customer_name=body.name,
                customer_phone=body.phone,
                token_number=result.token_number,
                token_prefix=queue.prefix,
                queue_name=queue.name,
                position=result.position,
                tracking_id=str(result.tracking_id) if hasattr(result, "tracking_id") else None,
                session_id=queue.token_session_id,
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
    line_number: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin_or_staff()),
    queue: Queue = Depends(get_queue_for_org),
) -> NextResponse:
    """
    Admin invites a specific token number.
    SECURITY: get_queue_for_org verifies org ownership before locking.
    """
    try:
        # Pre-check: determine if this is a recall (token was previously skipped)
        from sqlalchemy import select as sa_select
        from app.models.token import Token as TokenModel, TokenStatus
        pre_check = await db.execute(
            sa_select(TokenModel.status, TokenModel.customer_name, TokenModel.customer_phone,
                      TokenModel.tracking_id, TokenModel.id)
            .where(
                TokenModel.queue_id == queue.id,
                TokenModel.session_id == queue.token_session_id,
                TokenModel.token_number == token_number,
                TokenModel.org_id == queue.org_id,
            )
        )
        pre_row = pre_check.one_or_none()
        was_recalled = pre_row and pre_row[0] == TokenStatus.skipped
        pre_token_id = pre_row[4] if pre_row else None
        pre_customer_name = pre_row[1] if pre_row else None
        pre_customer_phone = pre_row[2] if pre_row else None
        pre_tracking_id = str(pre_row[3]) if pre_row and pre_row[3] else None

        result = await token_service.serve_specific_token(
            db,
            queue_id=queue.id,
            org_id=current_user.org_id,
            user_id=current_user.id,
            token_number=token_number,
            line_number=line_number,
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
        if was_recalled and pre_token_id:
            # This is a recall of a skipped token — send recall notification
            background_tasks.add_task(
                notify_queue_event,
                event_type="queue_recalled_v2",
                org_id=queue.org_id,
                token_id=pre_token_id,
                queue_id=queue.id,
                customer_name=pre_customer_name or "",
                customer_phone=pre_customer_phone or "",
                token_number=token_number,
                token_prefix=queue.prefix,
                queue_name=queue.name,
                tracking_id=pre_tracking_id,
                session_id=queue.token_session_id,
                assigned_line=line_number,
            )
        else:
            background_tasks.add_task(
                token_service.send_called_and_reminder_notifications,
                queue_id=queue.id,
                org_id=queue.org_id,
                serving_token_number=token_number,
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
    line_number: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin_or_staff()),
    queue: Queue = Depends(get_queue_for_org),
) -> Union[NextResponse, NoTokenResponse]:
    """
    Admin endpoint — move to the next waiting token.
    Pass line_number for multi-lane queues to call next on a specific service line.
    """
    try:
        result = await token_service.call_next(
            db,
            queue_id=queue.id,
            org_id=current_user.org_id,
            user_id=current_user.id,
            action=action,
            line_number=line_number,
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
        # WhatsApp notification: token called to be served
        if result is not None:
            background_tasks.add_task(
                token_service.send_called_and_reminder_notifications,
                queue_id=queue.id,
                org_id=queue.org_id,
                serving_token_number=result.serving,
            )

        event_tag = "CALL_NEXT_TOKEN"
        if action == "skipped":
            event_tag = "SKIP_TOKEN"
        elif action in ["deleted", "removed"]:
            event_tag = "REMOVE_TOKEN"
        elif action == "done":
            event_tag = "COMPLETE_TOKEN"

        await record_event(
            event_type=event_tag,
            org_id=current_user.org_id,
            parent_org_id=current_user.parent_organization_id,
            user_id=current_user.id,
            resource_type="queue",
            resource_id=str(queue.id),
            details={
                "queue_name": queue.name,
                "token_number": result.serving if result else None,
                "action": action,
                "line_number": line_number,
            }
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



@router.post(
    "/{queue_id}/clear-line",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear a service line (multi-lane mode)",
)
async def clear_line(
    line_number: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin_or_staff()),
    queue: Queue = Depends(get_queue_for_org),
) -> None:
    """
    Mark the token on a specific service line as done without calling the next customer.
    Used in multi-lane mode when a lane finishes and staff wants to manually clear it.
    """
    try:
        await token_service.clear_line(
            db,
            queue_id=queue.id,
            org_id=current_user.org_id,
            line_number=line_number,
            user_id=current_user.id,
        )
        await db.commit()
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
    except ValueError as exc:
        _raise_400(exc)

@router.post(
    "/{queue_id}/share-token",
    response_model=TokenResponse,
    summary="Share a currently serving token to another service line",
)
async def share_token(
    token_number: int,
    line_number: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin_or_staff()),
    queue: Queue = Depends(get_queue_for_org),
) -> TokenResponse:
    try:
        token = await token_service.share_token(
            db,
            queue_id=queue.id,
            org_id=current_user.org_id,
            user_id=current_user.id,
            token_number=token_number,
            line_number=line_number,
        )
        await db.commit()
        await db.refresh(token)
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
        return TokenResponse.model_validate(token)
    except ValueError as exc:
        _raise_400(exc)

@router.post(
    "/{queue_id}/lines/{line_number}/remove-shared",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a line's participation in a shared token",
)
async def remove_shared_token(
    line_number: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin_or_staff()),
    queue: Queue = Depends(get_queue_for_org),
) -> None:
    try:
        await token_service.remove_shared_token(
            db,
            queue_id=queue.id,
            org_id=current_user.org_id,
            user_id=current_user.id,
            line_number=line_number,
        )
        await db.commit()
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue.id,
            org_id=queue.org_id,
        )
    except ValueError as exc:
        _raise_400(exc)
