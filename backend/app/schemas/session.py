"""
app/schemas/session.py
Pydantic schemas for Session request/response.
"""
import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    session_date: date
    title: Optional[str] = Field(None, max_length=200)


class SessionUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    is_active: Optional[bool] = None
    is_paused: Optional[bool] = None


class SessionResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    queue_id: uuid.UUID
    session_date: date
    title: Optional[str] = None
    is_active: bool = True
    is_paused: bool = False
    created_at: datetime
    total_served: int = 0
    total_issued: int = 0

    model_config = {"from_attributes": True}


class PaginatedSessionResponse(BaseModel):
    items: list[SessionResponse]
    total: int
    limit: int
    offset: int
