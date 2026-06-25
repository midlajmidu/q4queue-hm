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
