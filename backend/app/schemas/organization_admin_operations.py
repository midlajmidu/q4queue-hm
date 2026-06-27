import uuid
from typing import List, Optional
from pydantic import BaseModel

class BranchExecutiveSummary(BaseModel):
    total_staff: int
    online_staff: int
    active_sessions: int
    active_queues: int
    customers_waiting: int
    customers_being_served: int
    customers_served_today: int
    tokens_issued_today: int

class BranchPerformanceMetrics(BaseModel):
    customers_served_today: int
    customers_waiting: int
    average_wait_time: str
    average_service_time: str
    cancelled_tokens: int
    completion_rate: str

class QueueBreakdownItem(BaseModel):
    queue_id: uuid.UUID
    queue_name: str
    status: str
    current_token: str
    waiting_count: int
    serving_count: int
    completed_today: int
    average_wait: str

class SessionBreakdownItem(BaseModel):
    session_id: uuid.UUID
    session_name: str
    operator_name: str
    started_at: str
    status: str
    customers_served: int
    average_service_time: str

class StaffOverviewItem(BaseModel):
    user_id: uuid.UUID
    name: str
    role: str
    status: str
    last_login: str
    sessions_managed: int
    customers_served_today: int

class BranchAdminItem(BaseModel):
    user_id: uuid.UUID
    name: str
    email: str
    last_login: str
    status: str

class BranchWhatsAppStats(BaseModel):
    messages_sent_today: int
    delivered: int
    failed: int
    pending: int
    success_rate: float
    last_sent_time: str

class BranchHealthDetails(BaseModel):
    health_score: int
    status: str
    queue_health: str
    session_health: str
    staff_availability: str
    whatsapp_health: str
    activity_health: str

class BranchActivityEvent(BaseModel):
    id: uuid.UUID
    event_type: str
    description: str
    timestamp: str
    user_name: Optional[str] = None

class BranchAlert(BaseModel):
    id: uuid.UUID
    issue: str
    severity: str
    timestamp: str

class BranchContactDetails(BaseModel):
    address: Optional[str] = None
    contact_phone: Optional[str] = None

class BranchContactDetailsUpdate(BaseModel):
    address: Optional[str] = None
    contact_phone: Optional[str] = None
