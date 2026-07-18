from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.db.deps import get_db
from app.core.deps import get_current_org_admin
from app.models.user import User
from app.models.organization import Organization
from app.models.parent_organization import ParentOrganization
from app.models.queue import Queue
from app.models.session import Session
from app.schemas.organization_admin import (
    OrgAdminDashboardResponse, BranchStatItem,
    BranchCreateRequest, BranchUpdateRequest, BranchStatusUpdate,
    BranchAdminCreateRequest, BranchAdminResetPasswordRequest,
    BranchDetailResponse, BranchAdminResponse
)
from app.core.security import hash_password
from sqlalchemy.exc import IntegrityError
import uuid
from app.middleware.rate_limiter import api_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter()



@router.get("/check-slug")
async def check_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
):
    """Check if a branch slug is available."""
    result = await db.execute(select(Organization).where(Organization.slug == slug))
    org = result.scalar_one_or_none()
    return {"available": org is None}

@router.post("/branches", response_model=BranchStatItem)
async def create_branch(
    request: BranchCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
):
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="Not linked to a parent organization")

    from app.models.parent_organization import ParentOrganization
    from sqlalchemy import func
    parent_org_result = await db.execute(select(ParentOrganization).where(ParentOrganization.id == current_user.parent_organization_id))
    parent_org = parent_org_result.scalar_one_or_none()
    
    if parent_org and parent_org.max_branches is not None:
        count_result = await db.execute(select(func.count(Organization.id)).where(Organization.parent_organization_id == parent_org.id))
        current_count = count_result.scalar() or 0
        if current_count >= parent_org.max_branches:
            raise HTTPException(status_code=400, detail=f"Branch limit ({parent_org.max_branches}) reached for this organization")

    # Check if admin email is already in use
    if request.admin_email:
        from app.models.user import User
        email_check = await db.execute(select(User).where(func.lower(User.email) == request.admin_email.lower()))
        if email_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"User with email {request.admin_email} already exists")


    # Check slug uniqueness
    existing_org_result = await db.execute(
        select(Organization).where(Organization.slug == request.slug)
    )
    if existing_org_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Organization slug already exists")

    new_branch = Organization(
        name=request.name,
        slug=request.slug,
        address=request.address,
        phone_number=request.phone_number,
        timezone=request.timezone,
        parent_organization_id=current_user.parent_organization_id
    )
    
    db.add(new_branch)
    try:
        await db.commit()
        await db.refresh(new_branch)
        
        # Create the initial admin if provided
        if request.admin_email and request.admin_first_name and request.admin_last_name and request.admin_password:
            from app.core.security import hash_password
            
            new_admin = User(
                email=request.admin_email,
                first_name=request.admin_first_name,
                last_name=request.admin_last_name,
                password_hash=hash_password(request.admin_password),
                role="admin",
                is_active=True,
                is_first_login=True,
                org_id=new_branch.id,
                parent_organization_id=current_user.parent_organization_id,
            )
            db.add(new_admin)
            await db.commit()
            
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Could not create branch")

    return BranchStatItem(
        id=new_branch.id,
        name=new_branch.name,
        slug=new_branch.slug,
        is_active=new_branch.is_active,
        created_at=new_branch.created_at
    )

@router.get("/branches/{branch_id}", response_model=BranchDetailResponse)
async def get_branch_details(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
):
    # Verify ownership
    org_result = await db.execute(
        select(Organization)
        .where(
            Organization.id == branch_id,
            Organization.parent_organization_id == current_user.parent_organization_id
        )
    )
    branch = org_result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    # Get users
    users_result = await db.execute(
        select(User).where(User.org_id == branch_id)
    )
    users = users_result.scalars().all()
    
    admins = [u for u in users if u.role == "admin"]
    staff_count = len([u for u in users if u.role == "staff"])

    admin_responses = [
        BranchAdminResponse(
            id=u.id,
            first_name=u.first_name,
            last_name=u.last_name,
            email=u.email,
            created_at=u.created_at,
            is_active=u.is_active
        ) for u in admins
    ]

    # Get counts
    queue_count_result = await db.execute(
        select(func.count(Queue.id)).where(Queue.org_id == branch_id)
    )
    queue_count = queue_count_result.scalar_one_or_none() or 0

    session_count_result = await db.execute(
        select(func.count(Session.id)).where(Session.org_id == branch_id)
    )
    session_count = session_count_result.scalar_one_or_none() or 0

    return BranchDetailResponse(
        id=branch.id,
        name=branch.name,
        slug=branch.slug,
        is_active=branch.is_active,
        created_at=branch.created_at,
        address=branch.address,
        phone_number=branch.phone_number,
        admin_count=len(admins),
        staff_count=staff_count,
        queue_count=queue_count,
        session_count=session_count,
        admins=admin_responses
    )

