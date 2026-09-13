"""
app/schemas/message.py
Pydantic schemas for messages (notifications).
"""
import uuid
from datetime import datetime
from typing import Literal, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, Field

class MessageBase(BaseModel):
    content: str
    message_type: str
    is_read: bool = False


class MessageCreate(MessageBase):
    org_id: uuid.UUID
    sender_id: Optional[uuid.UUID] = None
    receiver_id: Optional[uuid.UUID] = None


class MessageCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    message_type: Literal["info", "warning", "success", "error", "critical"]


class MessageResponse(MessageBase):
    id: uuid.UUID
    org_id: uuid.UUID
    sender_id: Optional[uuid.UUID] = None
    receiver_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageUpdateResponse(BaseModel):
    message: str
    updated_count: int
