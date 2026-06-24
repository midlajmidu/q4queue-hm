"""
app/services/queue_service.py
Queue management business logic with strict multi-tenant enforcement.

All methods receive org_id from the authenticated JWT — never from request body.
"""
import logging
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.queue import Queue
from app.models.token import Token
from app.schemas.queue import QueueCreate

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Queue CRUD
# ─────────────────────────────────────────────────────────────────────────────

async def create_queue(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = None,
    data: QueueCreate,
) -> Queue:
    """Create a new queue under the given org."""
    queue = Queue(
        org_id=org_id,
        session_id=session_id,
        name=data.name,
        prefix=data.prefix,
        starting_sequence=data.starting_sequence,
        current_token_number=data.starting_sequence - 1,
        service_lines=data.service_lines,
    )
    db.add(queue)
    await db.commit()
    await db.refresh(queue)
    logger.info("Queue created | id=%s org=%s session=%s name=%r", queue.id, org_id, session_id, queue.name)
    return queue


async def list_queues(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
) -> list[Queue]:
    """List all queues belonging to an org."""
    query = select(Queue).where(Queue.org_id == org_id)
    result = await db.execute(query.order_by(Queue.created_at.asc()))
    return list(result.scalars().all())


async def get_queue_or_404(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
) -> Queue:
    """
    Fetch a queue by ID, scoped to org_id.
    Raises ValueError (→ 404) if not found or belongs to different org.
    """
    result = await db.execute(
        select(Queue).where(
            Queue.id == queue_id,
            Queue.org_id == org_id,     # ← TENANT ISOLATION
        )
    )
    queue = result.scalar_one_or_none()
    if queue is None:
        raise ValueError(f"Queue {queue_id} not found")
    return queue


async def update_queue(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    **kwargs,
) -> Queue:
    """Update arbitrary fields on a queue, adhering to DRY principles."""
    queue = await get_queue_or_404(db, queue_id=queue_id, org_id=org_id)
    for key, value in kwargs.items():
        if hasattr(queue, key):
            setattr(queue, key, value)
    await db.commit()
    await db.refresh(queue)
    return queue

async def set_queue_active(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    is_active: bool,
) -> Queue:
    return await update_queue(db, queue_id=queue_id, org_id=org_id, is_active=is_active)

async def set_queue_paused(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    is_paused: bool,
) -> Queue:
    return await update_queue(db, queue_id=queue_id, org_id=org_id, is_paused=is_paused)

async def set_queue_announcement(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    announcement: str,
) -> Queue:
    return await update_queue(db, queue_id=queue_id, org_id=org_id, announcement=announcement)


async def delete_queue(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
) -> None:
    """Delete a queue. Will cascade and delete tokens as well based on DB setup."""
    queue = await get_queue_or_404(db, queue_id=queue_id, org_id=org_id)
    await db.delete(queue)
    await db.commit()
    logger.info("Queue deleted | id=%s org=%s", queue_id, org_id)

async def reset_queue(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
) -> Queue:
    """
    Reset a queue for a new day/session.

    This generates a **new session_id** so that any token pages still open
    from the previous session will detect the mismatch and stop tracking.
    All previous tokens are hard-deleted to reclaim storage.
    """
    from sqlalchemy import delete
    result = await db.execute(
        select(Queue).where(
            Queue.id == queue_id,
            Queue.org_id == org_id,
        ).with_for_update()
    )
    queue = result.scalar_one_or_none()
    if queue is None:
        raise ValueError(f"Queue {queue_id} not found")

    # Delete all tokens from the old session
    await db.execute(delete(Token).where(Token.queue_id == queue_id))

    # Rotate the session and reset counters
    queue.token_session_id = uuid.uuid4()
    queue.current_token_number = queue.starting_sequence - 1
    queue.total_served = 0
    await db.commit()
    logger.info(
        "Queue reset | id=%s org=%s new_token_session=%s",
        queue_id, org_id, queue.token_session_id,
    )
    return queue

