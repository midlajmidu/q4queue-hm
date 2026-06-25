from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime
import uuid

class OrganizationAnnouncementBase(BaseModel):
    title: str = Field(..., max_length=255)
    message: str = Field(..., max_length=1000)
    type: str = Field(default="info", max_length=50) # info, warning, critical
    target_branches: Optional[List[uuid.UUID]] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_active: bool = True

class OrganizationAnnouncementCreate(OrganizationAnnouncementBase):
    pass

class OrganizationAnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    message: Optional[str] = Field(None, max_length=1000)
    type: Optional[str] = Field(None, max_length=50)
    target_branches: Optional[List[uuid.UUID]] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_active: Optional[bool] = None

class OrganizationAnnouncementResponse(OrganizationAnnouncementBase):
    id: uuid.UUID
    parent_organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
