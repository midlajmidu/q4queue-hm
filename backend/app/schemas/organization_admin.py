from pydantic import BaseModel
from datetime import datetime
import uuid

class BranchStatItem(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    is_active: bool
    created_at: datetime

class OrgAdminDashboardResponse(BaseModel):
    organization_name: str
    branch_count: int
    active_branches: int
    inactive_branches: int
    admin_count: int
    staff_count: int
    branches: list[BranchStatItem]
    max_branches: int | None = None

class BranchCreateRequest(BaseModel):
    name: str
    slug: str
    address: str | None = None
    phone_number: str | None = None
    brand_color: str | None = None

class BranchUpdateRequest(BaseModel):
    name: str | None = None
    address: str | None = None
    phone_number: str | None = None
    brand_color: str | None = None

class BranchStatusUpdate(BaseModel):
    is_active: bool

class BranchAdminCreateRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

class BranchAdminResetPasswordRequest(BaseModel):
    new_password: str

class BranchAdminResponse(BaseModel):
    id: uuid.UUID
    first_name: str | None = None
    last_name: str | None = None
    email: str
    created_at: datetime
    is_active: bool

class BranchDetailResponse(BranchStatItem):
    address: str | None
    phone_number: str | None
    brand_color: str | None
    logo_url: str | None
    admin_count: int
    staff_count: int
    queue_count: int
    session_count: int
    admins: list[BranchAdminResponse]
