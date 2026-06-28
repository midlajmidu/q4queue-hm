import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, require_organization_admin
from app.models.user import User
from app.models.organization_announcement import OrganizationAnnouncement
from app.schemas.organization_announcement import OrganizationAnnouncementCreate, OrganizationAnnouncementResponse, OrganizationAnnouncementUpdate
from app.audit.service import record_event

router = APIRouter()

@router.get("/announcements", response_model=List[OrganizationAnnouncementResponse])
async def list_announcements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        return []
        
    query = select(OrganizationAnnouncement).where(
        OrganizationAnnouncement.parent_organization_id == current_user.parent_organization_id
    ).order_by(OrganizationAnnouncement.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/announcements", response_model=OrganizationAnnouncementResponse)
async def create_announcement(
    announcement_in: OrganizationAnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not associated with a parent organization")
        
    db_announcement = OrganizationAnnouncement(
        **announcement_in.model_dump(),
        parent_organization_id=current_user.parent_organization_id
    )
    db.add(db_announcement)
    await db.commit()
    await db.refresh(db_announcement)
    
    # Broadcast as a standard message to branches so it shows up in their Notification UI
    from app.models.organization import Organization
    from app.models.message import Message
    from app.redis.deps import get_redis
    import json
    
    query = select(Organization).where(Organization.parent_organization_id == current_user.parent_organization_id)
    result = await db.execute(query)
    branches = result.scalars().all()
    
    messages_to_create = []
    target_branch_ids = [str(t_id) for t_id in (announcement_in.target_branches or [])]
    
    for branch in branches:
        if not target_branch_ids or str(branch.id) in target_branch_ids:
            msg = Message(
                org_id=branch.id,
                sender_id=current_user.id,
                content=f"**ORGANIZATION BROADCAST**\n{db_announcement.title}\n{db_announcement.message}",
                message_type=db_announcement.type,
                is_read=False
            )
            db.add(msg)
            messages_to_create.append(msg)
            
    if messages_to_create:
        await db.commit()
        for msg in messages_to_create:
            await db.refresh(msg)
            
        # Broadcast redis events
        try:
            redis_client = await get_redis()
            for msg in messages_to_create:
                channel = f"org_{str(msg.org_id)}_notifications"
                payload = {
                    "type": "new_message",
                    "message_id": str(msg.id)
                }
                await redis_client.publish(channel, json.dumps(payload))
        except Exception as exc:
            pass

    # Audit log
    await record_event(
        event_type="ORG_ANNOUNCEMENT_CREATED",
        user_id=current_user.id,
        parent_org_id=current_user.parent_organization_id,
        details={"announcement_id": str(db_announcement.id), "title": db_announcement.title}
    )
    
    return db_announcement

@router.put("/announcements/{announcement_id}", response_model=OrganizationAnnouncementResponse)
async def update_announcement(
    announcement_id: uuid.UUID,
    announcement_in: OrganizationAnnouncementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not associated with a parent organization")
        
    query = select(OrganizationAnnouncement).where(
        OrganizationAnnouncement.id == announcement_id,
        OrganizationAnnouncement.parent_organization_id == current_user.parent_organization_id
    )
    result = await db.execute(query)
    db_announcement = result.scalars().first()
    
    if not db_announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    update_data = announcement_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_announcement, field, value)
        
    await db.commit()
    await db.refresh(db_announcement)
    
    await record_event(
        event_type="ORG_ANNOUNCEMENT_UPDATED",
        user_id=current_user.id,
        parent_org_id=current_user.parent_organization_id,
        details={"announcement_id": str(db_announcement.id), "title": db_announcement.title}
    )
    
    return db_announcement

@router.delete("/announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not associated with a parent organization")
        
    query = select(OrganizationAnnouncement).where(
        OrganizationAnnouncement.id == announcement_id,
        OrganizationAnnouncement.parent_organization_id == current_user.parent_organization_id
    )
    result = await db.execute(query)
    db_announcement = result.scalars().first()
    
    if not db_announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    await db.delete(db_announcement)
    await db.commit()
    
    await record_event(
        event_type="ORG_ANNOUNCEMENT_DELETED",
        user_id=current_user.id,
        parent_org_id=current_user.parent_organization_id,
        details={"announcement_id": str(db_announcement.id), "title": db_announcement.title}
    )
    
    return None
