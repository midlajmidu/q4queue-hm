"""
app/schemas/queue.py
Pydantic schemas for Queue and Token request/response.
"""
import uuid
import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.token import TokenStatus


# ── Queue ─────────────────────────────────────────────────────────────────────

class QueueCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    prefix: str = Field(default="A", min_length=1, max_length=10)


class AnnouncementUpdate(BaseModel):
    announcement: Optional[str] = Field(None, max_length=500)


class QueueResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    name: str
    prefix: str
    announcement: Optional[str] = None
    current_token_number: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Token join ────────────────────────────────────────────────────────────────

class JoinRequest(BaseModel):
    """Customer details required to take a token."""
    name: str = Field(..., min_length=1, max_length=120)
    age: Optional[int] = Field(None, ge=0, le=150)
    phone: str = Field(..., min_length=10, max_length=15)

    @field_validator("name", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v
        
    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not isinstance(v, str):
            return v
        
        # Remove whitespace
        v = v.strip()
        
        # Check if it starts with +
        has_plus = v.startswith("+")
        
        # Remove all non-digits for length check
        digits = re.sub(r"\D", "", v)
        
        if len(digits) < 7 or len(digits) > 15:
            raise ValueError("Phone number must be between 7 and 15 digits")
            
        return f"+{digits}" if has_plus else digits


class JoinResponse(BaseModel):
    """Returned when a customer joins a queue."""
    id: uuid.UUID           # The unique database ID of the token
    token_number: int
    position: int           # how many 'waiting' tokens are ahead
    current_serving: int    # the token_number currently being served (0 = none)
    queue_prefix: str
    session_id: uuid.UUID
    tracking_id: Optional[uuid.UUID] = None  # public tracking URL ID


class PublicTokenResponse(BaseModel):
    """Public details for a single token."""
    token_number: int
    status: TokenStatus
    customer_name: str
    customer_age: Optional[int]
    customer_phone: str
    session_id: uuid.UUID

    model_config = {"from_attributes": True}
    

class TokenRestoreResponse(BaseModel):
    """Details used to track or restore a token session in the public UI."""
    id: uuid.UUID
    token_number: int
    status: TokenStatus
    queue_id: uuid.UUID
    session_id: uuid.UUID
    queue_prefix: str
    customer_name: str
    customer_age: Optional[int] = None
    customer_phone: str
    created_at: datetime
    served_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Admin next ────────────────────────────────────────────────────────────────

class NextResponse(BaseModel):
    """Returned when admin clicks Next."""
    serving: int            # token_number now serving
    remaining: int          # waiting tokens still in queue


class NoTokenResponse(BaseModel):
    message: str = "No tokens waiting"


# ── Token detail ──────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    queue_id: uuid.UUID
    session_id: uuid.UUID
    token_number: int
    status: TokenStatus
    created_at: datetime
    served_at: Optional[datetime]
    completed_at: Optional[datetime]
    customer_name: str
    customer_age: Optional[int]
    customer_phone: str
    tracking_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}


class PaginatedQueueResponse(BaseModel):
    items: list[QueueResponse]
    total: int
    limit: int
    offset: int
