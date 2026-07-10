import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class CallLogBase(BaseModel):
    queue_id: Optional[uuid.UUID] = None
    session_id: Optional[uuid.UUID] = None
    token_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None
    customer_phone: str
    duration_seconds: int

class CallLogCreate(CallLogBase):
    organization_id: uuid.UUID

class CallLogRead(CallLogBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    called_by_id: Optional[uuid.UUID] = None
    created_at: datetime
    
    class Config:
        orm_mode = True
        from_attributes = True
