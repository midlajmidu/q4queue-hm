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
    starting_sequence: int = Field(default=1, ge=1)
    open_time: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    close_time: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    service_lines: int = Field(default=0, ge=0, le=20, description="0=single counter, >0=multi-lane mode")

class QueueUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    prefix: Optional[str] = Field(None, min_length=1, max_length=10)
    starting_sequence: Optional[int] = Field(None, ge=1)
    open_time: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    close_time: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    service_lines: Optional[int] = Field(None, ge=0)

class AnnouncementUpdate(BaseModel):
    announcement: Optional[str] = Field(None, max_length=500)


class QueueResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    name: str
    prefix: str
    announcement: Optional[str] = None
    starting_sequence: int
    current_token_number: int
    total_served: int
    is_active: bool
    is_paused: bool = False
    service_lines: int = 0
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Token join ────────────────────────────────────────────────────────────────

class JoinRequest(BaseModel):
    """Customer details required to take a token."""
    name: str = Field(..., min_length=1, max_length=120)
    age: Optional[int] = Field(None, ge=0, le=150)
    phone: str = Field(..., min_length=10, max_length=15)
    companion_names: list[str] = Field(default_factory=list, max_items=9)
    send_whatsapp: bool = Field(default=True)
    entry_type: Optional[str] = Field(default="qr")

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
    queue_prefix: Optional[str] = None
    session_id: Optional[uuid.UUID] = None
    tracking_id: Optional[uuid.UUID] = None  # public tracking URL ID
    companion_names: list[str]
    is_existing: bool = False  # True if this token already existed (duplicate phone)


class PublicTokenResponse(BaseModel):
    """Public details for a single token."""
    token_number: int
    status: TokenStatus
    customer_name: str
    customer_age: Optional[int]
    customer_phone: str
    companion_names: list[str]
    session_id: uuid.UUID
    entry_type: Optional[str] = None

    model_config = {"from_attributes": True}
    

class TokenRestoreResponse(BaseModel):
    """Details used to track or restore a token session in the public UI."""
    id: uuid.UUID
    token_number: int
    status: TokenStatus
    queue_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    queue_prefix: Optional[str] = None
    customer_name: str
    customer_age: Optional[int] = None
    customer_phone: str
    companion_names: list[str]
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
    companion_names: list[str]
    removed_by: Optional[str] = None
    assigned_line: Optional[int] = None
    entry_type: Optional[str] = None

    model_config = {"from_attributes": True}


class PaginatedQueueResponse(BaseModel):
    items: list[QueueResponse]
    total: int
    limit: int
    offset: int
