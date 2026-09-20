"""
app/schemas/appointment.py
Pydantic schemas for appointment bookings, available slots, and check-in.
"""
import uuid
from datetime import date, time, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.models.appointment import AppointmentStatus


class TimeSlot(BaseModel):
    start_time: str = Field(..., description="HH:MM format")
    end_time: str = Field(..., description="HH:MM format")
    capacity: int = Field(default=1)
    booked_count: int = Field(default=0)
    available: bool = Field(default=True)
    is_next_day: bool = Field(default=False, description="True if slot falls past midnight into next calendar day")


class AvailableSlotsResponse(BaseModel):
    queue_id: uuid.UUID
    date: date
    slot_duration: int
    slots: List[TimeSlot]


class AppointmentCreate(BaseModel):
    """Customer-facing public booking request."""
    customer_name: str = Field(..., min_length=1, max_length=120)
    customer_phone: str = Field(..., min_length=10, max_length=20)
    customer_email: Optional[str] = Field(None, max_length=120)
    appointment_date: date
    start_time: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    pax_count: int = Field(default=1, ge=1, le=50)
    custom_data: Optional[Dict[str, Any]] = None
    security_pin: Optional[str] = Field(None, max_length=10)


class StaffAppointmentCreate(BaseModel):
    """Staff/admin manual booking request."""
    queue_id: uuid.UUID
    customer_name: str = Field(..., min_length=1, max_length=120)
    customer_phone: str = Field(..., min_length=10, max_length=20)
    customer_email: Optional[str] = Field(None, max_length=120)
    appointment_date: date
    start_time: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    pax_count: int = Field(default=1, ge=1, le=50)
    custom_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    start_time: Optional[str] = Field(None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None
    custom_data: Optional[Dict[str, Any]] = None


class AppointmentResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    queue_id: uuid.UUID
    queue_name: Optional[str] = None
    session_id: Optional[uuid.UUID] = None
    token_id: Optional[uuid.UUID] = None
    token_number: Optional[int] = None
    token_prefix: Optional[str] = None
    booking_reference: str
    security_pin: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    pax_count: int
    appointment_date: date
    start_time: time
    end_time: time
    status: AppointmentStatus
    custom_data: Optional[Dict[str, Any]] = None
    field_schema: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None
    booked_by: str
    checked_in_at: Optional[datetime] = None
    checked_in_by: Optional[str] = None
    is_next_day: bool = Field(default=False)
    total_call_duration_seconds: int = Field(default=0)
    call_count: int = Field(default=0)
    last_call_status: Optional[str] = None
    last_called_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AppointmentPublicPass(BaseModel):
    """Sanitized public view for digital pass."""
    booking_reference: str
    org_id: uuid.UUID
    queue_id: uuid.UUID
    queue_name: str
    customer_name: str
    customer_phone_masked: str
    appointment_date: date
    start_time: str
    end_time: str
    status: AppointmentStatus
    pax_count: int
    can_check_in: bool
    check_in_window_message: Optional[str] = None
    is_next_day: bool = Field(default=False)
    token_id: Optional[uuid.UUID] = None
    token_number: Optional[int] = None
    token_prefix: Optional[str] = None
    tracking_id: Optional[uuid.UUID] = None
    org_name: Optional[str] = None
    org_slug: Optional[str] = None
    parent_org_name: Optional[str] = None
    branch_address: Optional[str] = None
    branch_phone: Optional[str] = None
    notes: Optional[str] = None
