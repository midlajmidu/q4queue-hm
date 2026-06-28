"""
app/models/branch_backup.py
BranchBackup model representing isolated backups for specific Organizations (Branches).
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func, Integer, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.org_backup import BackupStatus


class BranchBackup(Base):
    __tablename__ = "branch_backups"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[BackupStatus] = mapped_column(
        SAEnum(BackupStatus, name="backupstatus", create_type=False),
        nullable=False,
        default=BackupStatus.pending,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    organization: Mapped["Organization"] = relationship(  # noqa: F821
        "Organization", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<BranchBackup id={self.id} filename={self.filename} status={self.status}>"
