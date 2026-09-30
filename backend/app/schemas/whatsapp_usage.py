"""
app/schemas/whatsapp_usage.py
Schemas for Super Admin WhatsApp Usage & Pricing Analytics.
"""
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class BranchWhatsAppUsage(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    parent_org_name: Optional[str] = None
    parent_org_slug: Optional[str] = None
    delivery_mode: str = "button_reply_only"
    effective_rate: float = 0.12
    currency: str = "₹"
    total_messages: int = 0
    delivered_messages: int = 0
    billable_messages: int = 0
    free_session_messages: int = 0
    read_messages: int = 0
    failed_messages: int = 0
    total_amount: float = 0.0
    last_sent_at: Optional[datetime] = None


class WhatsAppUsageResponse(BaseModel):
    global_rate_per_message: float = 0.12
    currency: str = "₹"
    total_messages: int = 0
    total_delivered: int = 0
    total_billable: int = 0
    total_free_session: int = 0
    total_read: int = 0
    total_failed: int = 0
    total_amount: float = 0.0
    active_branches_count: int = 0
    branches: List[BranchWhatsAppUsage] = []


class WhatsAppRateUpdate(BaseModel):
    global_rate_per_message: float
    currency: str = "₹"
