"""
app/schemas/user.py
Pydantic schemas for user responses.
password_hash is DELIBERATELY excluded from all response schemas.
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    """Safe public representation of a user — no password_hash."""

    id: uuid.UUID
    email: EmailStr
    first_name: str | None
    last_name: str | None
    org_id: uuid.UUID | None = None
    parent_organization_id: uuid.UUID | None = None
    role: str
    is_active: bool
    is_first_login: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateMe(BaseModel):
    """Payload for a user updating their own profile."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class SuperAdminUserUpdate(BaseModel):
    """Payload for super admin updating any user profile."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    new_password: Optional[str] = Field(default=None, min_length=8)


class OrganizationResponse(BaseModel):
    """Safe public representation of an organization."""

    id: uuid.UUID
    name: str
    slug: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Staff Management Schemas ───────────────────────────────────────────────────

class StaffCreate(BaseModel):
    """Payload for creating a new staff member. Role is always 'staff'."""
    email: EmailStr
    first_name: str
    last_name: str
    password: str = Field(..., min_length=8, description="Minimum 8 characters")


class StaffUpdate(BaseModel):
    """Payload for updating an existing staff member. Role is intentionally excluded."""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    new_password: Optional[str] = Field(default=None, min_length=8)


class StaffResponse(BaseModel):
    """Safe staff member representation — no password_hash."""
    id: uuid.UUID
    email: EmailStr
    first_name: str | None
    last_name: str | None
    org_id: uuid.UUID
    role: str
    is_active: bool
    is_first_login: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedStaffResponse(BaseModel):
    items: list[StaffResponse]
    total: int
    limit: int
    offset: int
