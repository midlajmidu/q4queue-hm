

"""
app/services/queue_service.py
Queue management business logic with strict multi-tenant enforcement.

All methods receive org_id from the authenticated JWT — never from request body.
"""
import logging
import uuid
from typing import Optional

from sqlalchemy import select, update, func
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
    include_deleted: bool = False,
) -> Queue:
    """
    Fetch a queue by ID, scoped to org_id.
    Raises ValueError (→ 404) if not found or belongs to different org.
    """
    query = select(Queue).where(
        Queue.id == queue_id,
        Queue.org_id == org_id,     # ← TENANT ISOLATION
    )
    if not include_deleted:
        query = query.where(Queue.is_deleted == False)

    result = await db.execute(query)
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
            if key == "custom_fields":
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(queue, "custom_fields")
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
    """Soft-delete a queue."""
    from datetime import datetime, timezone
    queue = await get_queue_or_404(db, queue_id=queue_id, org_id=org_id)
    queue.is_deleted = True
    queue.deleted_at = datetime.now(timezone.utc)
    queue.is_active = False # Deactivate it as well
    await db.commit()
    logger.info("Queue soft-deleted | id=%s org=%s", queue_id, org_id)

from sqlalchemy.orm import joinedload

async def list_trash_queues(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
) -> list[Queue]:
    """List soft-deleted queues for an organization."""
    query = select(Queue).options(joinedload(Queue.session)).where(
        Queue.org_id == org_id,
        Queue.is_deleted == True
    ).order_by(Queue.deleted_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return list(result.scalars().all())

async def restore_queue(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
) -> Queue:
    """Restore a soft-deleted queue, checking session limits."""
    queue = await get_queue_or_404(db, queue_id=queue_id, org_id=org_id, include_deleted=True)
    if not queue.is_deleted:
        return queue # Already active

    # Check limit for the queue's session
    if queue.session_id:
        from app.models.organization import Organization
        org = await db.scalar(select(Organization).where(Organization.id == org_id))
        if org:
            current_queues_count = await db.scalar(
                select(func.count(Queue.id)).where(
                    Queue.session_id == queue.session_id,
                    Queue.is_deleted == False
                )
            ) or 0
            if current_queues_count >= org.max_queues_per_session:
                raise ValueError(f"Cannot restore: Session limit reached (maximum {org.max_queues_per_session} queues allowed).")

    queue.is_deleted = False
    queue.deleted_at = None
    queue.is_active = True
    await db.commit()
    await db.refresh(queue)
    logger.info("Queue restored | id=%s org=%s", queue_id, org_id)
    return queue

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

    # Soft-delete all tokens from the old session so tracking links still work
    from app.models.token import TokenStatus
    await db.execute(
        update(Token)
        .where(Token.queue_id == queue_id)
        .values(status=TokenStatus.deleted, completed_at=func.now(), removed_by="session_end")
    )

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

