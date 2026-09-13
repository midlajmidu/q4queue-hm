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

def _parse_time_str(v: Optional[str]) -> Optional[str]:
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    val = v.strip()
    for fmt in ("%H:%M", "%I:%M %p", "%I:%M%p", "%I:%M:%S %p", "%H:%M:%S"):
        try:
            dt = datetime.strptime(val, fmt)
            return dt.strftime("%H:%M")
        except ValueError:
            continue
    return val


from enum import Enum


class CustomFieldType(str, Enum):
    text = "text"
    number = "number"
    phone = "phone"
    email = "email"
    date = "date"
    select = "select"
    textarea = "textarea"


class CustomFieldSchema(BaseModel):
    id: Optional[str] = Field(None, max_length=100)
    key: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    label: str = Field(..., min_length=1, max_length=100)
    type: CustomFieldType
    required: bool = False
    order: int = Field(default=0, ge=0, le=1000)
    options: Optional[list[str]] = None

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return None
        if len(v) > 50:
            raise ValueError("Maximum 50 select options allowed")
        sanitized = []
        seen = set()
        for opt in v:
            if not isinstance(opt, str):
                raise ValueError("Select options must be strings")
            s = opt.strip()
            if not s:
                raise ValueError("Select option cannot be empty")
            if len(s) > 100:
                raise ValueError("Select option cannot exceed 100 characters")
            s_lower = s.lower()
            if s_lower in seen:
                continue
            seen.add(s_lower)
            sanitized.append(s)
        return sanitized


def validate_custom_fields_list(v: Optional[list]) -> Optional[list[dict]]:
    if v is None:
        return None
    if not isinstance(v, list):
        raise ValueError("custom_fields must be a list")
    if len(v) > 20:
        raise ValueError("Maximum 20 custom fields allowed per queue")

    seen_keys = set()
    validated_fields = []
    for item in v:
        if isinstance(item, dict):
            field_obj = CustomFieldSchema(**item)
        elif isinstance(item, CustomFieldSchema):
            field_obj = item
        else:
            raise ValueError("Invalid custom field item format")

        lower_key = field_obj.key.lower()
        if lower_key in seen_keys:
            raise ValueError(f"Duplicate custom field key: '{field_obj.key}'")
        seen_keys.add(lower_key)

        # Enforce name and phone to be required
        if lower_key in ("name", "phone"):
            field_obj.required = True

        if field_obj.type == CustomFieldType.select:
            if not field_obj.options or len(field_obj.options) == 0:
                raise ValueError(f"Select field '{field_obj.key}' must have at least one option")

        validated_fields.append(field_obj.model_dump())

    # Ensure 'name' and 'phone' are always present
    has_name = any(f["key"].lower() == "name" for f in validated_fields)
    has_phone = any(f["key"].lower() == "phone" for f in validated_fields)

    if not has_name:
        validated_fields.insert(0, {
            "id": "default_name",
            "key": "name",
            "label": "Full Name",
            "type": "text",
            "required": True,
            "order": 0
        })

    if not has_phone:
        insert_idx = 1 if not has_name else 1
        validated_fields.insert(insert_idx, {
            "id": "default_phone",
            "key": "phone",
            "label": "Phone Number",
            "type": "phone",
            "required": True,
            "order": 1
        })

    for idx, f in enumerate(validated_fields):
        f["order"] = idx

    return validated_fields


class QueueCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    prefix: str = Field(default="A", min_length=1, max_length=10)
    starting_sequence: int = Field(default=1, ge=1)
    open_time: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    close_time: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    service_lines: int = Field(default=0, ge=0, le=20, description="0=single counter, >0=multi-lane mode")
    custom_fields: Optional[list[dict]] = None

    @field_validator("open_time", "close_time", mode="before")
    @classmethod
    def sanitize_time(cls, v: Optional[str]) -> Optional[str]:
        return _parse_time_str(v)

    @field_validator("custom_fields", mode="before")
    @classmethod
    def validate_fields(cls, v: Optional[list]) -> Optional[list[dict]]:
        return validate_custom_fields_list(v)


class QueueUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    prefix: Optional[str] = Field(None, min_length=1, max_length=10)
    starting_sequence: Optional[int] = Field(None, ge=1)
    open_time: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    close_time: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    service_lines: Optional[int] = Field(None, ge=0, le=20)
    custom_fields: Optional[list[dict]] = None

    @field_validator("open_time", "close_time", mode="before")
    @classmethod
    def sanitize_time(cls, v: Optional[str]) -> Optional[str]:
        return _parse_time_str(v)

    @field_validator("custom_fields", mode="before")
    @classmethod
    def validate_fields(cls, v: Optional[list]) -> Optional[list[dict]]:
        return validate_custom_fields_list(v)

class AnnouncementUpdate(BaseModel):
    announcement: Optional[str] = Field(None, max_length=500)


class QueueResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    name: str
    prefix: str
    announcement: Optional[str] = None
    starting_sequence: int
    current_token_number: int
    total_served: int
    is_active: bool
    is_paused: bool = False
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    service_lines: int = 0
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    custom_fields: Optional[list] = None
    token_session_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Token join ────────────────────────────────────────────────────────────────

class JoinRequest(BaseModel):
    """Customer details required to take a token."""
    name: str = Field(..., min_length=1, max_length=120)
    age: Optional[int] = Field(None, ge=0, le=150)
    phone: str = Field(..., min_length=10, max_length=15)
    pax_count: int = Field(default=1, ge=1, le=100)
    send_whatsapp: bool = Field(default=False)
    entry_type: Optional[str] = Field(default="qr")
    qr_token: Optional[str] = Field(default=None, description="Single-use QR validation token")
    session_id: Optional[uuid.UUID] = Field(default=None, description="Optional target session ID to join")
    custom_data: Optional[dict] = None

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
    pax_count: int
    is_existing: bool = False  # True if this token already existed (duplicate phone)


class PublicTokenResponse(BaseModel):
    """Public details for a single token."""
    token_number: int
    status: TokenStatus
    customer_name: str
    customer_age: Optional[int]
    customer_phone: str
    pax_count: int
    session_id: uuid.UUID
    entry_type: Optional[str] = None

    model_config = {"from_attributes": True}
    

class TokenRestoreResponse(BaseModel):
    """Non-PII details used to restore the customer's tracking route."""
    token_number: int
    status: TokenStatus
    queue_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    queue_prefix: Optional[str] = None
    tracking_id: uuid.UUID
    pax_count: int = 1
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
    pax_count: int
    removed_by: Optional[str] = None
    assigned_line: Optional[int] = None
    entry_type: Optional[str] = None
    custom_data: Optional[dict] = None
    shared_lines: list[int] = []
    completed_lines: list[int] = []

    model_config = {"from_attributes": True}


class PaginatedQueueResponse(BaseModel):
    items: list[QueueResponse]
    total: int
    limit: int
    offset: int
