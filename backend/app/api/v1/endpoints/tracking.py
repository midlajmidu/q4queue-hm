"""
app/api/v1/endpoints/tracking.py
Public customer token tracking endpoint.

Routes:
  GET    /track/{tracking_id}  → view token status + position
  DELETE /track/{tracking_id}  → customer leaves queue (public cancel)

SECURITY: tracking_id is a separate UUID from token.id, preventing
          enumeration of internal IDs. No auth required.
"""
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.deps import get_db
from app.models.token import Token, TokenStatus
from app.models.queue import Queue
from app.services import token_service
from app.services.notification_service import notify_queue_event

logger = logging.getLogger(__name__)
router = APIRouter()


class TrackingResponse(BaseModel):
    token_id: str
    tracking_id: str
    token_number: int
    token_prefix: str
    status: str
    position: int
    queue_name: str
    org_name: str
    queue_id: str
    queue_is_active: bool
    queue_is_paused: bool
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    created_at: datetime
    served_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@router.get(
    "/{tracking_id}",
    response_model=TrackingResponse,
    summary="Track Token (Public)",
    description="Public endpoint for customers to view their queue position via WhatsApp link.",
)
async def track_token(
    tracking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TrackingResponse:
    """
    Returns live token status and position.
    No authentication required — access is gated by unguessable tracking_id UUID.
    """
    from app.models.organization import Organization

    result = await db.execute(
        select(
            Token, 
            Queue.name, 
            Queue.prefix, 
            Queue.is_active, 
            Queue.is_paused, 
            Queue.open_time,
            Queue.close_time,
            Organization.name
        )
        .join(Queue, Token.queue_id == Queue.id)
        .join(Organization, Token.org_id == Organization.id)
        .where(Token.tracking_id == tracking_id)
    )
    row = result.one_or_none()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    token, queue_name, queue_prefix, queue_is_active, queue_is_paused, open_time, close_time, org_name = row

    # Calculate current position
    if token.status == TokenStatus.waiting:
        pos_result = await db.execute(
            select(
                __import__("sqlalchemy", fromlist=["func"]).func.count()
            )
            .select_from(Token)
            .where(
                Token.queue_id == token.queue_id,
                Token.status == TokenStatus.waiting,
                Token.token_number < token.token_number,
            )
        )
        position = pos_result.scalar_one()
    else:
        position = 0

    return TrackingResponse(
        token_id=str(token.id),
        tracking_id=str(token.tracking_id),
        token_number=token.token_number,
        token_prefix=queue_prefix,
        status=token.status.value,
        position=position,
        queue_name=queue_name,
        org_name=org_name,
        queue_id=str(token.queue_id),
        queue_is_active=queue_is_active,
        queue_is_paused=queue_is_paused,
        open_time=open_time,
        close_time=close_time,
        created_at=token.created_at,
        served_at=token.served_at,
        completed_at=token.completed_at,
    )


@router.delete(
    "/{tracking_id}",
    summary="Leave Queue (Public)",
    description="Customer voluntarily leaves the queue via tracking URL.",
)
async def leave_queue(
    tracking_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Customer cancels their own token using the tracking UUID.
    Triggers queue.cancelled WhatsApp notification.
    """
    result = await db.execute(
        select(Token, Queue.name, Queue.prefix, Queue.session_id)
        .join(Queue, Token.queue_id == Queue.id)
        .where(Token.tracking_id == tracking_id)
    )
    row = result.one_or_none()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    token, queue_name, queue_prefix, session_id = row

    try:
        updated = await token_service.cancel_token_public(db, token_id=token.id)
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=token.queue_id,
            org_id=token.org_id,
        )
        from app.services.notification_service import notify_queue_event
        background_tasks.add_task(
            notify_queue_event,
            event_type="queue_removed_v2",
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
        return {"status": "cancelled", "token_number": updated.token_number}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
