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
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.deps import get_db
from app.models.token import Token, TokenStatus
from app.models.queue import Queue
from app.services import token_service
from app.services.notification_service import notify_queue_event
from app.schemas.queue import AIOverviewResponse
from app.services.ai_overview_service import compute_ai_queue_overview
from app.middleware.rate_limiter import join_rate_limit

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
    session_id: str
    queue_is_active: bool
    queue_is_paused: bool
    is_past_session: bool = False
    session_date: Optional[str] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    created_at: datetime
    served_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    removed_by: Optional[str] = None
    branch_type: str = "standard"
    table_config: Optional[list] = None
    pax_count: int = 1
    queue_type: Optional[str] = "normal"
    max_capacity: Optional[int] = None
    zone_duration_mins: Optional[int] = None


@router.get(
    "/{tracking_id}",
    response_model=TrackingResponse,
    summary="Track Token (Public)",
    description="Public endpoint for customers to view their queue position via WhatsApp link.",
    dependencies=[Depends(join_rate_limit)],
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
    from app.models.session import Session as SessionModel
    from zoneinfo import ZoneInfo

    result = await db.execute(
        select(
            Token, 
            Queue.name, 
            Queue.prefix, 
            Queue.is_active, 
            Queue.is_paused, 
            Queue.open_time,
            Queue.close_time,
            Organization.name,
            Organization.timezone,
            Organization.branch_type,
            Queue.table_config,
            Queue.token_session_id,
            Queue.queue_type,
            Queue.max_capacity,
            Queue.zone_duration_mins,
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

    token, queue_name, queue_prefix, queue_is_active, queue_is_paused, open_time, close_time, org_name, org_timezone, org_branch_type, queue_table_config, queue_token_session_id, queue_type_val, queue_max_cap, queue_zone_dur = row

    is_past_session = False
    session_is_active = True
    effective_status = token.status
    session_date_str = None
    if token.session_id:
        sess = await db.get(SessionModel, token.session_id)
        if sess:
            session_is_active = sess.is_active
            session_date_str = sess.session_date.isoformat()
            tz_str = org_timezone if org_timezone else "Asia/Kolkata"
            today = datetime.now(ZoneInfo(tz_str)).date()
            if not sess.is_active:
                is_past_session = True
            elif queue_token_session_id and token.session_id != queue_token_session_id:
                is_past_session = True
            elif sess.session_date < today and not sess.is_active:
                is_past_session = True
            else:
                is_past_session = False

    # Calculate current position
    if effective_status == TokenStatus.waiting:
        pos_result = await db.execute(
            select(
                __import__("sqlalchemy", fromlist=["func"]).func.count()
            )
            .select_from(Token)
            .where(
                Token.queue_id == token.queue_id,
                Token.session_id == token.session_id,
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
        status=effective_status.value,
        position=position,
        queue_name=queue_name,
        org_name=org_name,
        queue_id=str(token.queue_id),
        session_id=str(token.session_id),
        queue_is_active=bool(queue_is_active and session_is_active and not is_past_session),
        queue_is_paused=queue_is_paused,
        is_past_session=is_past_session,
        session_date=session_date_str,
        open_time=open_time,
        close_time=close_time,
        created_at=token.created_at,
        served_at=token.served_at,
        completed_at=token.completed_at,
        removed_by=token.removed_by,
        branch_type=getattr(org_branch_type, "value", org_branch_type) or "standard",
        table_config=queue_table_config or [],
        pax_count=getattr(token, "pax_count", 1) or 1,
        queue_type=getattr(queue_type_val, "value", queue_type_val) or "normal",
        max_capacity=queue_max_cap,
        zone_duration_mins=queue_zone_dur,
    )


@router.get(
    "/{tracking_id}/ai-overview",
    response_model=AIOverviewResponse,
    summary="AI Queue Overview (Public)",
    description="Returns data-driven wait time predictions and insights for a token.",
    dependencies=[Depends(join_rate_limit)],
)
async def get_ai_overview(
    tracking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> AIOverviewResponse:
    """
    Public AI Overview endpoint.
    Isolated so failures never degrade the core tracking experience.
    """
    from app.models.organization import Organization
    from app.models.session import Session as SessionModel
    from zoneinfo import ZoneInfo

    result = await db.execute(
        select(Token, Queue, Organization)
        .join(Queue, Token.queue_id == Queue.id)
        .join(Organization, Token.org_id == Organization.id)
        .where(Token.tracking_id == tracking_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    token, queue, org = row

    is_past_session = False
    sess = None
    if token.session_id:
        sess = await db.get(SessionModel, token.session_id)
        if sess:
            tz_str = org.timezone if org.timezone else "Asia/Kolkata"
            try:
                today = datetime.now(ZoneInfo(tz_str)).date()
            except Exception:
                today = datetime.now(timezone.utc).date()
            if not sess.is_active:
                is_past_session = True
            elif queue.token_session_id and token.session_id != queue.token_session_id:
                is_past_session = True
            elif sess.session_date < today and not sess.is_active:
                is_past_session = True

    # Calculate position using verified source of truth
    if token.status == TokenStatus.waiting:
        pos_result = await db.execute(
            select(func.count())
            .select_from(Token)
            .where(
                Token.queue_id == token.queue_id,
                Token.session_id == token.session_id,
                Token.status == TokenStatus.waiting,
                Token.token_number < token.token_number,
            )
        )
        people_ahead = pos_result.scalar_one() or 0
    else:
        people_ahead = 0

    # Failure isolation: wrap in try/except so endpoint always provides a safe payload
    try:
        overview_dict = await compute_ai_queue_overview(
            db=db,
            token=token,
            queue=queue,
            session=sess,
            people_ahead=people_ahead,
            is_past_session=is_past_session,
        )
        return AIOverviewResponse(**overview_dict)
    except Exception as exc:
        logger.error("AI Overview computation error for tracking_id %s: %s", tracking_id, exc, exc_info=True)
        return AIOverviewResponse(
            estimated_min_minutes=None,
            estimated_max_minutes=None,
            trend_title="Queue in progress",
            summary_message=f"There are {people_ahead} people ahead in line.",
            action_advice="Please keep an eye on your queue position.",
            badge_type="normal",
            confidence_level="learning",
            people_ahead=people_ahead,
            active_counters=0,
            pace_ratio=1.0,
            is_paused=bool(queue.is_paused),
            is_active=bool(queue.is_active),
        )


@router.delete(
    "/{tracking_id}",
    summary="Leave Queue (Public)",
    description="Customer voluntarily leaves the queue via tracking URL.",
    dependencies=[Depends(join_rate_limit)],
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
        select(Token, Queue.name, Queue.prefix)
        .join(Queue, Token.queue_id == Queue.id)
        .where(Token.tracking_id == tracking_id)
    )
    row = result.one_or_none()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    token, queue_name, queue_prefix = row

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
            event_type="queue_removed_v3",
            org_id=token.org_id,
            token_id=token.id,
            queue_id=token.queue_id,
            customer_name=token.customer_name,
            customer_phone=token.customer_phone,
            token_number=token.token_number,
            token_prefix=queue_prefix,
            queue_name=queue_name,
            tracking_id=str(getattr(token, "tracking_id", "")),
        )
        return {"status": "cancelled", "token_number": updated.token_number}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
