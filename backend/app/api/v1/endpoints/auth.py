"""
app/api/v1/endpoints/auth.py
Authentication endpoints — rate-limited and audited.

POST /auth/login
  - Multi-tenant: requires organization_slug
  - Returns Bearer JWT on success
  - Always returns 401 on ANY credential failure (no info leak)
  - Rate limited: 10 req/min per IP
  - Audit logged on success and failure
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    ChangeFirstPasswordRequest,
    ForgotPasswordOtpRequest,
    ResetPasswordWithOtpRequest,
)
from app.services.auth_service import authenticate_user
from app.middleware.rate_limiter import login_rate_limit, api_rate_limit
from app.audit.service import record_event
from app.core.deps import get_current_user
from app.core.security import hash_password, create_access_token
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/fix-tokens")
async def fix_tokens(db: AsyncSession = Depends(get_db)):
    from app.models.token import Token, TokenStatus
    from app.models.user import User
    from sqlalchemy import select, update
    
    # Get any active user ID to use as a placeholder staff member
    user_res = await db.execute(select(User.id).limit(1))
    user_id = user_res.scalar()
    
    if user_id:
        # Patch all done/serving tokens
        await db.execute(
            update(Token)
            .where(Token.status.in_([TokenStatus.done, TokenStatus.serving]))
            .where(Token.served_by_id.is_(None))
            .values(served_by_id=user_id, completed_by_id=user_id)
        )
        await db.commit()
        return {"msg": "Fixed!"}
    return {"msg": "No users found"}



@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Tenant Login",
    dependencies=[Depends(login_rate_limit)],
    description=(
        "Authenticate a user within a specific organization. "
        "Rate limited to 10 requests per minute per IP."
    ),
)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Multi-tenant login endpoint.
    Returns a Bearer JWT valid for ACCESS_TOKEN_EXPIRE_MINUTES.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    try:
        token, user = await authenticate_user(
            db,
            email=body.email,
            plain_password=body.password,
            org_slug=body.organization_slug,
            login_type=body.login_type,
        )
    except ValueError as exc:
        await record_event(
            event_type="auth.login_failed",
            ip_address=client_ip,
            details={"email": body.email, "org_slug": body.organization_slug, "user_agent": user_agent},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    await record_event(
        event_type="auth.login",
        ip_address=client_ip,
        details={"email": body.email, "org_slug": body.organization_slug, "user_agent": user_agent},
    )
    return TokenResponse(
        access_token=token,
        force_password_change=user.is_first_login
    )


@router.post(
    "/change-first-password",
    response_model=TokenResponse,
    summary="Change First-Time Password",
    dependencies=[Depends(api_rate_limit)],
)
async def change_first_password(
    body: ChangeFirstPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Allows a user whose is_first_login == True to set their new password.
    After this, is_first_login is set to False, and a new JWT is issued.
    """
    if not current_user.is_first_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password has already been changed."
        )

    current_user.password_hash = hash_password(body.new_password)
    current_user.is_first_login = False
    
    await db.commit()
    
    # Issue a fresh token because the old one has `is_first_login=True` in payload
    # Let's load organization explicitly
    from app.models.organization import Organization
    from app.models.parent_organization import ParentOrganization
    from sqlalchemy import select
    org_slug, org_name, org_logo_url = None, None, None
    if current_user.org_id:
        org_res = await db.execute(select(Organization).where(Organization.id == current_user.org_id))
        org = org_res.scalar_one_or_none()
        if org:
            org_slug, org_name, org_logo_url = org.slug, org.name, getattr(org, 'logo_url', None)
    elif current_user.parent_organization_id:
        parent_org_res = await db.execute(select(ParentOrganization).where(ParentOrganization.id == current_user.parent_organization_id))
        parent_org = parent_org_res.scalar_one_or_none()
        if parent_org:
            org_slug, org_name = parent_org.slug, parent_org.name
            
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
        is_first_login=False,
    )
    
    return TokenResponse(
        access_token=token,
        force_password_change=False
    )


@router.post(
    "/forgot-password-otp",
    summary="Request Password Reset OTP",
    dependencies=[Depends(api_rate_limit)],
)
async def request_forgot_password_otp(
    body: ForgotPasswordOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate and send a 6-digit OTP to the user's email if the user exists.
    """
    import secrets
    from sqlalchemy import select
    from app.models.organization import Organization
    from app.redis.client import get_redis
    from app.services.email_service import send_otp_email

    clean_email = body.email.strip().lower()
    query = select(User).where(User.email.ilike(clean_email))
    
    if body.organization_slug and body.organization_slug.strip():
        query = query.join(Organization, User.org_id == Organization.id).where(Organization.slug == body.organization_slug.strip())
        
    res = await db.execute(query)
    user = res.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This email address is not registered with us. Please check your email address."
        )

    otp = "".join(str(secrets.randbelow(10)) for _ in range(6))
    redis = get_redis()
    otp_key = f"otp:forgot_pwd:{clean_email}"
    await redis.setex(otp_key, 300, otp)
    await send_otp_email(user.email, otp)
        
    return {"message": "A verification OTP has been sent to your email address."}


@router.post(
    "/reset-password-with-otp",
    summary="Reset Password using Email OTP",
    dependencies=[Depends(api_rate_limit)],
)
async def reset_password_with_otp(
    body: ResetPasswordWithOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify OTP and update user's password.
    """
    from datetime import datetime, timezone
    from sqlalchemy import select
    from app.models.organization import Organization
    from app.redis.client import get_redis

    clean_email = body.email.strip().lower()
    redis = get_redis()
    otp_key = f"otp:forgot_pwd:{clean_email}"
    
    stored_otp = await redis.get(otp_key)
    if not stored_otp or stored_otp != body.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please request a new code."
        )

    query = select(User).where(User.email.ilike(clean_email))
    if body.organization_slug and body.organization_slug.strip():
        query = query.join(Organization, User.org_id == Organization.id).where(Organization.slug == body.organization_slug.strip())

    res = await db.execute(query.with_for_update())
    user = res.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    user.password_hash = hash_password(body.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    user.is_first_login = False
    
    await db.commit()
    await redis.delete(otp_key)

    return {"message": "Password reset successfully. You can now log in with your new password."}

