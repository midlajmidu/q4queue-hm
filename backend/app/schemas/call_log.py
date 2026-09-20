import math
import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class CallLogBase(BaseModel):
    queue_id: Optional[uuid.UUID] = None
    session_id: Optional[uuid.UUID] = None
    token_id: Optional[uuid.UUID] = None
    appointment_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None
    customer_phone: str
    duration_seconds: int = 0

class CallLogCreate(CallLogBase):
    organization_id: Optional[uuid.UUID] = None
    call_status: str = "completed"
    ring_duration_seconds: int = 0

class CallLogRead(CallLogBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    called_by_id: Optional[uuid.UUID] = None
    called_by_name: Optional[str] = None
    queue_name: Optional[str] = None
    booking_reference: Optional[str] = None
    billable_minutes: int = 0
    call_status: str = "completed"
    ring_duration_seconds: int = 0
    cost_amount: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True

class StaffCallStat(BaseModel):
    staff_id: Optional[uuid.UUID] = None
    staff_name: str
    call_count: int
    total_duration_seconds: int
    total_billable_minutes: int
    total_cost_amount: float = 0.0

class CallLogsOverviewResponse(BaseModel):
    total_calls: int
    total_duration_seconds: int
    total_billable_minutes: int
    avg_duration_seconds: float
    connection_rate: float = 0.0
    total_amount: float = 0.0
    rate_per_minute: float = 1.50
    currency: str = "₹"
    staff_stats: List[StaffCallStat] = []

class PaginatedCallLogsResponse(BaseModel):
    items: List[CallLogRead]
    total: int
    page: int
    limit: int
    pages: int

# ── Super Admin Calling Config Schemas ──────────────────────────
class BranchCallingConfig(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    call_rate_per_minute: Optional[float] = None
    effective_rate: float = 1.50
    calling_currency: str = "₹"
    total_calls: int = 0
    total_duration_seconds: int = 0
    total_billable_minutes: int = 0
    total_amount: float = 0.0

class CallingConfigRead(BaseModel):
    global_rate_per_minute: float = 1.50
    currency: str = "₹"
    total_calls: int = 0
    total_duration_seconds: int = 0
    total_billable_minutes: int = 0
    total_amount: float = 0.0
    branches: List[BranchCallingConfig] = []

class CallingConfigUpdate(BaseModel):
    global_rate_per_minute: float
    currency: str = "₹"
    branch_overrides: Optional[dict[str, Optional[float]]] = None
