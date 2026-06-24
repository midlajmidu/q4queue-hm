import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base_class import Base

class ExportJob(Base):
    __tablename__ = "export_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    parent_org_id = Column(UUID(as_uuid=True), ForeignKey("parent_organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    report_type = Column(String, nullable=False)
    filters = Column(JSONB, nullable=False, default=dict)
    format = Column(String, nullable=False) # CSV, EXCEL, PDF
    status = Column(String, nullable=False, default="pending") # pending, processing, completed, failed
    
    file_path = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)
