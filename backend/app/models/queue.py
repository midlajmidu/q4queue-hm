"""
app/models/queue.py
Queue model — one per service line within an organization, grouped by session.

Design decisions:
  - current_token_number is locked with SELECT FOR UPDATE during join/next
    to guarantee atomic increment with zero duplicates under concurrency.
  - prefix (e.g. "A", "B") lets orgs run labelled queues side-by-side.
  - Unique(name, org_id) — queue names are unique per organization.
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
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Queue(Base):
    __tablename__ = "queues"

    __table_args__ = (
        UniqueConstraint("name", "org_id", name="uq_queue_name_org"),
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

    token_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="SET NULL", use_alter=True, name="fk_queues_token_session_id"),
        nullable=True,
        default=None,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    prefix: Mapped[str] = mapped_column(String(10), nullable=False, default="A")
    announcement: Mapped[str] = mapped_column(String(500), nullable=True, default="")
    starting_sequence: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    custom_fields: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
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

    # ── Appointment Configuration ──────────────────────────────────
    appointment_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    slot_duration: Mapped[int] = mapped_column(Integer, default=15, server_default="15", nullable=False)
    slot_capacity: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    advance_booking_days: Mapped[int] = mapped_column(Integer, default=14, server_default="14", nullable=False)
    min_lead_time_mins: Mapped[int] = mapped_column(Integer, default=60, server_default="60", nullable=False)
    approval_mode: Mapped[str] = mapped_column(String(20), default="instant", server_default="instant", nullable=False)
    schedule_config: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    blackout_dates: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    checkin_window_before: Mapped[int] = mapped_column(Integer, default=30, server_default="30", nullable=False)
    checkin_window_after: Mapped[int] = mapped_column(Integer, default=15, server_default="15", nullable=False)
    auto_noshow_mins: Mapped[int] = mapped_column(Integer, default=30, server_default="30", nullable=False)
    industry_template: Mapped[str] = mapped_column(String(30), default="general", server_default="general", nullable=False)

    # ── Relationships ──────────────────────────────────────────────
    tokens: Mapped[list["Token"]] = relationship(  # noqa: F821
        "Token", back_populates="queue", lazy="noload"
    )
    sessions: Mapped[list["Session"]] = relationship(  # noqa: F821
        "Session", back_populates="queue", lazy="noload", foreign_keys="Session.queue_id"
    )
    appointments: Mapped[list["Appointment"]] = relationship(  # noqa: F821
        "Appointment", back_populates="queue", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Queue id={self.id} name={self.name!r} org={self.org_id}>"
