"""
app/core/deps.py
FastAPI dependency functions for authentication and tenant isolation.

Security rules:
  - NEVER log raw tokens
  - NEVER expose internal errors to the client
  - Refresh user from DB on every request (catches deactivation mid-session)
  - ALL resource lookups MUST include org_id (multi-tenant isolation)
"""
import logging
import uuid
from typing import Callable, TYPE_CHECKING

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from app.models.queue import Queue
    from app.models.token import Token

from app.core.security import decode_access_token
from app.db.deps import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# Extracts the Bearer token from the Authorization header
_bearer = HTTPBearer(auto_error=False)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

_INACTIVE_USER_EXCEPTION = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="User account is deactivated",
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency: validates Bearer JWT and returns the live User row.

    Fails with 401 if:
      - No token provided
      - Signature invalid
      - Token expired
      - User not found in DB (deleted after token issuance)

    Fails with 403 if:
      - User.is_active == False (deactivated after token issuance)
    """
    if credentials is None:
        logger.warning("Request with no Bearer token")
        raise _CREDENTIALS_EXCEPTION

    # ── Decode & validate signature / expiry ──────────────────────
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise _CREDENTIALS_EXCEPTION

    user_id_raw: str | None = payload.get("sub")
    role_raw: str | None = payload.get("role")
    org_id_raw: str | None = payload.get("org_id")

    if not user_id_raw or not role_raw:
        logger.warning("Token missing sub or role claim")
        raise _CREDENTIALS_EXCEPTION
        
    if role_raw == "super_admin":
        if org_id_raw is not None:
            logger.warning("Super admin token provided with org_id")
            raise _CREDENTIALS_EXCEPTION
    elif role_raw == "organization_admin":
        if org_id_raw is not None:
            logger.warning("Org admin token provided with org_id")
            raise _CREDENTIALS_EXCEPTION
    else:
        if org_id_raw is None:
            logger.warning("Normal token missing org_id claim")
            raise _CREDENTIALS_EXCEPTION

    # ── Parse UUIDs ────────────────────────────────────────────────
    try:
        user_id = uuid.UUID(user_id_raw)
        org_id = uuid.UUID(org_id_raw) if org_id_raw else None
    except ValueError:
        raise _CREDENTIALS_EXCEPTION

    # ── Fetch user from DB (always fresh — catches deactivation) ───
    if org_id:
        result = await db.execute(
            select(User).where(
                User.id == user_id,
                User.org_id == org_id,    # ← TENANT ISOLATION enforced
            )
        )
    elif role_raw == "organization_admin":
        parent_org_id_raw = payload.get("parent_org_id")
        if not parent_org_id_raw:
            raise _CREDENTIALS_EXCEPTION
        parent_org_id = uuid.UUID(parent_org_id_raw)
        result = await db.execute(
            select(User).where(
                User.id == user_id,
                User.parent_organization_id == parent_org_id,
            )
        )
    else:
        result = await db.execute(
            select(User).where(
                User.id == user_id,
                User.org_id.is_(None),    # ← Super admin case
            )
        )
    user: User | None = result.scalar_one_or_none()

    if user is None:
        logger.warning("Token refers to non-existent user | user_id=%s", user_id)
        raise _CREDENTIALS_EXCEPTION

    if not user.is_active:
        logger.warning("Token presented for inactive user | user_id=%s", user_id)
        raise _INACTIVE_USER_EXCEPTION

    return user


from fastapi import Request

async def get_current_active_user(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Convenience alias — handy for routes that want an explicit
    active-user dependency without the inline is_active check.
    Also blocks access if the user has not completed first-time password change.
    """
    if current_user.is_first_login:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="force_password_change"
        )
        
    # If organization_admin, allow them to view a branch by providing X-Org-Slug
    if current_user.role == "organization_admin":
        x_org_slug = request.headers.get("x-org-slug")
        if x_org_slug:
            from app.models.organization import Organization
            from sqlalchemy import select
            res = await db.execute(
                select(Organization).where(
                    Organization.slug == x_org_slug,
                    Organization.parent_organization_id == current_user.parent_organization_id
                )
            )
            branch = res.scalar_one_or_none()
            if branch:
                # We dynamically set org_id on this request's user instance
                # This works because we don't commit this user instance back to the DB
                current_user.org_id = branch.id
                
    return current_user


