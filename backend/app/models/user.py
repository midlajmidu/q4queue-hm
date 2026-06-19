"""
app/models/user.py
User model tied to a single Organization.

CRITICAL tenant-isolation rules:
  - email is unique PER org, NOT globally
  - org_id must be indexed (all queries filter by it)
  - password_hash is NEVER returned in responses
  - role field is extensible (admin / staff / display)
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        # email is unique only within an organization
        UniqueConstraint("email", "org_id", name="uq_user_email_org"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,           # mandatory: ALL queries filter by org_id (unless super_admin)
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # DEPRECATED: Stored plain-text passwords (security risk). No longer populated.
    initial_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Role: admin | staff | display — no hardcoded checks here
    role: Mapped[str] = mapped_column(String(50), default="admin", nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────
    organization: Mapped["Organization"] = relationship(  # noqa: F821
        "Organization", back_populates="users", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} org={self.org_id}>"
