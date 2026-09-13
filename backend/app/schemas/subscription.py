"""Schemas shared by trial onboarding and entitlement-aware UI."""
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class TrialSignupRequest(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=255)
    branch_name: str = Field(default="Main Branch", min_length=2, max_length=255)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    timezone: str = Field(default="Asia/Kolkata", max_length=50)
    accepted_terms: bool

    @field_validator("accepted_terms")
    @classmethod
    def terms_must_be_accepted(cls, value: bool) -> bool:
        if not value:
            raise ValueError("You must accept the terms to start a trial")
        return value


class TrialSignupOtpRequest(BaseModel):
    email: EmailStr


class TrialSignupVerifyRequest(TrialSignupRequest):
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class EntitlementItem(BaseModel):
    key: str
    limit: int | None
    used: int | None = None
    remaining: int | None = None
    scope: str


class SubscriptionSummary(BaseModel):
    mode: str
    status: str
    plan_code: str | None = None
    plan_name: str | None = None
    trial_started_at: datetime | None = None
    trial_ends_at: datetime | None = None
    days_remaining: int | None = None
    is_operational: bool = True
    calling_allowed: bool = True
    whatsapp_allowed: bool = True
    entitlements: dict[str, EntitlementItem] = Field(default_factory=dict)


class TrialSignupResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    force_password_change: bool = False
    organization_slug: str
    subscription: SubscriptionSummary


class AdminSubscriptionItem(BaseModel):
    id: str
    parent_organization_id: str
    organization_name: str
    organization_slug: str
    plan_code: str
    plan_name: str
    status: str
    source: str
    branch_count: int
    trial_started_at: datetime | None = None
    trial_ends_at: datetime | None = None
    days_remaining: int | None = None


class ManagedCustomerLimits(BaseModel):
    branches: int = Field(default=1, ge=1, le=10_000)
    queues_per_branch: int = Field(default=1, ge=1, le=10_000)
    staff_per_branch: int = Field(default=1, ge=1, le=100_000)
    sessions: int = Field(default=3, ge=1, le=10_000_000)
    tokens_per_session: int = Field(default=20, ge=1, le=10_000_000)


class AdminCustomerCreate(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=255)
    branch_name: str = Field(default="Main Branch", min_length=2, max_length=255)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=30)
    timezone: str = Field(default="Asia/Kolkata", max_length=50)
    account_type: Literal["trial", "active"] = "trial"
    trial_days: int = Field(default=14, ge=1, le=365)
    limits: ManagedCustomerLimits = Field(default_factory=ManagedCustomerLimits)


class ManagedCustomerListItem(BaseModel):
    parent_organization_id: str
    name: str
    slug: str
    contact_email: str | None = None
    is_active: bool
    commercial_status: str
    plan_code: str | None = None
    plan_name: str | None = None
    source: str
    branch_count: int
    user_count: int
    owner_email: str | None = None
    trial_ends_at: datetime | None = None
    days_remaining: int | None = None
    created_at: datetime


class ManagedCustomerPage(BaseModel):
    items: list[ManagedCustomerListItem]
    total: int
    status_counts: dict[str, int]


class ManagedBranchItem(BaseModel):
    id: str
    name: str
    slug: str
    is_active: bool
    queues: int
    staff: int


class AvailableBranchItem(BaseModel):
    id: str
    name: str
    slug: str
    is_active: bool
    admin_email: str | None = None


class AssignManagedBranches(BaseModel):
    branch_ids: list[str] = Field(..., min_length=1, max_length=100)


class ManagedUserItem(BaseModel):
    id: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    role: str
    branch_name: str | None = None
    is_active: bool


class ManagedAuditItem(BaseModel):
    id: str
    event_type: str
    created_at: datetime
    details: dict[str, Any] | None = None


class SalesRequestCreate(BaseModel):
    contact_phone: str | None = Field(default=None, max_length=30)
    message: str | None = Field(default=None, max_length=2000)


