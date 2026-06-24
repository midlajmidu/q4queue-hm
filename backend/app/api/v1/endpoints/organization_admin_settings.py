import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, require_organization_admin
from app.models.user import User
from app.models.parent_organization import ParentOrganization
from app.schemas.parent_organization import ParentOrganizationResponse, ParentOrganizationUpdate
from app.audit.service import record_event

router = APIRouter()

@router.get("/settings", response_model=ParentOrganizationResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not associated with a parent organization")
        
    query = select(ParentOrganization).where(ParentOrganization.id == current_user.parent_organization_id)
    result = await db.execute(query)
    parent_org = result.scalar_one_or_none()
    
    if not parent_org:
        raise HTTPException(status_code=404, detail="Parent Organization not found")
        
    return parent_org

@router.put("/settings", response_model=ParentOrganizationResponse)
async def update_settings(
    settings_in: ParentOrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not associated with a parent organization")
        
    query = select(ParentOrganization).where(ParentOrganization.id == current_user.parent_organization_id)
    result = await db.execute(query)
    parent_org = result.scalar_one_or_none()
    
    if not parent_org:
        raise HTTPException(status_code=404, detail="Parent Organization not found")
        
    update_data = settings_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(parent_org, field, value)
        
    await db.commit()
    await db.refresh(parent_org)
    
    # Audit log
    await record_event(
        event_type="ORG_SETTINGS_UPDATED",
        user_id=current_user.id,
        parent_org_id=current_user.parent_organization_id,
        details={"updated_fields": list(update_data.keys())}
    )
    
    return parent_org
