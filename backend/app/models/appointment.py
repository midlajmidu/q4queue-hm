"""
app/models/appointment.py
Appointment model — represents an advance reservation for a specific queue slot.

Lifecycle:
    pending_approval ──► confirmed ──► checked_in ──► serving ──► completed
    confirmed ──► cancelled
    confirmed ──► no_show
"""
import enum
import uuid
from datetime import date, time, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class AppointmentStatus(str, enum.Enum):
    pending_approval = "pending_approval"
    confirmed = "confirmed"
    checked_in = "checked_in"
    serving = "serving"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class Appointment(Base):
    __tablename__ = "appointments"

    __table_args__ = (
        Index("ix_appointments_queue_date_status", "queue_id", "appointment_date", "status"),
        Index("ix_appointments_org_date", "org_id", "appointment_date"),
        Index("ix_appointments_phone", "customer_phone"),
        Index("ix_appointments_booking_ref", "booking_reference", unique=True),
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
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    token_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tokens.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Human-friendly reference e.g. APT-4892
    booking_reference: Mapped[str] = mapped_column(
        String(20), nullable=False, unique=True, index=True
    )
    security_pin: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True
    )

    # Customer info
    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    customer_email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    pax_count: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)

    # Schedule
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    # Status
    status: Mapped[AppointmentStatus] = mapped_column(
        SAEnum(AppointmentStatus, name="appointmentstatus"),
        nullable=False,
        default=AppointmentStatus.confirmed,
        index=True,
    )

    # Custom Form Responses
    custom_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    field_schema: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    booked_by: Mapped[str] = mapped_column(String(30), default="customer_online", server_default="customer_online", nullable=False)

    # Arrival Check-in
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    checked_in_by: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # WhatsApp / SMS Reminders
    reminder_sent_24h: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    reminder_sent_2h: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    queue: Mapped["Queue"] = relationship(  # noqa: F821
        "Queue", back_populates="appointments", lazy="noload"
    )
    token: Mapped[Optional["Token"]] = relationship(  # noqa: F821
        "Token", lazy="noload", foreign_keys=[token_id]
    )

    def __repr__(self) -> str:
        return (
            f"<Appointment ref={self.booking_reference} queue={self.queue_id} "
            f"date={self.appointment_date} start={self.start_time} status={self.status}>"
        )
