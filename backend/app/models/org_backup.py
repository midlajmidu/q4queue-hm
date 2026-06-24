"""
app/models/org_backup.py
OrgBackup model representing tenant-isolated backups for Parent Organizations.
"""
import uuid
from datetime import datetime
import enum

from sqlalchemy import DateTime, String, func, Integer, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class BackupStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"


class OrgBackup(Base):
    __tablename__ = "org_backups"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    parent_org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("parent_organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[BackupStatus] = mapped_column(
        SAEnum(BackupStatus, name="backupstatus"),
        nullable=False,
        default=BackupStatus.pending,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    parent_organization: Mapped["ParentOrganization"] = relationship(  # noqa: F821
        "ParentOrganization", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<OrgBackup id={self.id} filename={self.filename} status={self.status}>"
