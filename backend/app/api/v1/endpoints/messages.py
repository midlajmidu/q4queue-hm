"""
app/api/v1/endpoints/messages.py
REST endpoints for fetching and marking notifications as read.
"""
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.core.deps import get_current_active_user
from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageResponse, MessageUpdateResponse, MessageCreateRequest
from app.redis.deps import get_redis

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_org_ids_for_user(db: AsyncSession, user: User) -> list[uuid.UUID]:
    if user.org_id:
        return [user.org_id]
    if user.parent_organization_id:
        from app.models.organization import Organization
        res = await db.execute(select(Organization.id).where(Organization.parent_organization_id == user.parent_organization_id))
        return list(res.scalars().all())
    return []


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    body: MessageCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create a new notification message and broadcast it via Redis."""
    target_org_id = current_user.org_id
    if not target_org_id and current_user.parent_organization_id:
        from app.models.organization import Organization
        res = await db.execute(select(Organization.id).where(Organization.parent_organization_id == current_user.parent_organization_id))
        target_org_id = res.scalars().first()

    if not target_org_id:
        raise HTTPException(status_code=400, detail="User is not associated with an active organization branch.")

    message = Message(
        org_id=target_org_id,
        sender_id=current_user.id,
        content=body.content,
        message_type=body.message_type,
        is_read=False
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    
    # Broadcast new_message event via Redis to trigger WebSocket update
    try:
        redis_client = await get_redis()
        channel = f"org_{str(target_org_id)}_notifications"
        payload = {
            "type": "new_message",
            "message_id": str(message.id)
        }
        import json
        await redis_client.publish(channel, json.dumps(payload))
    except Exception as exc:
        logger.error("Failed to publish new_message event: %s", exc)
        
    return message


@router.get("", response_model=list[MessageResponse])
async def get_messages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get all messages for the current user's organization or parent organization branches."""
    org_ids = await _get_org_ids_for_user(db, current_user)
    if not org_ids:
        return []

    result = await db.execute(
        select(Message)
        .where(Message.org_id.in_(org_ids))
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
    org_ids = await _get_org_ids_for_user(db, current_user)
    
    result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if message.org_id not in org_ids:
        raise HTTPException(status_code=403, detail="Not authorized to update this message")
        
    message.is_read = True
    await db.commit()
    await db.refresh(message)
    
    # Broadcast read status via Redis
    try:
        redis_client = await get_redis()
        channel = f"org_{str(message.org_id)}_notifications"
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
    org_ids = await _get_org_ids_for_user(db, current_user)
    if not org_ids:
        return {"message": "All messages marked as read", "updated_count": 0}

    stmt = (
        update(Message)
        .where(Message.org_id.in_(org_ids))
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
            for oid in org_ids:
                channel = f"org_{str(oid)}_notifications"
                payload = {
                    "type": "message_read_all"
                }
                import json
                await redis_client.publish(channel, json.dumps(payload))
        except Exception as exc:
            logger.error("Failed to publish message_read_all event: %s", exc)
            
    return {"message": "All messages marked as read", "updated_count": updated_count}


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_messages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Clear all messages for the current user's organization."""
    org_ids = await _get_org_ids_for_user(db, current_user)
    if not org_ids:
        return None

    stmt = delete(Message).where(Message.org_id.in_(org_ids))
    await db.execute(stmt)
    await db.commit()
    
    # Broadcast clear status via Redis
    try:
        redis_client = await get_redis()
        for oid in org_ids:
            channel = f"org_{str(oid)}_notifications"
            payload = {
                "type": "messages_cleared"
            }
            import json
            await redis_client.publish(channel, json.dumps(payload))
    except Exception as exc:
        logger.error("Failed to publish messages_cleared event: %s", exc)
        
    return None

