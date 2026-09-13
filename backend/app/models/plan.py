"""Commercial plans and their database-backed entitlements."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Plan(Base):
    __tablename__ = "plans"
    __table_args__ = (
        UniqueConstraint("code"),
        Index("ix_plans_code", "code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    entitlements: Mapped[list["PlanEntitlement"]] = relationship(
        "PlanEntitlement", back_populates="plan", cascade="all, delete-orphan", lazy="selectin"
    )


class PlanEntitlement(Base):
    __tablename__ = "plan_entitlements"
    __table_args__ = (UniqueConstraint("plan_id", "key", name="uq_plan_entitlement_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    limit_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scope: Mapped[str] = mapped_column(String(30), nullable=False)
    reset_period: Mapped[str] = mapped_column(String(30), nullable=False, default="none", server_default="none")

    plan: Mapped[Plan] = relationship("Plan", back_populates="entitlements")
