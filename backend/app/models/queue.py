"""
app/models/queue.py
Queue model — one per service line within an organization, grouped by session.

Design decisions:
  - current_token_number is locked with SELECT FOR UPDATE during join/next
    to guarantee atomic increment with zero duplicates under concurrency.
  - prefix (e.g. "A", "B") lets orgs run labelled queues side-by-side.
  - Unique(name, org_id, session_id) — same name allowed in different sessions.
  - session_id FK links to the sessions table for date-grouping.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Queue(Base):
    __tablename__ = "queues"

    __table_args__ = (
        UniqueConstraint("name", "org_id", "session_id", name="uq_queue_name_org_session"),
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
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    token_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, default=uuid.uuid4, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    prefix: Mapped[str] = mapped_column(String(10), nullable=False, default="A")
    announcement: Mapped[str] = mapped_column(String(500), nullable=True, default="")
    starting_sequence: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    current_token_number: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    total_served: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_paused: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    service_lines: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    open_time: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    close_time: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────
    tokens: Mapped[list["Token"]] = relationship(  # noqa: F821
        "Token", back_populates="queue", lazy="noload"
    )
    session: Mapped[Optional["Session"]] = relationship(  # noqa: F821
        "Session", back_populates="queues", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Queue id={self.id} name={self.name!r} org={self.org_id}>"
