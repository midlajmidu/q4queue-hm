import math
import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class CallLogBase(BaseModel):
    queue_id: Optional[uuid.UUID] = None
    session_id: Optional[uuid.UUID] = None
    token_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None
    customer_phone: str
    duration_seconds: int = 0

class CallLogCreate(CallLogBase):
    organization_id: Optional[uuid.UUID] = None

class CallLogRead(CallLogBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    called_by_id: Optional[uuid.UUID] = None
    called_by_name: Optional[str] = None
    queue_name: Optional[str] = None
    billable_minutes: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class StaffCallStat(BaseModel):
    staff_id: Optional[uuid.UUID] = None
    staff_name: str
    call_count: int
    total_duration_seconds: int
    total_billable_minutes: int

class CallLogsOverviewResponse(BaseModel):
    total_calls: int
    total_duration_seconds: int
    total_billable_minutes: int
    avg_duration_seconds: float
    staff_stats: List[StaffCallStat] = []

class PaginatedCallLogsResponse(BaseModel):
    items: List[CallLogRead]
    total: int
    page: int
    limit: int
    pages: int
