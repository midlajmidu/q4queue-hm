"""
app/models/session.py
Session (date-based) model — groups queues by date within an org.

Design decisions:
  - Unique(queue_id, session_date).
  - Optional title for human-readable labelling (e.g., "YYYY-MM-DD").
  - Cascades: deleting a session deletes all its tokens.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from app.db.base_class import Base


class Session(Base):
    __tablename__ = "sessions"

    __table_args__ = (
        UniqueConstraint("queue_id", "session_date", name="uq_session_queue_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    queue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("queues.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────
    queue: Mapped["Queue"] = relationship(  # noqa: F821
        "Queue", back_populates="sessions", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Session id={self.id} date={self.session_date} org={self.org_id}>"
