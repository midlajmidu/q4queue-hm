"""
app/schemas/auth.py
Pydantic schemas for authentication request/response.
password_hash is NEVER included in any response schema.
"""
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """POST /auth/login payload."""

    email: EmailStr
    password: str = Field(..., min_length=6)
    organization_slug: str | None = Field(None, max_length=100)
    login_type: str = Field("staff", description="'staff' for branch login, 'org_admin' for parent organization login")

    model_config = {"json_schema_extra": {"examples": [
        {
            "email": "admin@example.com",
            "password": "s3cr3tpass",
            "organization_slug": "acme-clinic",
        }
    ]}}


class TokenResponse(BaseModel):
    """Successful login response."""

    access_token: str
    token_type: str = "bearer"
    force_password_change: bool = False

class ChangeFirstPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)