@router.put("/branches/{branch_id}", response_model=BranchStatItem)
async def update_branch(
    branch_id: uuid.UUID,
    request: BranchUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
):
    org_result = await db.execute(
        select(Organization)
        .where(
            Organization.id == branch_id,
            Organization.parent_organization_id == current_user.parent_organization_id
        )
    )
    branch = org_result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    if request.name is not None:
        branch.name = request.name
    if request.address is not None:
        branch.address = request.address
    if request.phone_number is not None:
        branch.phone_number = request.phone_number

    await db.commit()
    await db.refresh(branch)

    return BranchStatItem(
        id=branch.id,
        name=branch.name,
        slug=branch.slug,
        is_active=branch.is_active,
        created_at=branch.created_at
    )

@router.patch("/branches/{branch_id}/status", response_model=BranchStatItem)
async def update_branch_status(
    branch_id: uuid.UUID,
    request: BranchStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
):
    org_result = await db.execute(
        select(Organization)
        .where(
            Organization.id == branch_id,
            Organization.parent_organization_id == current_user.parent_organization_id
        )
    )
    branch = org_result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    branch.is_active = request.is_active
    await db.commit()
    await db.refresh(branch)

    return BranchStatItem(
        id=branch.id,
        name=branch.name,
        slug=branch.slug,
        is_active=branch.is_active,
        created_at=branch.created_at
    )

@router.post("/branches/{branch_id}/admins", response_model=BranchAdminResponse)
async def create_branch_admin(
    branch_id: uuid.UUID,
    request: BranchAdminCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
):
    org_result = await db.execute(
        select(Organization)
        .where(
            Organization.id == branch_id,
            Organization.parent_organization_id == current_user.parent_organization_id
        )
    )
    branch = org_result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    # Check if email exists
    existing_user_result = await db.execute(select(User).where(User.email == request.email))
    if existing_user_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_admin = User(
        email=request.email,
        password_hash=hash_password(request.password),
        first_name=request.first_name,
        last_name=request.last_name,
        role="admin",
        org_id=branch.id,
        parent_organization_id=current_user.parent_organization_id
    )

    db.add(new_admin)
    try:
        await db.commit()
        await db.refresh(new_admin)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Could not create admin")

    return BranchAdminResponse(
        id=new_admin.id,
        first_name=new_admin.first_name,
        last_name=new_admin.last_name,
        email=new_admin.email,
        created_at=new_admin.created_at,
        is_active=new_admin.is_active
    )

@router.post("/branches/{branch_id}/reset-password", status_code=200, dependencies=[Depends(api_rate_limit)])
async def reset_branch_admin_password(
    branch_id: uuid.UUID,
    admin_id: uuid.UUID,
    request: BranchAdminResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
):
    # Verify branch ownership
    org_result = await db.execute(
        select(Organization)
        .where(
            Organization.id == branch_id,
            Organization.parent_organization_id == current_user.parent_organization_id
        )
    )
    if not org_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Branch not found")

    # Verify admin belongs to this branch and has role "admin"
    admin_result = await db.execute(
        select(User).where(
            User.id == admin_id,
            User.org_id == branch_id,
            User.role == "admin"
        )
    )
    admin = admin_result.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found in this branch")

    admin.password_hash = hash_password(request.new_password)
    admin.is_first_login = True # Force them to change password on next login
    
    await db.commit()
    return {"message": "Password updated successfully"}


# ── Org-Admin: Impersonate Branch (read-only view) ──────────────────────────

from app.core.security import create_access_token
from app.schemas.auth import TokenResponse


@router.post(
    "/branches/{org_id}/impersonate",
    response_model=TokenResponse,
    summary="Get read-only branch access token for Org Admin",
)
async def org_admin_impersonate_branch(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
):
    """
    Issues a read-only access token for a branch that belongs to the
    org admin's parent organization. Used so org admins can view a
    branch dashboard without being able to modify anything.
    """
    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid org_id.")

    # Verify the branch belongs to this org admin's parent org
    result = await db.execute(
        select(Organization).where(
            Organization.id == org_uuid,
            Organization.parent_organization_id == current_user.parent_organization_id,
        )
    )
    branch: Organization | None = result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found or not in your organization.")

    # Find the primary admin of that branch
    admin_result = await db.execute(
        select(User).where(
            User.org_id == org_uuid,
            User.role == "admin",
        ).limit(1)
    )
    admin = admin_result.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=404, detail="No admin user found for this branch.")

    # Issue a read-only token
    token = create_access_token(
        user_id=str(admin.id),
        org_id=str(branch.id),
        org_slug=branch.slug,
        org_name=branch.name,
        role=admin.role,
        email=admin.email,
        first_name=admin.first_name,
        last_name=admin.last_name,
        is_impersonating=True,
        is_read_only=True,
    )

    logger.info(
        "Org admin %s obtained read-only view of branch %s",
        current_user.email,
        branch.slug,
    )
    return TokenResponse(access_token=token)

