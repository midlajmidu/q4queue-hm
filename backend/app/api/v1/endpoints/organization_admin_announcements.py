import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, require_organization_admin
from app.models.user import User
from app.models.organization_announcement import OrganizationAnnouncement
from app.schemas.organization_announcement import OrganizationAnnouncementCreate, OrganizationAnnouncementResponse
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
