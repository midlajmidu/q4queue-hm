"""
app/api/v1/endpoints/staff.py
Staff management endpoints — strictly scoped to the authenticated admin's org.

Routes (prefix: /staff):
  GET    /staff               — list staff in org (search + pagination + filter)
  POST   /staff               — create a new staff member (admin only)
  PATCH  /staff/{staff_id}    — update email / role / active / password (admin only)
  DELETE /staff/{staff_id}    — soft-deactivate staff member (admin only)

Security:
  - Every query hard-filters by User.org_id == current_user.org_id.
  - Admin-only mutations enforced via get_current_org_admin dependency.
  - super_admin users are never returned or modifiable through these routes.
  - An admin cannot demote themselves.
"""
import logging
import uuid as _uuid
from typing import Literal, Optional, Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user, get_current_org_admin
from app.db.deps import get_db
from app.models.user import User
from app.core.security import hash_password
from app.audit.service import record_event
from app.schemas.user import StaffCreate, StaffUpdate, StaffResponse, PaginatedStaffResponse

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Dependencies ───────────────────────────────────────────────────────────────

async def get_current_org_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Allows access to admins, organization admins and super admins."""
    if current_user.role not in {"admin", "organization_admin", "super_admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization admin access required.",
        )
    return current_user


# ── Internal helpers ───────────────────────────────────────────────────────────

async def _get_staff_or_404(
    db: AsyncSession,
    staff_id: _uuid.UUID,
    org_id: _uuid.UUID,
    include_deleted: bool = False,
) -> User:
    """Fetch a non-super_admin user in the same org, or raise 404."""
    filters = [
        User.id == staff_id,
        User.org_id == org_id,
        User.role != "super_admin",
    ]
    if not include_deleted:
        filters.append(User.is_deleted == False)

    result = await db.execute(
        select(User).where(and_(*filters))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")
    return user


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=PaginatedStaffResponse,
    summary="List Staff Members",
    description="Returns all staff members belonging to the authenticated admin's organization.",
)
async def list_staff(
    search: str = Query(default="", description="Filter by email (case-insensitive)"),
    is_active: Optional[bool] = Query(default=None, description="Filter by active status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort_order: Literal["asc", "desc"] = Query(default="asc"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedStaffResponse:
    """List all staff in the current user's org. Excludes super_admin entries."""
    if not current_user.org_id:
        return PaginatedStaffResponse(items=[], total=0, limit=limit, offset=offset)
    try:
        from sqlalchemy import asc, desc

        filters = [
            User.org_id == current_user.org_id,
            User.role == "staff",  # only show staff — admins excluded from this view
            User.is_deleted == False,
        ]
        if search.strip():
            filters.append(User.email.ilike(f"%{search.strip()}%"))
        if is_active is not None:
            filters.append(User.is_active == is_active)

        where_clause = and_(*filters)

        total = await db.scalar(select(func.count(User.id)).where(where_clause)) or 0

        order_fn = asc if sort_order == "asc" else desc
        result = await db.execute(
            select(User)
            .where(where_clause)
            .order_by(order_fn(User.created_at))
            .limit(limit)
            .offset(offset)
        )
        members = result.scalars().all()

        return PaginatedStaffResponse(
            items=[StaffResponse.model_validate(m) for m in members],
            total=total,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        logger.error("Failed to list staff: %s", exc, exc_info=True)
        return PaginatedStaffResponse(items=[], total=0, limit=limit, offset=offset)


@router.post(
    "",
    response_model=StaffResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Staff Member",
    description="Create a new staff member in the admin's organization.",
)
async def create_staff(
    body: StaffCreate,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(get_current_org_admin),
    db: AsyncSession = Depends(get_db),
) -> StaffResponse:
    """Admin-only: create a staff member scoped to the current org."""
    # Enforce globally unique email
    clash = await db.execute(
        select(User).where(func.lower(User.email) == body.email.lower())
    )
    if clash.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )
        
    from app.models.organization import Organization
    org = await db.scalar(select(Organization).where(Organization.id == current_admin.org_id))
    
    current_staff_count = await db.scalar(
        select(func.count(User.id)).where(
            and_(User.org_id == current_admin.org_id, User.role == "staff", User.is_active == True)
        )
    ) or 0

    from app.services.entitlement_service import EntitlementError, assert_resource_capacity
    try:
        await assert_resource_capacity(db, current_admin.org_id, "staff_users.max", current_staff_count)
    except EntitlementError:
        raise
    
    if current_staff_count >= org.max_staff:
        from app.services.entitlement_service import format_limit_error_message, get_subscription_for_org
        sub = await get_subscription_for_org(db, current_admin.org_id)
        is_trial = sub.status == "trialing" if sub else False
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=format_limit_error_message("staff_users.max", org.max_staff, is_trial)
        )

    member = User(
        org_id=current_admin.org_id,
        email=body.email,
        first_name=body.first_name,
        last_name=body.last_name,
        password_hash=hash_password(body.password),
        role="staff",  # always fixed — no role escalation via this endpoint
        is_active=True,
        parent_organization_id=current_admin.parent_organization_id,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    await record_event(
        event_type="CREATE_STAFF",
        org_id=current_admin.org_id,
        parent_org_id=current_admin.parent_organization_id,
        user_id=current_admin.id,
        resource_type="user",
        resource_id=str(member.id),
        details={"email": member.email, "role": "staff"}
    )

    logger.info("Admin created staff | admin=%s new_user=%s org=%s", current_admin.id, member.id, current_admin.org_id)
    return StaffResponse.model_validate(member)


@router.patch(
    "/{staff_id}",
    response_model=StaffResponse,
    summary="Update Staff Member",
    description="Update email, role, active status, or password of a staff member.",
)
async def update_staff(
    staff_id: _uuid.UUID,
    body: StaffUpdate,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(get_current_org_admin),
    db: AsyncSession = Depends(get_db),
) -> StaffResponse:
    """Admin-only: update email, active status, or password of a staff member. Role is immutable."""
    member = await _get_staff_or_404(db, staff_id=staff_id, org_id=current_admin.org_id)

    # Check email uniqueness if changing
    if body.email is not None and body.email != member.email:
        clash = await db.execute(
            select(User).where(
                and_(
                    func.lower(User.email) == body.email.lower(),
                    User.id != staff_id,
                )
            )
        )
        if clash.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{body.email}' is already in use by another user in the system.",
            )
        member.email = body.email

    if body.first_name is not None:
        member.first_name = body.first_name
    if body.last_name is not None:
        member.last_name = body.last_name
    if body.is_active is not None:
        member.is_active = body.is_active
    if body.new_password is not None:
        member.password_hash = hash_password(body.new_password)

    await db.commit()
    await db.refresh(member)

    await record_event(
        event_type="UPDATE_STAFF",
        org_id=current_admin.org_id,
        parent_org_id=current_admin.parent_organization_id,
        user_id=current_admin.id,
        resource_type="user",
        resource_id=str(member.id),
        details={"email": member.email, "is_active": member.is_active}
    )

    logger.info("Admin updated staff | admin=%s staff=%s org=%s", current_admin.id, member.id, current_admin.org_id)
    return StaffResponse.model_validate(member)