# ── Branch Backups for Org Admins ─────────────────────────────────────────────

from app.models.branch_backup import BranchBackup
from app.services.branch_backup_service import create_branch_backup, restore_branch_backup, cleanup_old_branch_backups
from fastapi import UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

class BranchBackupItem(BaseModel):
    id: str
    filename: str
    size_bytes: int
    status: str
    created_at: str

class BranchBackupListResponse(BaseModel):
    items: list[BranchBackupItem]

@router.post(
    "/branches/{branch_id}/backups",
    response_model=BranchBackupItem,
    summary="Create a new Branch Backup (Org Admin)",
)
async def org_admin_create_branch_backup(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
) -> BranchBackupItem:
    # Verify ownership
    org_result = await db.execute(
        select(Organization)
        .where(
            Organization.id == branch_id,
            Organization.parent_organization_id == current_user.parent_organization_id
        )
    )
    if not org_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Branch not found")

    try:
        backup = await create_branch_backup(branch_id, db)
        return BranchBackupItem(
            id=str(backup.id),
            filename=backup.filename,
            size_bytes=backup.size_bytes,
            status=backup.status.value,
            created_at=backup.created_at.isoformat()
        )
    except Exception as e:
        logger.error(f"Failed to create branch backup for branch {branch_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/branches/{branch_id}/backups",
    response_model=BranchBackupListResponse,
    summary="List Backups for a specific Branch (Org Admin)",
)
async def org_admin_list_branch_backups(
    branch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
) -> BranchBackupListResponse:
    # Verify ownership
    org_result = await db.execute(
        select(Organization)
        .where(
            Organization.id == branch_id,
            Organization.parent_organization_id == current_user.parent_organization_id
        )
    )
    if not org_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Branch not found")

    # Run cleanup silently
    try:
        await cleanup_old_branch_backups(db)
    except Exception as e:
        logger.warning(f"Branch backup cleanup failed: {e}")
        
    from sqlalchemy import desc
    result = await db.execute(
        select(BranchBackup)
        .where(BranchBackup.org_id == branch_id)
        .order_by(desc(BranchBackup.created_at))
    )
    backups = result.scalars().all()
    
    return BranchBackupListResponse(
        items=[
            BranchBackupItem(
                id=str(b.id),
                filename=b.filename,
                size_bytes=b.size_bytes,
                status=b.status.value,
                created_at=b.created_at.isoformat()
            )
            for b in backups
        ]
    )

@router.get(
    "/branches/{branch_id}/backups/{backup_id}/download",
    summary="Download a Branch Backup (Org Admin)",
)
async def org_admin_download_branch_backup(
    branch_id: uuid.UUID,
    backup_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
):
    import os
    # Verify ownership
    org_result = await db.execute(
        select(Organization)
        .where(
            Organization.id == branch_id,
            Organization.parent_organization_id == current_user.parent_organization_id
        )
    )
    if not org_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Branch not found")

    backup = await db.scalar(
        select(BranchBackup)
        .where(BranchBackup.id == backup_id, BranchBackup.org_id == branch_id)
    )
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
        
    filepath = os.path.join("/app/backups", backup.filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup file missing from disk")
        
    return FileResponse(
        path=filepath, 
        filename=backup.filename, 
        media_type="application/json"
    )

class SuccessResponse(BaseModel):
    message: str

@router.post(
    "/branches/{branch_id}/backups/restore",
    response_model=SuccessResponse,
    summary="Restore a Branch from a backup file (Org Admin)",
)
async def org_admin_restore_branch_from_backup(
    branch_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_org_admin),
) -> SuccessResponse:
    import os
    
    # Verify ownership
    org_result = await db.execute(
        select(Organization)
        .where(
            Organization.id == branch_id,
            Organization.parent_organization_id == current_user.parent_organization_id
        )
    )
    if not org_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Branch not found")

    if not file.filename.endswith(".q4branchbackup"):
        raise HTTPException(status_code=400, detail="Must upload a .q4branchbackup file")
        
    filepath = f"/tmp/{uuid.uuid4()}_{file.filename}"
    try:
        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)
            
        await restore_branch_backup(branch_id, filepath, db)
        return SuccessResponse(message="Branch successfully restored from backup.")
    except ValueError as e:
        logger.error(f"Branch restore validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Branch restore failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

