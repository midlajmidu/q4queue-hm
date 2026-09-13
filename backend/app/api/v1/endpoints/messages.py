"""Tenant-scoped notifications with immutable messages and per-user state."""
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.db.deps import get_db
from app.models.message import Message, MessageReceipt
from app.models.user import User
from app.redis.deps import get_redis
from app.schemas.message import MessageCreateRequest, MessageResponse, MessageUpdateResponse

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_org_ids_for_user(db: AsyncSession, user: User) -> list[uuid.UUID]:
    if user.org_id:
        return [user.org_id]
    if user.parent_organization_id:
        from app.models.organization import Organization
        result = await db.execute(
            select(Organization.id).where(Organization.parent_organization_id == user.parent_organization_id)
        )
        return list(result.scalars().all())
    return []


async def _get_notification_channel_ids(db: AsyncSession, user: User) -> list[uuid.UUID]:
    """Return every real-time channel relevant to this user's current scope."""
    channel_ids: list[uuid.UUID] = []
    if user.org_id:
        channel_ids.append(user.org_id)
    if user.parent_organization_id:
        channel_ids.append(user.parent_organization_id)
    elif user.org_id:
        from app.models.organization import Organization
        parent_id = await db.scalar(
            select(Organization.parent_organization_id).where(Organization.id == user.org_id)
        )
        if parent_id:
            channel_ids.append(parent_id)
    return list(dict.fromkeys(channel_ids))


async def _publish(org_ids: list[uuid.UUID], payload: dict[str, Any]) -> None:
    try:
        redis = get_redis()
        encoded = json.dumps(payload)
        for org_id in org_ids:
            await redis.publish(f"org_{org_id}_notifications", encoded)
    except Exception:
        logger.exception("Notification WebSocket publish failed")


def _response(message: Message, *, is_read: bool) -> dict[str, Any]:
    return {
        "id": message.id,
        "org_id": message.org_id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "content": message.content,
        "message_type": message.message_type,
        "is_read": is_read,
        "created_at": message.created_at,
    }


def _visible_message_conditions(org_ids: list[uuid.UUID], user_id: uuid.UUID):
    return (
        Message.org_id.in_(org_ids),
        or_(Message.receiver_id.is_(None), Message.receiver_id == user_id),
        ~Message.content.startswith("**ORGANIZATION BROADCAST**\n"),
    )


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    body: MessageCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create a branch notification. Only branch administrators may publish."""
    if current_user.role not in {"admin", "branch_admin"} or not current_user.org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Branch administrator access required.")

    message = Message(
        org_id=current_user.org_id,
        sender_id=current_user.id,
        content=body.content.strip(),
        message_type=body.message_type,
        is_read=False,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    await _publish(
        await _get_notification_channel_ids(db, current_user),
        {"type": "new_message", "message_id": str(message.id)},
    )
    return _response(message, is_read=False)


@router.get("", response_model=list[MessageResponse])
async def get_messages(
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    org_ids = await _get_org_ids_for_user(db, current_user)
    if not org_ids:
        return []
    result = await db.execute(
        select(Message, MessageReceipt.read_at)
        .outerjoin(
            MessageReceipt,
            and_(MessageReceipt.message_id == Message.id, MessageReceipt.user_id == current_user.id),
        )
        .where(*_visible_message_conditions(org_ids, current_user.id))
        .where(or_(MessageReceipt.cleared_at.is_(None), MessageReceipt.id.is_(None)))
        .order_by(Message.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [_response(message, is_read=read_at is not None) for message, read_at in result.all()]


@router.patch("/read-all", response_model=MessageUpdateResponse)
async def mark_all_messages_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    org_ids = await _get_org_ids_for_user(db, current_user)
    if not org_ids:
        return {"message": "All messages marked as read", "updated_count": 0}
    result = await db.execute(
        select(Message.id)
        .outerjoin(
            MessageReceipt,
            and_(MessageReceipt.message_id == Message.id, MessageReceipt.user_id == current_user.id),
        )
        .where(*_visible_message_conditions(org_ids, current_user.id))
        .where(or_(MessageReceipt.read_at.is_(None), MessageReceipt.id.is_(None)))
        .where(or_(MessageReceipt.cleared_at.is_(None), MessageReceipt.id.is_(None)))
    )
    ids = list(result.scalars().all())
    now = datetime.now(timezone.utc)
    for message_id in ids:
        await db.execute(
            pg_insert(MessageReceipt)
            .values(message_id=message_id, user_id=current_user.id, read_at=now)
            .on_conflict_do_update(constraint="uq_message_receipt_user", set_={"read_at": now})
        )
    await db.commit()
    if ids:
        await _publish(
            await _get_notification_channel_ids(db, current_user),
            {"type": "message_read_all", "user_id": str(current_user.id)},
        )
    return {"message": "All messages marked as read", "updated_count": len(ids)}


@router.patch("/{message_id}/read", response_model=MessageResponse)
async def mark_message_read(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    org_ids = await _get_org_ids_for_user(db, current_user)
    message = await db.scalar(
        select(Message).where(Message.id == message_id, *_visible_message_conditions(org_ids, current_user.id))
    )
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    now = datetime.now(timezone.utc)
    await db.execute(
        pg_insert(MessageReceipt)
        .values(message_id=message.id, user_id=current_user.id, read_at=now)
        .on_conflict_do_update(
            constraint="uq_message_receipt_user", set_={"read_at": now, "cleared_at": None}
        )
    )
    await db.commit()
    await _publish(
        await _get_notification_channel_ids(db, current_user),
        {"type": "message_read", "message_id": str(message_id), "user_id": str(current_user.id)},
    )
    return _response(message, is_read=True)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_messages_for_user(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Hide notifications for this user without deleting shared branch history."""
    org_ids = await _get_org_ids_for_user(db, current_user)
    if not org_ids:
        return None
    ids = list((await db.execute(
        select(Message.id).where(*_visible_message_conditions(org_ids, current_user.id))
    )).scalars().all())
    now = datetime.now(timezone.utc)
    for message_id in ids:
        await db.execute(
            pg_insert(MessageReceipt)
            .values(message_id=message_id, user_id=current_user.id, read_at=now, cleared_at=now)
            .on_conflict_do_update(
                constraint="uq_message_receipt_user", set_={"read_at": now, "cleared_at": now}
            )
        )
    await db.commit()
    if ids:
        await _publish(
            await _get_notification_channel_ids(db, current_user),
            {"type": "messages_cleared", "user_id": str(current_user.id)},
        )
    return None
