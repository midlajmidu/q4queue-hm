"""
app/api/v1/endpoints/users.py
Protected user endpoints.

GET /users/me
  - Requires valid JWT
  - Returns current user's safe profile
  - Validates: no token → 401, invalid → 401, inactive → 403
"""
import logging

from fastapi import APIRouter, Depends

from app.core.deps import get_current_active_user
from app.db.deps import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdateMe

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User",
    description="Returns the authenticated user's profile. Requires a valid Bearer token.",
)
async def get_me(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """
    Protected endpoint — returns caller's own profile.
    No password_hash is ever included in the response.
    """
    logger.debug("GET /me | user_id=%s org_id=%s", current_user.id, current_user.org_id)
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update Current User",
    description="Updates the authenticated user's profile. Requires a valid Bearer token.",
)
async def update_me(
    body: UserUpdateMe,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Protected endpoint — updates caller's own profile.
    """
    logger.debug("PATCH /me | user_id=%s org_id=%s", current_user.id, current_user.org_id)
    
    if body.first_name is not None:
        current_user.first_name = body.first_name
    if body.last_name is not None:
        current_user.last_name = body.last_name

    await db.commit()
    await db.refresh(current_user)

    # Issue a new token so the frontend sees the updated name immediately
    from sqlalchemy import select
    from app.models.organization import Organization, ParentOrganization
    from app.core.security import create_access_token

    org_slug = None
    org_name = None
    org_logo_url = None

    if current_user.org_id:
        org_result = await db.execute(select(Organization).where(Organization.id == current_user.org_id))
        org = org_result.scalar_one_or_none()
        if org:
            org_slug = org.slug
            org_name = org.name
            org_logo_url = org.logo_url
    elif current_user.parent_organization_id:
        parent_org_result = await db.execute(select(ParentOrganization).where(ParentOrganization.id == current_user.parent_organization_id))
        parent_org = parent_org_result.scalar_one_or_none()
        if parent_org:
            org_slug = parent_org.slug
            org_name = parent_org.name

    token = create_access_token(
        user_id=str(current_user.id),
        org_id=str(current_user.org_id) if current_user.org_id else None,
        parent_org_id=str(current_user.parent_organization_id) if current_user.parent_organization_id else None,
        role=current_user.role,
        email=current_user.email,
        org_slug=org_slug,
        org_name=org_name,
        org_logo_url=org_logo_url,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_first_login=current_user.is_first_login,
    )

    resp = UserResponse.model_validate(current_user)
    resp.access_token = token
    return resp


@router.post(
    "/me/heartbeat",
    summary="User Heartbeat",
    description="Updates the authenticated user's last_active_at timestamp to current time.",
)
async def user_heartbeat(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func
    current_user.last_active_at = func.now()
    await db.commit()
    return {"status": "ok"}
