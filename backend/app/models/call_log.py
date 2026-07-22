import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base

class CallLog(Base):
    __tablename__ = "call_logs"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    queue_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("queues.id", ondelete="SET NULL"), nullable=True)
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    token_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("tokens.id", ondelete="SET NULL"), nullable=True)
    
    called_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    customer_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    customer_phone: Mapped[str] = mapped_column(String, nullable=False)
    
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    called_by = relationship("User", foreign_keys=[called_by_id], lazy="joined")
    queue = relationship("Queue", foreign_keys=[queue_id], lazy="joined")
