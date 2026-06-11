"""
app/schemas/message.py
Pydantic schemas for messages (notifications).
"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class MessageBase(BaseModel):
    content: str
    message_type: str
    is_read: bool = False


class MessageCreate(MessageBase):
    org_id: uuid.UUID
    sender_id: uuid.UUID
    receiver_id: Optional[uuid.UUID] = None


class MessageCreateRequest(BaseModel):
    content: str
    message_type: str


class MessageResponse(MessageBase):
    id: uuid.UUID
    org_id: uuid.UUID
    sender_id: uuid.UUID
    receiver_id: Optional[uuid.UUID]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageUpdateResponse(BaseModel):
    message: str
    updated_count: int
