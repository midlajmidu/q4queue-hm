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
import hashlib
import hmac
import logging
import secrets

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
from app.schemas.subscription import TrialSignupOtpRequest, TrialSignupResponse, TrialSignupVerifyRequest
from app.services.auth_service import TRIAL_EXPIRED_MESSAGE, authenticate_user
from app.middleware.rate_limiter import login_rate_limit, api_rate_limit
from app.audit.service import record_event
from app.core.deps import get_current_user
from app.core.security import hash_password, create_access_token
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


def _trial_otp_digest(email: str, otp: str) -> str:
    """Bind the short-lived OTP to the destination email without storing it in plaintext."""
    from app.core.config import get_settings
    secret = get_settings().SECRET_KEY.encode("utf-8")
    return hmac.new(secret, f"{email}:{otp}".encode("utf-8"), hashlib.sha256).hexdigest()


async def _ensure_trial_email_available(db: AsyncSession, email: str) -> None:
    from sqlalchemy import func, select
    from app.models.parent_organization import ParentOrganization

    if await db.scalar(select(User.id).where(func.lower(User.email) == email).limit(1)):
        raise HTTPException(status_code=409, detail="An account with this email address already exists.")
    if await db.scalar(select(ParentOrganization.id).where(func.lower(ParentOrganization.contact_email) == email).limit(1)):
        raise HTTPException(status_code=409, detail="An account with this email address already exists.")


@router.post(
    "/trial-signup/request-otp",
    summary="Send a trial signup email verification code",
    dependencies=[Depends(login_rate_limit)],
)
async def request_trial_signup_otp(
    body: TrialSignupOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    from app.redis.client import get_redis
    from app.services.email_service import send_trial_signup_otp_email

    clean_email = body.email.strip().lower()
    await _ensure_trial_email_available(db, clean_email)

    redis = get_redis()
    cooldown_key = f"otp:trial_signup:cooldown:{clean_email}"
    if not await redis.set(cooldown_key, "1", ex=60, nx=True):
        raise HTTPException(status_code=429, detail="Please wait one minute before requesting another code.")

    otp = "".join(str(secrets.randbelow(10)) for _ in range(6))
    otp_key = f"otp:trial_signup:{clean_email}"
    attempts_key = f"otp:trial_signup:attempts:{clean_email}"
    await redis.setex(otp_key, 300, _trial_otp_digest(clean_email, otp))
    await redis.delete(attempts_key)

    if not await send_trial_signup_otp_email(clean_email, otp):
        await redis.delete(otp_key, cooldown_key)
        logger.error("Trial verification email delivery failed | email=%s", clean_email)
        raise HTTPException(status_code=503, detail="We could not send the verification email. Please try again shortly.")

    return {"message": "A 6-digit verification code has been sent to your email.", "expires_in": 300}


@router.post(
    "/trial-signup",
    response_model=TrialSignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a self-service free trial",
    dependencies=[Depends(login_rate_limit)],
)
async def trial_signup(
    body: TrialSignupVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TrialSignupResponse:
    """Verify email, then provision parent, first branch, branch admin and trial atomically."""
    from sqlalchemy.exc import IntegrityError
    from app.redis.client import get_redis
    from app.services.entitlement_service import subscription_summary
    from app.services.trial_onboarding_service import create_trial_account

    clean_email = body.email.strip().lower()
    redis = get_redis()
    otp_key = f"otp:trial_signup:{clean_email}"
    attempts_key = f"otp:trial_signup:attempts:{clean_email}"
    submitted_digest = _trial_otp_digest(clean_email, body.otp.strip())
    stored_digest = await redis.get(otp_key)
    if not stored_digest or not hmac.compare_digest(stored_digest, submitted_digest):
        attempts = await redis.incr(attempts_key)
        if attempts == 1:
            await redis.expire(attempts_key, 300)
        if attempts >= 5:
            await redis.delete(otp_key, attempts_key)
            raise HTTPException(status_code=400, detail="Too many incorrect attempts. Request a new verification code.")
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    # Consume before tenant creation. Concurrent submissions cannot reuse the code.
    consumed = await redis.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
        1,
        otp_key,
        submitted_digest,
    )
    if consumed != 1:
        raise HTTPException(status_code=400, detail="This verification code has already been used. Request a new code.")
    await redis.delete(attempts_key)

    try:
        token, branch, _subscription, user = await create_trial_account(db, body)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Email or organization name is already registered.") from exc
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RuntimeError as exc:
        await db.rollback()
        logger.error("Trial signup configuration failure: %s", exc)
        raise HTTPException(status_code=503, detail="Free trial signup is temporarily unavailable.") from exc

    await record_event(
        event_type="trial.signup",
        user_id=user.id,
        org_id=branch.id,
        parent_org_id=user.parent_organization_id,
        ip_address=request.client.host if request.client else None,
        resource_type="subscription",
        details={"email": user.email, "branch_slug": branch.slug, "source": "self_service_trial"},
    )
    summary = await subscription_summary(db, branch.id)
    return TrialSignupResponse(
        access_token=token,
        organization_slug=branch.slug,
        subscription=summary,
    )

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
        is_expired_trial = str(exc) == TRIAL_EXPIRED_MESSAGE
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN if is_expired_trial else status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers=None if is_expired_trial else {"WWW-Authenticate": "Bearer"},
        ) from exc

    await record_event(
        event_type="auth.login",
        user_id=user.id,
        org_id=user.org_id,
        parent_org_id=user.parent_organization_id,
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
