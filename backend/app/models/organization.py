"""
app/models/organization.py
Organization (tenant) model.

Design:
  - slug is globally unique → used in login URLs and QR codes
  - is_active lets us deactivate a whole tenant without deleting data
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Organization(Base):
    __tablename__ = "organizations"

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
        index=True,           # fast lookup by slug on every login
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    # ── Clinic Information ─────────────────────────────────────────
    address: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # ── Limits ─────────────────────────────────────────────────────
    max_sessions: Mapped[int] = mapped_column(default=10, nullable=False)
    max_queues_per_session: Mapped[int] = mapped_column(default=20, nullable=False)
    max_tokens: Mapped[int] = mapped_column(default=5000, nullable=False)
    max_staff: Mapped[int] = mapped_column(default=5, nullable=False)
    max_waiting_capacity: Mapped[int] = mapped_column(default=50, server_default='50', nullable=False)

    # ── Templates ──────────────────────────────────────────────────
    queue_templates: Mapped[list[dict]] = mapped_column(JSON, server_default='[]', nullable=False)

    # ── Branding ───────────────────────────────────────────────────
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    brand_color: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Automation ──────────────────────────────────────────────────
    auto_session_enabled: Mapped[bool] = mapped_column(Boolean, server_default='false', nullable=False)
    auto_session_time: Mapped[str | None] = mapped_column(String(5), nullable=True) # HH:MM format

    # ── Relationships ──────────────────────────────────────────────
    parent_organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("parent_organizations.id"),
        nullable=True,
    )

    parent_organization: Mapped["ParentOrganization | None"] = relationship(  # noqa: F821
        "ParentOrganization", back_populates="organizations", lazy="noload"
    )

    users: Mapped[list["User"]] = relationship(  # noqa: F821
        "User", back_populates="organization", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Organization id={self.id} slug={self.slug!r}>"
