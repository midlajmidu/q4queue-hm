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
    total_customers: int = 0
    customers_served: int = 0
    customers_skipped: int = 0
    completion_rate: str = "0%"
    skip_rate: str = "0%"

class BranchPerformanceMetrics(BaseModel):
    customers_served_today: int
    customers_waiting: int
    average_wait_time: str
    average_service_time: str
    cancelled_tokens: int
    completion_rate: str
    total_customers: int = 0
    customers_served: int = 0
    customers_skipped: int = 0
    skip_rate: str = "0%"

class QueueBreakdownItem(BaseModel):
    queue_id: uuid.UUID
    queue_name: str
    queue_prefix: Optional[str] = None
    status: str
    current_token: str
    waiting_count: int
    serving_count: int
    completed_today: int
    average_wait: str
    total_customers: int = 0
    served_count: int = 0
    skipped_count: int = 0
    average_service_time: str = "-"
    completion_rate: str = "0%"
    skip_rate: str = "0%"

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
    role: str

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

class PeakTrafficItem(BaseModel):
    hour: str
    customers_arrived: int

class BranchTrafficData(BaseModel):
    peak_traffic: List[PeakTrafficItem]
    peak_hour: Optional[str] = None

class AppointmentSummaryItem(BaseModel):
    id: uuid.UUID
    booking_reference: str
    customer_name: str
    customer_phone: str
    queue_name: str
    appointment_date: str
    start_time: str
    end_time: str
    status: str

class BranchAppointmentStats(BaseModel):
    total_confirmed: int = 0
    today_confirmed: int = 0
    tomorrow_confirmed: int = 0
    upcoming_confirmed: int = 0
    total_all: int = 0
    recent_confirmed: List[AppointmentSummaryItem] = []

class BranchDashboardResponse(BaseModel):
    summary: BranchExecutiveSummary
    performance: BranchPerformanceMetrics
    queues: List[QueueBreakdownItem]
    sessions: List[SessionBreakdownItem] = []
    staff: List[StaffOverviewItem]
    admins: List[BranchAdminItem]
    whatsapp: BranchWhatsAppStats
    health: BranchHealthDetails
    timeline: List[BranchActivityEvent]
    alerts: List[BranchAlert]
    contact: BranchContactDetails
    traffic: BranchTrafficData
    appointments: Optional[BranchAppointmentStats] = None
