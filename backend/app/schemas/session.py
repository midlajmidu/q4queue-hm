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


class SessionResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    session_date: date
    title: Optional[str] = None
    created_at: datetime
    queue_count: int = 0
    queue_names: list[str] = []
    total_served: int = 0
    total_issued: int = 0

    model_config = {"from_attributes": True}


class PaginatedSessionResponse(BaseModel):
    items: list[SessionResponse]
    total: int
    limit: int
    offset: int