class ExpiredTrialSalesRequestCreate(SalesRequestCreate):
    email: EmailStr
    organization_slug: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)


class SalesRequestItem(BaseModel):
    id: str
    contact_name: str
    contact_email: str
    contact_phone: str | None = None
    message: str | None = None
    source: str
    status: str
    review_note: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None
    notification_status: str
    notification_attempted_at: datetime | None = None
    notification_error: str | None = None


class SalesRequestReview(BaseModel):
    action: Literal["approve", "contacted", "reject"]
    note: str = Field(..., min_length=3, max_length=1000)


class PublicCustomPlanRequest(BaseModel):
    contact_name: str = Field(..., min_length=1, max_length=120)
    contact_email: EmailStr
    contact_phone: str = Field(..., min_length=3, max_length=30)
    company_name: str = Field(..., min_length=1, max_length=255)
    business_category: str = Field(default="Healthcare & Clinics", max_length=100)
    branch_count: str = Field(default="1 – 3 Branches", max_length=100)
    queue_count: str = Field(default="1 – 3 Queues", max_length=100)
    staff_count: str = Field(default="1 – 5 Staff", max_length=100)
    visitor_volume: str = Field(default="200 – 1,000 / day", max_length=100)
    selected_services: list[str] = Field(default_factory=list)
    special_notes: str | None = Field(default=None, max_length=2000)


class AdminSalesRequestItem(SalesRequestItem):
    parent_organization_id: str | None = None
    organization_name: str
    organization_slug: str
    commercial_status: str


class AdminSalesRequestPage(BaseModel):
    items: list[AdminSalesRequestItem]
    total: int
    status_counts: dict[str, int]


class SalesRecipientCreate(BaseModel):
    email: EmailStr
    name: str | None = Field(default=None, max_length=100)


class SalesRecipientItem(BaseModel):
    id: str
    email: str
    name: str | None = None
    is_active: bool
    created_at: datetime


class ManagedCustomerDetail(BaseModel):
    parent_organization_id: str
    name: str
    slug: str
    contact_email: str | None = None
    contact_phone: str | None = None
    timezone: str
    is_active: bool
    created_at: datetime
    subscription: SubscriptionSummary
    source: str
    branches: list[ManagedBranchItem]
    users: list[ManagedUserItem]
    audit_events: list[ManagedAuditItem] = Field(default_factory=list)


class SubscriptionAdminUpdate(BaseModel):
    action: Literal["extend_trial", "activate", "suspend", "reactivate", "cancel", "archive", "restore"]
    extension_days: int | None = Field(default=None, ge=1, le=365)
    reason: str = Field(..., min_length=3, max_length=500)

    @field_validator("extension_days")
    @classmethod
    def extension_required(cls, value: int | None, info):
        if info.data.get("action") == "extend_trial" and value is None:
            raise ValueError("extension_days is required when extending a trial")
        return value


class SubscriptionLimitUpdate(BaseModel):
    limits: ManagedCustomerLimits
    reason: str = Field(..., min_length=3, max_length=500)


class ManagedCustomerUpdate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(default=None, max_length=30)
    timezone: str = Field(..., min_length=1, max_length=50)
    reason: str = Field(..., min_length=3, max_length=500)


class ManagedParentAdminCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    temporary_password: str = Field(..., min_length=8, max_length=128)
    reason: str = Field(..., min_length=3, max_length=500)


class PermanentCustomerDelete(BaseModel):
    confirmation_name: str = Field(..., min_length=2, max_length=255)
    confirmation_phrase: str
    reason: str = Field(..., min_length=3, max_length=500)

    @field_validator("confirmation_phrase")
    @classmethod
    def permanent_phrase_required(cls, value: str) -> str:
        if value != "DELETE PERMANENTLY":
            raise ValueError("Type DELETE PERMANENTLY to confirm")
        return value
