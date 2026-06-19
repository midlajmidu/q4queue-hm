"""
app/whatsapp/models.py
SQLAlchemy models for WhatsApp Cloud API integration.

Tables:
  - whatsapp_configs      Global Meta credentials + per-org enable/disable
  - whatsapp_templates    Editable message templates
  - whatsapp_messages     Full outbound message log with delivery tracking
  - whatsapp_webhook_logs Raw Meta webhook payloads
  - whatsapp_usage_stats  Pre-aggregated daily analytics per org
"""
import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text,
    UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


# ── Enums ─────────────────────────────────────────────────────────────────────

class WhatsAppConfigStatus(str, enum.Enum):
    connected = "connected"
    disconnected = "disconnected"
    error = "error"


class WhatsAppDeliveryStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    delivered = "delivered"
    read = "read"
    failed = "failed"


class WhatsAppTemplateStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    pending = "pending"
    rejected = "rejected"


# ── Models ────────────────────────────────────────────────────────────────────

class WhatsAppConfig(Base):
    """
    Global Meta credentials (org_id IS NULL) + per-org enable/disable rows.
    The single global row (org_id IS NULL) stores Meta API credentials.
    Per-org rows (org_id IS NOT NULL) store only is_enabled flag.
    """
    __tablename__ = "whatsapp_configs"

    __table_args__ = (
        # At most one config row per org (NULL counts as one unique value in PG)
        UniqueConstraint("org_id", name="uq_whatsapp_config_org"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # NULL = global config; UUID = per-org config
    org_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    # ── Meta API Credentials (global row only) ─────────────────────
    business_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone_number_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    waba_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    app_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    app_secret: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    webhook_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    webhook_verify_token: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # ── Status ─────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(20), default=WhatsAppConfigStatus.disconnected, nullable=False
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # ── Notification Toggles (per-org) ─────────────────────────────
    notify_queue_joined: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_position_5: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_position_3: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_called: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_completed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    payment_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    business_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    webhook_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Timestamps ─────────────────────────────────────────────────
    connected_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<WhatsAppConfig org={self.org_id} status={self.status}>"


class WhatsAppTemplate(Base):
    """Editable WhatsApp message templates. Managed by Super Admin."""
    __tablename__ = "whatsapp_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    template_name: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )
    # Meta template category: UTILITY, MARKETING, AUTHENTICATION
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="UTILITY")
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    # Human-readable description
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # The body text with {{1}}, {{2}} variable placeholders
    body_text: Mapped[str] = mapped_column(Text, nullable=False)
    # Variable descriptions for the UI
    variables: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Meta approval status
    status: Mapped[str] = mapped_column(
        String(20), default=WhatsAppTemplateStatus.draft, nullable=False
    )
    # Which event triggers this template
    event_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)

    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<WhatsAppTemplate {self.template_name!r} status={self.status}>"


class WhatsAppMessage(Base):
    """
    Full log of every outbound WhatsApp message.
    Delivery status is updated by webhook events.
    """
    __tablename__ = "whatsapp_messages"

    __table_args__ = (
        Index("ix_whatsapp_msg_org_status_date", "organization_id", "status", "created_at"),
        Index("ix_whatsapp_msg_org_session", "organization_id", "session_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Context ────────────────────────────────────────────────────
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    queue_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    customer_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    token_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    # ── Destination ────────────────────────────────────────────────
    # Stored in E.164 format: +919539679027
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    # ── Message Content ────────────────────────────────────────────
    message_type: Mapped[str] = mapped_column(String(30), nullable=False, default="template")
    template_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Variables that were rendered into the template
    template_variables: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # The final rendered message body (for logs)
    rendered_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Which queue event triggered this message
    event_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)

    # ── Meta Response ──────────────────────────────────────────────
    # Meta's message ID (from their API response)
    meta_message_id: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True, unique=True, index=True
    )

    # ── Delivery Status ────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(20),
        default=WhatsAppDeliveryStatus.pending,
        nullable=False,
        index=True,
    )
    error_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Timestamps ─────────────────────────────────────────────────
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    failed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<WhatsAppMessage phone={self.customer_phone} "
            f"status={self.status} org={self.organization_id}>"
        )


class WhatsAppWebhookLog(Base):
    """Raw Meta webhook payloads stored for debugging and auditing."""
    __tablename__ = "whatsapp_webhook_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # The Meta-assigned message or status ID this relates to
    meta_message_id: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True, index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # Full raw payload
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # Parsed phone if available
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<WhatsAppWebhookLog event={self.event_type} id={self.meta_message_id}>"


class WhatsAppUsageStat(Base):
    """
    Pre-aggregated daily analytics per org.
    Populated by background job or on-demand aggregation.
    """
    __tablename__ = "whatsapp_usage_stats"

    __table_args__ = (
        UniqueConstraint("org_id", "stat_date", name="uq_whatsapp_usage_stat_org_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # NULL = platform-wide aggregate
    org_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    stat_date: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True  # YYYY-MM-DD
    )

    total_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_delivered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_read: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Cost in USD (0 until billing is activated)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<WhatsAppUsageStat org={self.org_id} date={self.stat_date}>"
