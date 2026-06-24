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

class DynamicInsights(BaseModel):
    active_sessions: int
    active_queues: int
    customers_being_served: int
    average_wait_time: str
    average_service_time: str
    whatsapp_success_rate: float

class ExecutiveInsights(BaseModel):
    top_performing_branch: Optional[str] = None
    busiest_branch: Optional[str] = None
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

class BranchOverviewItem(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    status: str
    queues: int
    sessions: int
    waiting: int
    served_today: int
    avg_wait_time: str
    health: str
    last_activity: Optional[datetime] = None
    total_staff: int = 0
    online_staff: int = 0
    whatsapp_success_rate: float = 0.0
    whatsapp_failed_today: int = 0
    alerts: List[str] = []

class TimeRangeMetrics(BaseModel):
    total_customers: int
    total_tokens: int
    completed_tokens: int
    cancelled_tokens: int
    avg_wait_time: str
    avg_service_time: str
    peak_hour: str
    busiest_branch: str
    least_busy_branch: str

class BranchComparisonItem(BaseModel):
    branch: str
    customers: int
    wait_time: str
    completion_rate: str
    avg_service_time: str

class AnalyticsResponse(BaseModel):
    today: TimeRangeMetrics
    this_week: TimeRangeMetrics
    this_month: TimeRangeMetrics
    branch_comparison: List[BranchComparisonItem]

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

class QueueMonitorItem(BaseModel):
    id: uuid.UUID
    branch: str
    branch_slug: str
    queue_name: str
    current_token: str
    waiting_count: int
    avg_wait: str
    status: str
    load_indicator: str

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
    user: str
    action: str
    details: Dict[str, Any]
