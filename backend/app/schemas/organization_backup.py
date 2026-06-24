from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class BackupResponse(BaseModel):
    id: uuid.UUID
    parent_organization_id: uuid.UUID
    status: str # pending, completed, failed
    file_size_bytes: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    download_url: Optional[str] = None

class BackupTriggerResponse(BaseModel):
    job_id: str
    status: str
    message: str
