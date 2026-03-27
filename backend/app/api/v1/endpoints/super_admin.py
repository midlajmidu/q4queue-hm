"""
app/api/v1/endpoints/super_admin.py
Super Admin API endpoints.

Routes (prefix: /super-admin):
  POST   /auth/login              — Super admin login (email + password, no org slug)
  GET    /stats                   — Dashboard stats (total / active / inactive orgs)
  GET    /organizations           — List orgs with search, sort, pagination
  POST   /organizations           — Create org + provision admin user atomically
  GET    /organizations/{org_id}  — Org detail with user counts
  PUT    /organizations/{org_id}  — Update org name / slug / is_active
  DELETE /organizations/{org_id}  — Soft-delete org (sets is_active = False)

Access: All data-mutating routes require role == "super_admin" (enforced by dependency).
"""
import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import asc, desc, func, or_, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_super_admin
from app.db.deps import get_db
from app.models.organization import Organization
from app.models.user import User
from app.core.security import hash_password
from app.schemas.auth import TokenResponse
from app.services.auth_service import authenticate_super_admin
from app.audit.service import record_event

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class SuperAdminLoginRequest(BaseModel):
    email: str
    password: str


def _validate_slug(v: str) -> str:
    import re
    v = v.strip().lower()
    if not re.match(r"^[a-z0-9][a-z0-9\-]{1,98}[a-z0-9]$", v):
        raise ValueError("Slug must be 3-100 lowercase alphanumeric chars or hyphens, cannot start/end with hyphen")
    return v


class OrgCreateRequest(BaseModel):
    org_name: str
    org_slug: str
    admin_email: str
    admin_password: str
    max_sessions: int = Field(default=10, ge=1)
    max_queues_per_session: int = Field(default=20, ge=1)

    @field_validator("org_slug")
    @classmethod
    def slug_safe(cls, v: str) -> str:
        return _validate_slug(v)


class OrgUpdateRequest(BaseModel):
    org_name: str
    org_slug: str
    is_active: bool
    max_sessions: int = Field(default=10, ge=1)
    max_queues_per_session: int = Field(default=20, ge=1)

    @field_validator("org_slug")
    @classmethod
    def slug_safe(cls, v: str) -> str:
        return _validate_slug(v)


class OrgDetail(BaseModel):
    id: str
    name: str
    slug: str
    is_active: bool
    created_at: str
    max_sessions: int
    max_queues_per_session: int
    admin_email: str | None = None
    admin_initial_password: str | None = None
    admin_password_changed_at: str | None = None

    model_config = {"from_attributes": True}


class OrgDetailExtended(OrgDetail):
    total_users: int
    total_admins: int


class PaginatedOrgsResponse(BaseModel):
    items: list[OrgDetail]
    total: int
    limit: int
    offset: int


class OrgCreateResponse(BaseModel):
    organization: OrgDetail
    admin_email: str
    message: str


class OrgStats(BaseModel):
    total: int
    active: int
    inactive: int


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)


# ── Internal helpers ────────────────────────────────────────────────────────────

