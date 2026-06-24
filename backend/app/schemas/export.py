import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class ExportRequest(BaseModel):
    report_type: str
    format: str # CSV, EXCEL, PDF
    date_range: str
    custom_start_date: Optional[str] = None
    custom_end_date: Optional[str] = None
    branch_ids: Optional[List[uuid.UUID]] = None

class ExportJobResponse(BaseModel):
    id: uuid.UUID
    report_type: str
    format: str
    status: str
    file_path: Optional[str] = None
    error_message: Optional[str] = None
    filters: Dict[str, Any]
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
