"""
app/api/v1/endpoints/sessions.py
Session management endpoints (admin protected).

Routes:
  POST   /sessions                              → create session
  GET    /sessions                              → list org's sessions (with queue counts)
  GET    /sessions/{session_id}                 → session detail
  DELETE /sessions/{session_id}                 → delete session
  GET    /sessions/{session_id}/queues          → list queues in session
  POST   /sessions/{session_id}/queues          → create queue in session
"""
import logging
from datetime import date
from typing import NoReturn, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user, require_branch_admin, require_branch_admin_or_staff
from app.db.deps import get_db
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse, PaginatedSessionResponse, SessionUpdate
from app.schemas.queue import QueueCreate, QueueResponse, PaginatedQueueResponse
from app.services import session_service
from app.middleware.rate_limiter import api_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _raise_404(exc: Exception) -> NoReturn:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _raise_400(exc: Exception) -> NoReturn:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# Session Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Session",
    dependencies=[Depends(api_rate_limit)],
)
async def create_session(
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin_or_staff()),
) -> SessionResponse:
    """Create a new date-based session for the authenticated organization."""
    try:
        return await session_service.create_session(
            db, org_id=current_user.org_id, data=body
        )
    except ValueError as exc:
        _raise_400(exc)


@router.get(
    "",
    response_model=PaginatedSessionResponse,
    summary="List Sessions",
)
async def list_sessions(
    limit: int = 20,
    offset: int = 0,
    session_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedSessionResponse:
    """List all sessions for the authenticated organization, newest first."""
    res = await session_service.list_sessions(
        db, 
        org_id=current_user.org_id, 
        limit=limit, 
        offset=offset,
        session_date=session_date
    )
    return PaginatedSessionResponse(**res)


@router.get(
    "/{session_id}",
    response_model=SessionResponse,
    summary="Get Session",
)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> SessionResponse:
    """Get a specific session (tenant-scoped)."""
    try:
        session = await session_service.get_session_or_404(
            db, session_id=session_id, org_id=current_user.org_id
        )
    except ValueError as exc:
        _raise_404(exc)

    # Count queues for this session
    from sqlalchemy import select, func
    from app.models.queue import Queue
    count_result = await db.execute(
        select(func.count(Queue.id)).where(
            Queue.session_id == session_id,
            Queue.org_id == current_user.org_id,
        )
    )
    queue_count = count_result.scalar() or 0

    return SessionResponse(
        id=session.id,
        org_id=session.org_id,
        session_date=session.session_date,
        title=session.title,
        created_at=session.created_at,
        queue_count=queue_count,
    )

@router.patch(
    "/{session_id}",
    response_model=SessionResponse,
    summary="Update Session",
)
async def update_session(
    session_id: uuid.UUID,
    body: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
) -> SessionResponse:
    """Update a specific session (e.g., its title)."""
    try:
        session = await session_service.update_session(
            db, session_id=session_id, org_id=current_user.org_id, data=body
        )
    except ValueError as exc:
        _raise_404(exc)

    return session



@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Session",
    description="Deletes a session and ALL its queues and tokens forever.",
)
async def delete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
) -> None:
    """Delete a session and all its data."""
    try:
        await session_service.delete_session(
            db, session_id=session_id, org_id=current_user.org_id
        )
    except ValueError as exc:
        _raise_404(exc)


# ─────────────────────────────────────────────────────────────────────────────
# Session-Scoped Queue Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{session_id}/queues",
    response_model=PaginatedQueueResponse,
    summary="List Queues in Session",
)
async def list_session_queues(
    session_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
    name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedQueueResponse:
    """List all queues within a specific session."""
    try:
        res = await session_service.list_session_queues(
            db, 
            session_id=session_id, 
            org_id=current_user.org_id, 
            limit=limit, 
            offset=offset,
            name=name
        )
    except ValueError as exc:
        _raise_404(exc)
    
    return PaginatedQueueResponse(
        items=[QueueResponse.model_validate(q) for q in res["items"]],
        total=res["total"],
        limit=res["limit"],
        offset=res["offset"]
    )


@router.post(
    "/{session_id}/queues",
    response_model=QueueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Queue in Session",
    dependencies=[Depends(api_rate_limit)],
)
async def create_session_queue(
    session_id: uuid.UUID,
    body: QueueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin_or_staff()),
) -> QueueResponse:
    """Create a queue within a specific session."""
    try:
        queue = await session_service.create_session_queue(
            db, session_id=session_id, org_id=current_user.org_id, data=body
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return QueueResponse.model_validate(queue)
