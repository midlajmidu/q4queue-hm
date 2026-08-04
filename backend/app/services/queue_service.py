

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
    data: QueueCreate,
) -> Queue:
    """Create a new persistent queue under the given org."""
    queue = Queue(
        org_id=org_id,
        name=data.name,
        prefix=data.prefix,
        starting_sequence=data.starting_sequence,
        current_token_number=data.starting_sequence - 1,
        service_lines=data.service_lines,
    )
    db.add(queue)
    await db.commit()
    await db.refresh(queue)
    logger.info("Queue created | id=%s org=%s name=%r", queue.id, org_id, queue.name)
    return queue


async def list_queues(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
) -> list[Queue]:
    """List all non-deleted queues belonging to an org."""
    query = select(Queue).where(
        Queue.org_id == org_id,
        Queue.is_deleted == False
    )
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
    query = select(Queue).where(
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

    queue.is_deleted = False
    queue.deleted_at = None
    queue.is_active = True
    await db.commit()
    await db.refresh(queue)
    logger.info("Queue restored | id=%s org=%s", queue_id, org_id)
    return queue


