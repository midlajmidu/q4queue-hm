"""
app/core/security.py
Password hashing and JWT token utilities.
Rules:
  - NEVER log passwords or tokens
  - NEVER return password_hash in responses
  - All secrets come from Settings
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Password hashing ──────────────────────────────────────────────────────────
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Constant-time comparison of plain vs hashed.
    Returns True only if they match.
    """
    return _pwd_context.verify(plain_password, hashed_password)


# ── JWT ───────────────────────────────────────────────────────────────────────
def create_access_token(
    *,
    user_id: str,
    org_id: str | None,
    role: str,
    email: str,
    org_slug: str | None = None,
    org_name: str | None = None,
    org_logo_url: str | None = None,
    is_first_login: bool = False,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a signed HS256 JWT.

    Payload:
        sub     → user_id  (string)
        org_id  → org_id   (string) / nullable for super_admin
        role    → role      (string)
        exp     → UTC expiration
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload: dict[str, Any] = {
        "sub": user_id,
        "org_id": org_id,
        "org_slug": org_slug,
        "org_name": org_name,
        "org_logo_url": org_logo_url,
        "role": role,
        "email": email,
        "is_first_login": is_first_login,
        "exp": expire,
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT.
    Raises JWTError on invalid signature or expiration.
    NEVER log the raw token.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as exc:
        logger.warning("Token validation failed: %s", exc)
        raise
