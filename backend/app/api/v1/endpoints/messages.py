"""
app/api/v1/endpoints/messages.py
REST endpoints for fetching and marking notifications as read.
"""
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.core.deps import get_current_active_user
from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageResponse, MessageUpdateResponse
from app.redis.deps import get_redis

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=list[MessageResponse])
async def get_messages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get all messages for the current user's organization."""
    org_id = current_user.org_id
    
    # Optional: fetch messages assigned to the user OR broadcasted (receiver_id is None)
    result = await db.execute(
        select(Message)
        .where(Message.org_id == org_id)
        .order_by(Message.created_at.desc())
        .limit(100)
    )
    messages = result.scalars().all()
    return messages


@router.patch("/{message_id}/read", response_model=MessageResponse)
async def mark_message_read(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Mark a specific message as read."""
    org_id = current_user.org_id
    
    result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if message.org_id != org_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this message")
        
    message.is_read = True
    await db.commit()
    await db.refresh(message)
    
    # Broadcast read status via Redis
    try:
        redis_client = await get_redis()
        channel = f"org_{str(org_id)}_notifications"
        payload = {
            "type": "message_read",
            "message_id": str(message_id)
        }
        import json
        await redis_client.publish(channel, json.dumps(payload))
    except Exception as exc:
        logger.error("Failed to publish message_read event: %s", exc)
        
    return message


@router.patch("/read-all", response_model=MessageUpdateResponse)
async def mark_all_messages_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Mark all messages as read for the user's organization."""
    org_id = current_user.org_id
    
    # Perform a bulk update
    stmt = (
        update(Message)
        .where(Message.org_id == org_id)
        .where(Message.is_read == False)
        .values(is_read=True)
        .execution_options(synchronize_session="fetch")
    )
    result = await db.execute(stmt)
    updated_count = result.rowcount
    await db.commit()
    
    if updated_count > 0:
        # Broadcast read_all status via Redis
        try:
            redis_client = await get_redis()
            channel = f"org_{str(org_id)}_notifications"
            payload = {
                "type": "message_read_all"
            }
            import json
            await redis_client.publish(channel, json.dumps(payload))
        except Exception as exc:
            logger.error("Failed to publish message_read_all event: %s", exc)
            
    return {"message": "All messages marked as read", "updated_count": updated_count}