def _org_to_detail(o: Organization, admin_user: User | None = None) -> OrgDetail:
    return OrgDetail(
        id=str(o.id),
        name=o.name,
        slug=o.slug,
        is_active=o.is_active,
        created_at=o.created_at.isoformat(),
        max_sessions=o.max_sessions,
        max_queues_per_session=o.max_queues_per_session,
        admin_email=admin_user.email if admin_user else None,
        admin_password_changed_at=admin_user.password_changed_at.isoformat() if admin_user and admin_user.password_changed_at else None,
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post(
    "/auth/login",
    response_model=TokenResponse,
    summary="Super Admin Login",
)
async def super_admin_login(
    body: SuperAdminLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate a super admin by email + password only (no org slug required)."""
    client_ip = request.client.host if request.client else "unknown"
    try:
        token = await authenticate_super_admin(db, email=body.email, plain_password=body.password)
    except ValueError as exc:
        logger.warning("Super-admin login failed | ip=%s", client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    return TokenResponse(access_token=token)


@router.get(
    "/stats",
    response_model=OrgStats,
    summary="Organization Statistics",
)
async def get_stats(
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgStats:
    """Return dashboard-level stats: total / active / inactive org counts."""
    total = await db.scalar(select(func.count(Organization.id))) or 0
    active = await db.scalar(
        select(func.count(Organization.id)).where(Organization.is_active == True)  # noqa: E712
    ) or 0
    return OrgStats(total=total, active=active, inactive=total - active)


@router.get(
    "/organizations",
    response_model=PaginatedOrgsResponse,
    summary="List All Organizations (paginated)",
)
async def list_organizations(
    search: str = Query(default="", description="Case-insensitive search by name or slug"),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort_by: Literal["name", "created_at", "is_active"] = Query(default="created_at"),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> PaginatedOrgsResponse:
    """List organizations with optional search, sort, and pagination."""
    sort_col_map = {
        "name": Organization.name,
        "created_at": Organization.created_at,
        "is_active": Organization.is_active,
    }
    sort_col = sort_col_map[sort_by]
    order_fn = asc if sort_order == "asc" else desc

    base_filter = None
    if search.strip():
        term = f"%{search.strip()}%"
        base_filter = or_(
            Organization.name.ilike(term),
            Organization.slug.ilike(term),
        )

    count_q = select(func.count(Organization.id))
    data_q = select(Organization)

    if base_filter is not None:
        count_q = count_q.where(base_filter)
        data_q = data_q.where(base_filter)

    total = await db.scalar(count_q) or 0
    data_q = data_q.order_by(order_fn(sort_col)).limit(limit).offset(offset)
    result = await db.execute(data_q)
    orgs = result.scalars().all()

    org_ids = [o.id for o in orgs]
    admins = {}
    if org_ids:
        # Fetch first admin for each retrieved organization
        admin_result = await db.execute(select(User).where(User.org_id.in_(org_ids), User.role == "admin"))
        for u in admin_result.scalars().all():
            if u.org_id not in admins:
                admins[u.org_id] = u

    return PaginatedOrgsResponse(
        items=[_org_to_detail(o, admins.get(o.id)) for o in orgs],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/organizations",
    response_model=OrgCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Organization with Admin",
)
async def create_organization(
    body: OrgCreateRequest,
    request: Request,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgCreateResponse:
    """Atomically create a new organization and provision an admin user for it."""
    existing = await db.execute(select(Organization).where(Organization.slug == body.org_slug))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Organization slug '{body.org_slug}' is already taken.",
        )

    org = Organization(
        name=body.org_name, 
        slug=body.org_slug,
        max_sessions=body.max_sessions,
        max_queues_per_session=body.max_queues_per_session,
    )
    db.add(org)
    await db.flush()

    admin = User(
        org_id=org.id,
        email=body.admin_email,
        password_hash=hash_password(body.admin_password),
        role="admin",
    )
    db.add(admin)
    await db.commit()
    await db.refresh(org)

    await record_event(
        event_type="organization_created",
        org_id=org.id,
        user_id=_super_admin.id,
        ip_address=request.client.host if request.client else None,
        resource_type="organization",
        resource_id=str(org.id),
        details={"slug": body.org_slug, "admin_email": body.admin_email},
    )

    logger.info("Super admin created org | org=%s admin=%s", org.slug, body.admin_email)
    return OrgCreateResponse(
        organization=_org_to_detail(org, admin),
        admin_email=body.admin_email,
        message=f"Organization '{org.name}' created with admin '{body.admin_email}'.",
    )


@router.get(
    "/organizations/{org_id}",
    response_model=OrgDetailExtended,
    summary="Organization Detail with User Counts",
)
async def get_organization_detail(
    org_id: str,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgDetailExtended:
    """Return full org detail including total user and admin counts."""
    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org_id.")

    result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org: Organization | None = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    total_users = await db.scalar(
        select(func.count(User.id)).where(User.org_id == org_uuid)
    ) or 0
    total_admins = await db.scalar(
        select(func.count(User.id)).where(and_(User.org_id == org_uuid, User.role == "admin"))
    ) or 0

    admin_result = await db.execute(select(User).where(and_(User.org_id == org_uuid, User.role == "admin")).limit(1))
    admin_user = admin_result.scalar_one_or_none()

    return OrgDetailExtended(
        id=str(org.id),
        name=org.name,
        slug=org.slug,
        is_active=org.is_active,
        created_at=org.created_at.isoformat(),
        total_users=total_users,
        total_admins=total_admins,
        admin_email=admin_user.email if admin_user else None,
        admin_initial_password=admin_user.initial_password if admin_user else None,
        admin_password_changed_at=admin_user.password_changed_at.isoformat() if admin_user and admin_user.password_changed_at else None,
    )


@router.put(
    "/organizations/{org_id}",
    response_model=OrgDetail,
    summary="Update Organization",
)
async def update_organization(
    org_id: str,
    body: OrgUpdateRequest,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgDetail:
    """Update an organization's name, slug, and active status."""
    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org_id.")

    result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org: Organization | None = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    if body.org_slug != org.slug:
        clash = await db.execute(
            select(Organization).where(
                Organization.slug == body.org_slug, Organization.id != org_uuid
            )
        )
        if clash.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Slug '{body.org_slug}' is already taken.",
            )

    org.name = body.org_name
    org.slug = body.org_slug
    org.is_active = body.is_active
    org.max_sessions = body.max_sessions
    org.max_queues_per_session = body.max_queues_per_session
    await db.commit()
    await db.refresh(org)

    logger.info("Super admin updated org | org=%s active=%s", org.slug, org.is_active)
    return _org_to_detail(org)


@router.delete(
    "/organizations/{org_id}",
    response_model=OrgDetail,
    summary="Hard-Delete Organization",
)
async def delete_organization(
    org_id: str,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgDetail:
    """Hard-delete an organization and all its data."""
    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org_id.")

    result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org: Organization | None = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    # With ON DELETE CASCADE in User/Queue/Token, this will delete everything
    await db.delete(org)
    await db.commit()

    logger.info("Super admin PERMANENTLY deleted org | org=%s", org.slug)
    return _org_to_detail(org)


@router.post("/organizations/{org_id}/reset-password")
async def reset_org_admin_password(
    org_id: str,
    body: ResetPasswordRequest,
    _super_admin: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reset the password for an organization's primary admin."""
    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org_id.")

    # Find the primary admin
    result = await db.execute(
        select(User).where(and_(User.org_id == org_uuid, User.role == "admin")).limit(1)
    )
    admin = result.scalar_one_or_none()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Admin user not found for this organization."
        )

    # Update password
    admin.password_hash = hash_password(body.new_password)
    admin.password_changed_at = None  # Reset change status since super-admin set a new "initial"
    
    await db.commit()

    return {"message": f"Password reset successfully for {admin.email}"}
