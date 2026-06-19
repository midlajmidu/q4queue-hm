"""
app/models/token.py
Token model — represents one customer's place in a queue.

Status lifecycle:
    waiting ──► serving ──► done
    waiting ──► skipped

Concurrency safety:
    Unique(queue_id, token_number) enforced at DB level.
    Additional row-level lock on the queue row prevents duplicates.
"""
import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class TokenStatus(str, enum.Enum):
    waiting = "waiting"
    serving = "serving"
    done = "done"
    skipped = "skipped"
    deleted = "deleted"


class Token(Base):
    __tablename__ = "tokens"

    __table_args__ = (
        UniqueConstraint("queue_id", "token_number", name="uq_token_queue_number"),
        # Composite index: fetch waiting tokens for a queue in order
        Index("ix_tokens_queue_status", "queue_id", "status"),
        # Composite index: position calculation (count ahead)
        Index("ix_tokens_queue_number", "queue_id", "token_number"),
        # Composite index: duplicate-prevention lookup by phone within a queue
        Index("ix_tokens_queue_phone_status", "queue_id", "customer_phone", "status"),
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
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    token_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[TokenStatus] = mapped_column(
        SAEnum(TokenStatus, name="tokenstatus"),
        nullable=False,
        default=TokenStatus.waiting,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    served_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    served_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # ── Customer Info ─────────────────────────────────────────────
    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False)

    # ── WhatsApp / Tracking ────────────────────────────────────
    # Separate UUID used in public tracking URLs — keeps internal ID private
    tracking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        default=uuid.uuid4,
        unique=True,
        index=True,
    )
    # Set True once a "position ≤ 3" reminder has been sent to avoid duplicates
    whatsapp_reminder_sent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # ── Relationships ──────────────────────────────────────────────
    queue: Mapped["Queue"] = relationship(  # noqa: F821
        "Queue", back_populates="tokens", lazy="noload"
    )

    def __repr__(self) -> str:
        return (
            f"<Token #{self.token_number} queue={self.queue_id} "
            f"status={self.status} org={self.org_id}>"
        )