async def get_current_admin_or_staff(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Allows access only to admins, staff, or super_admins."""
    if current_user.role not in ["admin", "staff", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Admin access required",
        )
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Allows access only to admins or super_admins."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def get_current_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency: allows access ONLY to users with role == 'super_admin'.
    Raise 403 for any other authenticated user.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return current_user


async def get_current_org_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Allows access only to organization_admin."""
    if current_user.role != "organization_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization Admin access required",
        )
    return current_user


def require_super_admin() -> Callable:
    """
    Dependency that enforces the user has the 'super_admin' role.
    Usage:
        user = Depends(require_super_admin())
    """
    return get_current_super_admin

def require_organization_admin() -> Callable:
    """
    Dependency that enforces the user has the 'organization_admin' role.
    Usage:
        user = Depends(require_organization_admin())
    """
    return get_current_org_admin

def require_branch_admin() -> Callable:
    """
    Dependency that enforces the user has the 'admin' role at a branch level.
    """
    return get_current_admin

def require_branch_admin_or_staff() -> Callable:
    """
    Dependency that enforces the user has 'admin' or 'staff' role at a branch level.
    """
    return get_current_admin_or_staff


# ─────────────────────────────────────────────────────────────────────────────
# Tenant-scoped resource dependencies
# SECURITY: All resource fetches MUST go through these; they enforce
#           WHERE id = :id AND org_id = :org_id at the DB level.
# ─────────────────────────────────────────────────────────────────────────────

async def get_queue_for_org(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> "Queue":
    """
    Dependency: fetch a Queue by ID scoped to the authenticated org.
    Returns 404 for both "not found" AND "wrong org" — never leaks
    whether the resource exists in another tenant.
    """
    from app.models.queue import Queue as QueueModel
    from app.models.organization import Organization
    if current_user.role == "organization_admin":
        result = await db.execute(
            select(QueueModel).join(Organization, Organization.id == QueueModel.org_id).where(
                QueueModel.id == queue_id,
                Organization.parent_organization_id == current_user.parent_organization_id
            )
        )
    else:
        result = await db.execute(
            select(QueueModel).where(
                QueueModel.id == queue_id,
                QueueModel.org_id == current_user.org_id,  # TENANT ISOLATION
            )
        )
    queue = result.scalar_one_or_none()
    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue not found",
        )
    return queue


async def get_admin_queue_for_org(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> "Queue":
    """
    Same as get_queue_for_org but restricted to admin-role users.
    Use this for destructive / mutating admin operations.
    """
    from app.models.queue import Queue as QueueModel
    result = await db.execute(
        select(QueueModel).where(
            QueueModel.id == queue_id,
            QueueModel.org_id == current_user.org_id,
        )
    )
    queue = result.scalar_one_or_none()
    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue not found",
        )
    return queue


async def get_token_for_org(
    token_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> "Token":
    """
    Dependency: fetch a Token by ID scoped to the authenticated org.
    Returns 404 for both "not found" AND "wrong org".
    """
    from app.models.token import Token as TokenModel
    result = await db.execute(
        select(TokenModel).where(
            TokenModel.id == token_id,
            TokenModel.org_id == current_user.org_id,  # TENANT ISOLATION
        )
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )
    return token

async def get_admin_or_staff_queue_for_org(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_staff),
) -> "Queue":
    """
    Same as get_queue_for_org but restricted to admin or staff users.
    """
    from app.models.queue import Queue as QueueModel
    result = await db.execute(
        select(QueueModel).where(
            QueueModel.id == queue_id,
            QueueModel.org_id == current_user.org_id,
        )
    )
    queue = result.scalar_one_or_none()
    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue not found",
        )
    return queue