@router.get(
    "/trash",
    response_model=list[StaffResponse],
    summary="List Deleted Staff in Trash",
    description="Returns all soft-deleted staff members in the authenticated admin's organization.",
)
async def list_trash_staff(
    current_admin: User = Depends(get_current_org_admin),
    db: AsyncSession = Depends(get_db),
) -> list[StaffResponse]:
    """Admin-only: list soft-deleted staff members in the trash."""
    result = await db.execute(
        select(User).where(
            and_(
                User.org_id == current_admin.org_id,
                User.role == "staff",
                User.is_deleted == True,
            )
        ).order_by(User.deleted_at.desc())
    )
    members = result.scalars().all()
    return [StaffResponse.model_validate(m) for m in members]


@router.delete(
    "/{staff_id}",
    response_model=StaffResponse,
    summary="Move Staff Member to Trash (Soft Delete)",
    description="Soft-deletes a staff member into Trash (sets is_deleted = True, deleted_at = func.now(), is_active = False).",
)
async def delete_staff(
    staff_id: _uuid.UUID,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(get_current_org_admin),
    db: AsyncSession = Depends(get_db),
) -> StaffResponse:
    """Admin-only: soft-delete a staff member into Trash."""
    member = await _get_staff_or_404(db, staff_id=staff_id, org_id=current_admin.org_id)

    if member.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    member.is_deleted = True
    member.deleted_at = func.now()
    member.is_active = False
    await db.commit()
    await db.refresh(member)

    await record_event(
        event_type="TRASH_STAFF",
        org_id=current_admin.org_id,
        parent_org_id=current_admin.parent_organization_id,
        user_id=current_admin.id,
        resource_type="user",
        resource_id=str(member.id),
        details={"email": member.email, "reason": "Admin moved staff account to trash"}
    )

    logger.info("Admin moved staff to trash | admin=%s staff=%s org=%s", current_admin.id, member.id, current_admin.org_id)
    return StaffResponse.model_validate(member)


