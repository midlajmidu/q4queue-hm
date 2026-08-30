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

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user, require_branch_admin, require_branch_admin_or_staff
from app.db.deps import get_db
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse, PaginatedSessionResponse, SessionUpdate
from app.schemas.queue import QueueCreate, QueueResponse, PaginatedQueueResponse
from app.services import session_service, token_service
from app.middleware.rate_limiter import api_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _raise_404(exc: Exception) -> NoReturn:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _raise_400(exc: Exception) -> NoReturn:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


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
            db, session_id=session_id, user=current_user
        )
    except ValueError as exc:
        _raise_404(exc)

    return SessionResponse(
        id=session.id,
        org_id=session.org_id,
        queue_id=session.queue_id,
        session_date=session.session_date,
        title=session.title,
        is_active=getattr(session, "is_active", True),
        is_paused=getattr(session, "is_paused", False),
        created_at=session.created_at,
    )


@router.patch(
    "/{session_id}",
    response_model=SessionResponse,
    summary="Update Session",
)
async def update_session(
    session_id: uuid.UUID,
    body: SessionUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin_or_staff()),
) -> SessionResponse:
    """Update a specific session (e.g., its title, active, paused)."""
    try:
        session = await session_service.update_session(
            db, session_id=session_id, user=current_user, data=body
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=session.queue_id,
            org_id=session.org_id,
        )
    except ValueError as exc:
        _raise_404(exc)

    return session


@router.patch(
    "/{session_id}/active",
    response_model=SessionResponse,
    summary="Toggle Session Active State",
)
async def toggle_session_active(
    session_id: uuid.UUID,
    is_active: bool,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin_or_staff()),
) -> SessionResponse:
    """Activate or deactivate a specific session."""
    try:
        session = await session_service.set_session_active(
            db, session_id=session_id, user=current_user, is_active=is_active
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=session.queue_id,
            org_id=session.org_id,
        )
    except ValueError as exc:
        _raise_404(exc)

    return SessionResponse(
        id=session.id,
        org_id=session.org_id,
        queue_id=session.queue_id,
        session_date=session.session_date,
        title=session.title,
        is_active=session.is_active,
        is_paused=session.is_paused,
        created_at=session.created_at,
    )


@router.patch(
    "/{session_id}/paused",
    response_model=SessionResponse,
    summary="Toggle Session Paused State",
)
async def toggle_session_paused(
    session_id: uuid.UUID,
    is_paused: bool,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin_or_staff()),
) -> SessionResponse:
    """Pause or resume a specific session."""
    try:
        session = await session_service.set_session_paused(
            db, session_id=session_id, user=current_user, is_paused=is_paused
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=session.queue_id,
            org_id=session.org_id,
        )
    except ValueError as exc:
        _raise_404(exc)

    return SessionResponse(
        id=session.id,
        org_id=session.org_id,
        queue_id=session.queue_id,
        session_date=session.session_date,
        title=session.title,
        is_active=session.is_active,
        is_paused=session.is_paused,
        created_at=session.created_at,
    )


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
            db, session_id=session_id, user=current_user
        )
    except ValueError as exc:
        _raise_404(exc)


