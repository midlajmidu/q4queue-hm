from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class ParentOrganizationBase(BaseModel):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=100)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(None, max_length=30)
    is_active: bool = True
    address: Optional[str] = Field(None, max_length=1000)
    logo_url: Optional[str] = Field(None, max_length=500)
    timezone: str = "UTC"
    backup_time: str = Field("03:00", max_length=5)
    max_branches: Optional[int] = Field(None, ge=1)
    default_queue_settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    default_session_settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    whatsapp_preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)
    enable_shared_tokens: bool = False
    is_whatsapp_enabled: bool = True

class ParentOrganizationCreate(ParentOrganizationBase):
    pass

class ParentOrganizationUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    slug: str | None = Field(None, max_length=100)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(None, max_length=30)
    is_active: bool | None = None
    address: Optional[str] = Field(None, max_length=1000)
    logo_url: Optional[str] = Field(None, max_length=500)
    timezone: str | None = None
    backup_time: str | None = Field(None, max_length=5)
    max_branches: Optional[int] = Field(None, ge=1)
    default_queue_settings: Optional[Dict[str, Any]] = None
    default_session_settings: Optional[Dict[str, Any]] = None
    whatsapp_preferences: Optional[Dict[str, Any]] = None
    enable_shared_tokens: bool | None = None
    is_whatsapp_enabled: bool | None = None

class ParentOrganizationResponse(ParentOrganizationBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    branch_count: int = 0
    admin_count: int = 0
    enable_shared_tokens: bool = False
    is_whatsapp_enabled: bool = True

    
    model_config = ConfigDict(from_attributes=True)

class ParentOrganizationPage(BaseModel):
    items: list[ParentOrganizationResponse]
    total: int

class AssignBranchesRequest(BaseModel):
    branch_ids: list[uuid.UUID]

class OrgAdminCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
