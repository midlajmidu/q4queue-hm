"""
app/models/parent_organization.py
Parent Organization model representing the top-level entity above branches.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class ParentOrganization(Base):
    __tablename__ = "parent_organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )
    contact_email: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
    )
    contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Settings ───────────────────────────────────────────────────
    address: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", server_default="UTC", nullable=False)
    backup_time: Mapped[str] = mapped_column(String(5), default="03:00", server_default="03:00", nullable=False)
    max_branches: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    
    # ── Defaults for New Branches ──────────────────────────────────
    default_queue_settings: Mapped[dict | None] = mapped_column(JSON, server_default='{}', nullable=True)
    default_session_settings: Mapped[dict | None] = mapped_column(JSON, server_default='{}', nullable=True)
    whatsapp_preferences: Mapped[dict | None] = mapped_column(JSON, server_default='{}', nullable=True)
    enable_shared_tokens: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false', nullable=False)
    is_whatsapp_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default='true', nullable=False)


    # ── Relationships ──────────────────────────────────────────────
    organizations: Mapped[list["Organization"]] = relationship(  # noqa: F821
        "Organization", back_populates="parent_organization", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<ParentOrganization id={self.id} slug={self.slug!r}>"
