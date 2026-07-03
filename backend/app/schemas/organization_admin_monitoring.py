from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class GlobalKPIs(BaseModel):
    total_branches: int
    active_branches: int
    inactive_branches: int
    total_staff: int
    total_branch_admins: int
    total_customers_waiting: int
    total_customers_served_today: int
    org_health_score: int
    waiting_trend_value: float = 0.0
    waiting_trend_direction: str = "neutral"
    served_trend_value: float = 0.0
    served_trend_direction: str = "neutral"

class DynamicInsights(BaseModel):
    active_sessions: int
    active_queues: int
    customers_being_served: int
    average_wait_time: str
    average_service_time: str
    whatsapp_success_rate: float
    sessions_trend_value: float = 0.0
    sessions_trend_direction: str = "neutral"
    serving_trend_value: float = 0.0
    serving_trend_direction: str = "neutral"

class ExecutiveInsights(BaseModel):
    top_performing_branch: Optional[str] = None
    top_performing_branch_id: Optional[uuid.UUID] = None
    busiest_branch: Optional[str] = None
    busiest_branch_id: Optional[uuid.UUID] = None
    best_avg_wait_time: Optional[str] = None
    most_customers_served: Optional[str] = None
    most_active_queue: Optional[str] = None

class WhatsAppOverview(BaseModel):
    messages_sent_today: int
    delivered: int
    failed: int
    pending: int
    success_rate: float

class BranchHealthOverview(BaseModel):
    healthy_branches: int
    warning_branches: int
    critical_branches: int

class DashboardAlert(BaseModel):
    message: str
    type: str
    severity: str

class BranchPerformanceRow(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    waiting_customers: int
    serving_customers: int
    customers_served_today: int
    avg_wait_time: str
    active_sessions: int
    active_queues: int
    status: str

class DashboardMetricsResponse(BaseModel):
    organization_name: str
    global_kpis: GlobalKPIs
    dynamic_insights: DynamicInsights
    executive_insights: ExecutiveInsights
    whatsapp_overview: WhatsAppOverview
    branch_health: BranchHealthOverview
    alerts: List[DashboardAlert]
    branch_performance: List[BranchPerformanceRow]
    max_branches: int | None = None

class BranchOverviewItem(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    status: str
    queues: int
    sessions: int
    serving: int = 0
    waiting: int
    served_today: int
    avg_wait_time: str
    health: str
    last_activity: Optional[datetime] = None
    total_staff: int = 0
    online_staff: int = 0
    whatsapp_success_rate: float = 0.0
    address: str | None = None
    phone_number: str | None = None
    brand_color: str | None = None
    whatsapp_failed_today: int = 0
    alerts: List[str] = []

class CustomerMetrics(BaseModel):
    total_customers: int
    customers_served: int
    customers_waiting: int
    customers_abandoned: int
    completion_rate: str
    abandonment_rate: str

class TimeMetrics(BaseModel):
    avg_wait_time: str
    avg_service_time: str
    peak_hour: str

class OperationsMetrics(BaseModel):
    active_branches: int
    active_sessions: int
    active_queues: int
    operated_queues: int
    online_staff: int

class DailyVolumeTrendItem(BaseModel):
    date: str
    customers_served: int

class BranchRankingItem(BaseModel):
    rank: int
    branch: str
    customers_served: int
    avg_wait_time: str
    avg_service_time: str
    raw_wait_sec: float
    completion_rate: str
    health_score: int
    health_status: str

class QueueAnalyticsItem(BaseModel):
    queue_name: str
    branch: str
    customers_served: int
    avg_wait_time: str
    avg_service_time: str

class PeakTrafficItem(BaseModel):
    time_block: str
    customers_arrived: int
    customers_served: int
    avg_wait_minutes: float
    is_peak: bool = False

class StaffPerformanceItem(BaseModel):
    staff_name: str
    branch: str
    customers_served: int
    avg_service_time: str

class AnalyticsResponse(BaseModel):
    customer_metrics: CustomerMetrics
    time_metrics: TimeMetrics
    operations_metrics: OperationsMetrics
    volume_trend: List[DailyVolumeTrendItem]
    branch_ranking: List[BranchRankingItem]
    queue_analytics: List[QueueAnalyticsItem]
    peak_traffic: List[PeakTrafficItem]
    staff_performance: List[StaffPerformanceItem]
    insights: List[str]

class SessionMonitorItem(BaseModel):
    id: uuid.UUID
    branch: str
    branch_slug: str
    queue: str
    session_name: str
    waiting: int
    serving: int
    completed: int
    status: str
    active_staff_present: Optional[str] = None
    active_staff_total: Optional[str] = None
    load_status: Optional[str] = None
    load_percentage: int = 0

class QueueMonitorItem(BaseModel):
    id: uuid.UUID
    branch: str
    branch_slug: str
    queue_name: str
    session_name: Optional[str] = None
    current_token: str
    waiting: int
    served_today: int
    avg_wait_time: str
    status: str
    load_percentage: int

class StaffMonitorItem(BaseModel):
    id: uuid.UUID
    branch: str
    branch_slug: str
    name: str
    email: str
    role: str
    status: str
    created_at: datetime
    last_login: Optional[datetime] = None

class WhatsAppMonitorItem(BaseModel):
    branch: str
    branch_slug: str
    messages_sent_today: int
    delivered: int
    failed: int
    pending: int
    success_rate: str
    last_sent_time: Optional[datetime] = None

class AuditMonitorItem(BaseModel):
    id: uuid.UUID
    timestamp: datetime
    branch: str
    branch_slug: str
    user_email: str
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    details: Optional[Dict[str, Any]] = None
