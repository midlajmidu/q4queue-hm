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

logger = logging.getLogger(__name__)
router = APIRouter()



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
        brand_color=request.brand_color,
        parent_organization_id=current_user.parent_organization_id
    )
    
    db.add(new_branch)
    try:
        await db.commit()
        await db.refresh(new_branch)
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
        brand_color=branch.brand_color,
        logo_url=branch.logo_url,
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
    if request.brand_color is not None:
        branch.brand_color = request.brand_color

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

@router.post("/branches/{branch_id}/reset-password", status_code=200)
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

