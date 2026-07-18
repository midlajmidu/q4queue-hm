import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, require_organization_admin
from app.models.user import User
from app.models.parent_organization import ParentOrganization
from app.models.organization import Organization
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
    
    # Check email uniqueness across all tables
    if "contact_email" in update_data and update_data["contact_email"]:
        new_email = update_data["contact_email"]
        
        # Check ParentOrganization (excluding this one)
        parent_org_query = select(ParentOrganization).where(
            ParentOrganization.contact_email == new_email,
            ParentOrganization.id != parent_org.id
        )
        if (await db.execute(parent_org_query)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="This email is already taken by another organization.")
            
        # Check User (this covers branch admins)
        user_query = select(User).where(User.email == new_email)
        if (await db.execute(user_query)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="This email is already taken by a user account.")
            
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

@router.post("/settings/logo")
async def upload_logo(
    file: __import__("fastapi").UploadFile = __import__("fastapi").File(...),
    current_user: User = Depends(require_organization_admin()),
):
    import os
    import uuid
    from fastapi import HTTPException
    
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not associated with a parent organization")
        
    ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PNG, JPG, JPEG, SVG, WebP")
        
    MAX_SIZE = 5 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5 MB.")
        
    upload_dir = "uploads/logos"
    os.makedirs(upload_dir, exist_ok=True)
    
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as f:
        f.write(content)
        
    return {"logo_url": f"/{upload_dir}/{filename}"}
