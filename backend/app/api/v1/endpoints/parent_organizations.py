import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, update, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.db.deps import get_db
from app.core.deps import require_super_admin
from app.models.user import User
from app.models.organization import Organization
from app.models.parent_organization import ParentOrganization
from app.schemas.parent_organization import (
    ParentOrganizationCreate,
    ParentOrganizationUpdate,
    ParentOrganizationResponse,
    ParentOrganizationPage,
    AssignBranchesRequest,
    OrgAdminCreate
)
from app.schemas.user import OrganizationResponse
from app.core.security import hash_password

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("", response_model=ParentOrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_parent_organization(
    data: ParentOrganizationCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin()),
):
    # Check slug uniqueness
    result = await db.execute(select(ParentOrganization).where(ParentOrganization.slug == data.slug))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")

    # Check email uniqueness
    if data.contact_email:
        result = await db.execute(select(ParentOrganization).where(ParentOrganization.contact_email == data.contact_email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    parent_org = ParentOrganization(**data.model_dump())
    db.add(parent_org)
    await db.commit()
    await db.refresh(parent_org)
    return parent_org

@router.get("", response_model=ParentOrganizationPage)
async def list_parent_organizations(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin()),
):
    query = (
        select(
            ParentOrganization,
            func.count(Organization.id.distinct()).label("branch_count"),
            func.count(User.id.distinct()).label("admin_count")
        )
        .outerjoin(Organization, Organization.parent_organization_id == ParentOrganization.id)
        .outerjoin(User, (User.parent_organization_id == ParentOrganization.id) & (User.role == "organization_admin"))
        .group_by(ParentOrganization.id)
    )

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                ParentOrganization.name.ilike(search_term),
                ParentOrganization.slug.ilike(search_term)
            )
        )

    if status == "active":
        query = query.where(ParentOrganization.is_active == True)
    elif status == "inactive":
        query = query.where(ParentOrganization.is_active == False)

    total_query = select(func.count(ParentOrganization.id))
    if search:
        total_query = total_query.where(
            or_(
                ParentOrganization.name.ilike(search_term),
                ParentOrganization.slug.ilike(search_term)
            )
        )
    if status == "active":
        total_query = total_query.where(ParentOrganization.is_active == True)
    elif status == "inactive":
        total_query = total_query.where(ParentOrganization.is_active == False)
        
    total_result = await db.execute(total_query)
    total = total_result.scalar_one()

    query = query.order_by(ParentOrganization.name).offset(skip).limit(limit)
    result = await db.execute(query)
    
    items = []
    for row in result.all():
        parent_org = row[0]
        parent_org_dict = ParentOrganizationResponse.model_validate(parent_org).model_dump()
        parent_org_dict["branch_count"] = row[1]
        parent_org_dict["admin_count"] = row[2]
        items.append(ParentOrganizationResponse(**parent_org_dict))

    return {"items": items, "total": total}

@router.get("/{id}", response_model=ParentOrganizationResponse)
async def get_parent_organization(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin()),
):
    result = await db.execute(select(ParentOrganization).where(ParentOrganization.id == id))
    parent_org = result.scalar_one_or_none()
    if not parent_org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent Organization not found")
    return parent_org