@router.post(
    "/{staff_id}/restore",
    response_model=StaffResponse,
    summary="Restore Staff Member from Trash",
    description="Restores a soft-deleted staff member back to active status.",
)
async def restore_staff(
    staff_id: _uuid.UUID,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(get_current_org_admin),
    db: AsyncSession = Depends(get_db),
) -> StaffResponse:
    """Admin-only: restore a soft-deleted staff member from Trash."""
    member = await _get_staff_or_404(db, staff_id=staff_id, org_id=current_admin.org_id, include_deleted=True)

    if not member.is_deleted:
        return StaffResponse.model_validate(member)

    # Check capacity limit
    current_staff_count = await db.scalar(
        select(func.count(User.id)).where(
            and_(
                User.org_id == current_admin.org_id,
                User.role == "staff",
                User.is_deleted == False,
                User.is_active == True,
            )
        )
    ) or 0

    from app.services.entitlement_service import EntitlementError, assert_resource_capacity
    from app.models.organization import Organization
    org = await db.scalar(select(Organization).where(Organization.id == current_admin.org_id))
    try:
        await assert_resource_capacity(db, current_admin.org_id, "staff_users.max", current_staff_count)
    except EntitlementError:
        raise

    if org and current_staff_count >= org.max_staff:
        from app.services.entitlement_service import format_limit_error_message, get_subscription_for_org
        sub = await get_subscription_for_org(db, current_admin.org_id)
        is_trial = sub.status == "trialing" if sub else False
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=format_limit_error_message("staff_users.max", org.max_staff, is_trial)
        )

    member.is_deleted = False
    member.deleted_at = None
    member.is_active = True
    await db.commit()
    await db.refresh(member)

    await record_event(
        event_type="RESTORE_STAFF",
        org_id=current_admin.org_id,
        parent_org_id=current_admin.parent_organization_id,
        user_id=current_admin.id,
        resource_type="user",
        resource_id=str(member.id),
        details={"email": member.email, "reason": "Admin restored staff account from trash"}
    )

    logger.info("Admin restored staff from trash | admin=%s staff=%s org=%s", current_admin.id, member.id, current_admin.org_id)
    return StaffResponse.model_validate(member)


@router.delete(
    "/{staff_id}/hard",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently Delete Staff Member",
    description="Hard-delete a staff member from the database.",
)
async def hard_delete_staff(
    staff_id: _uuid.UUID,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(get_current_org_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Admin-only: permanently delete a staff member in the same org."""
    member = await _get_staff_or_404(db, staff_id=staff_id, org_id=current_admin.org_id, include_deleted=True)

    if member.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    await db.delete(member)
    await db.commit()

    await record_event(
        event_type="PERMANENT_DELETE_STAFF",
        org_id=current_admin.org_id,
        parent_org_id=current_admin.parent_organization_id,
        user_id=current_admin.id,
        resource_type="user",
        resource_id=str(staff_id),
        details={"reason": "Admin permanently deleted staff account"}
    )

    logger.info("Admin hard-deleted staff | admin=%s staff=%s org=%s", current_admin.id, staff_id, current_admin.org_id)
