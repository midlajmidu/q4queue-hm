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
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.auth_service import authenticate_user
from app.middleware.rate_limiter import login_rate_limit
from app.audit.service import record_event

logger = logging.getLogger(__name__)

router = APIRouter()


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
        token = await authenticate_user(
            db,
            email=body.email,
            plain_password=body.password,
            org_slug=body.organization_slug,
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
    return TokenResponse(access_token=token)