@router.put("/{id}", response_model=ParentOrganizationResponse)
async def update_parent_organization(
    id: uuid.UUID,
    data: ParentOrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin()),
):
    result = await db.execute(select(ParentOrganization).where(ParentOrganization.id == id))
    parent_org = result.scalar_one_or_none()
    if not parent_org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent Organization not found")

    update_data = data.model_dump(exclude_unset=True)
    if "contact_email" in update_data and update_data["contact_email"] != parent_org.contact_email:
        email_result = await db.execute(
            select(ParentOrganization).where(ParentOrganization.contact_email == update_data["contact_email"])
        )
        if email_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    if "max_branches" in update_data and update_data["max_branches"] is not None:
        from app.models.organization import Organization
        from sqlalchemy import func
        branch_count_result = await db.execute(select(func.count(Organization.id)).where(Organization.parent_organization_id == parent_org.id))
        current_branch_count = branch_count_result.scalar() or 0
        if current_branch_count > update_data["max_branches"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot set branch limit below current branch count ({current_branch_count})"
            )

    for field, value in update_data.items():
        setattr(parent_org, field, value)

    if "is_whatsapp_enabled" in update_data and update_data["is_whatsapp_enabled"] is not None:
        from app.models.organization import Organization
        from sqlalchemy import update
        await db.execute(
            update(Organization)
            .where(Organization.parent_organization_id == parent_org.id)
            .values(is_whatsapp_enabled=update_data["is_whatsapp_enabled"])
        )

    await db.commit()
    await db.refresh(parent_org)
    return parent_org


@router.post("/{id}/assign-branches")
async def assign_branches(
    id: uuid.UUID,
    data: AssignBranchesRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin()),
):
    result = await db.execute(select(ParentOrganization).where(ParentOrganization.id == id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent Organization not found")

    # Verify branches exist
    branches_result = await db.execute(
        select(Organization).where(Organization.id.in_(data.branch_ids))
    )
    branches = branches_result.scalars().all()
    if len(branches) != len(data.branch_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more branches not found")

    # First, unset this parent from any branches that currently have it but aren't in the new list
    await db.execute(
        update(Organization)
        .where(Organization.parent_organization_id == id)
        .where(Organization.id.not_in(data.branch_ids) if data.branch_ids else True)
        .values(parent_organization_id=None)
    )

    # Now set the new branches
    if data.branch_ids:
        await db.execute(
            update(Organization)
            .where(Organization.id.in_(data.branch_ids))
            .values(parent_organization_id=id)
        )

    await db.commit()
    return {"message": "Branches assigned successfully"}

@router.get("/{id}/branches", response_model=list[OrganizationResponse])
async def get_assigned_branches(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin()),
):
    result = await db.execute(
        select(Organization)
        .where(Organization.parent_organization_id == id)
        .order_by(Organization.name)
    )
    return result.scalars().all()

@router.post("/{id}/admins")
async def create_organization_admin(
    id: uuid.UUID,
    data: OrgAdminCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin()),
):
    # Verify parent exists
    result = await db.execute(select(ParentOrganization).where(ParentOrganization.id == id))
    parent_org = result.scalar_one_or_none()
    if not parent_org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent Organization not found")

    # Verify email uniqueness globally
    email_result = await db.execute(select(User).where(User.email == data.email))
    if email_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already used")

    new_user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role="organization_admin",
        org_id=None,  # Crucial: no branch attached
        parent_organization_id=id,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "first_name": new_user.first_name,
        "last_name": new_user.last_name,
        "role": new_user.role,
        "parent_organization_id": str(new_user.parent_organization_id)
    }

@router.get("/{id}/admins")
async def get_parent_admins(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin()),
):
    result = await db.execute(
        select(User)
        .where(User.parent_organization_id == id)
        .where(User.role == "organization_admin")
    )
    admins = result.scalars().all()
    return [
        {
            "id": str(admin.id),
            "email": admin.email,
            "first_name": admin.first_name,
            "last_name": admin.last_name,
            "role": admin.role,
        }
        for admin in admins
    ]
@router.delete("/{id}")
async def delete_parent_organization(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin()),
):
    result = await db.execute(select(ParentOrganization).where(ParentOrganization.id == id))
    parent_org = result.scalar_one_or_none()
    if not parent_org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent Organization not found")

    # Unassign any branches currently linked to this parent
    await db.execute(
        update(Organization)
        .where(Organization.parent_organization_id == id)
        .values(parent_organization_id=None)
    )
    
    # Delete the parent organization (admins will be deleted if ON DELETE CASCADE is set, or we should handle it)
    await db.delete(parent_org)
    await db.commit()
    return {"message": "Parent Organization deleted successfully"}
