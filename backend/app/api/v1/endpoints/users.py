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

    return UserResponse.model_validate(current_user)
