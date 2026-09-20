"""Add appointments table and queue booking config.

Revision ID: z021_add_appointments
Revises: z020_session_timestamps
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "z021_add_appointments"
down_revision: Union[str, None] = "z020_session_timestamps"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add appointment configuration columns to queues
    op.add_column("queues", sa.Column("appointment_enabled", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("queues", sa.Column("slot_duration", sa.Integer(), server_default="15", nullable=False))
    op.add_column("queues", sa.Column("slot_capacity", sa.Integer(), server_default="1", nullable=False))
    op.add_column("queues", sa.Column("advance_booking_days", sa.Integer(), server_default="14", nullable=False))
    op.add_column("queues", sa.Column("min_lead_time_mins", sa.Integer(), server_default="60", nullable=False))
    op.add_column("queues", sa.Column("approval_mode", sa.String(length=20), server_default="instant", nullable=False))
    op.add_column("queues", sa.Column("schedule_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("queues", sa.Column("blackout_dates", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("queues", sa.Column("checkin_window_before", sa.Integer(), server_default="30", nullable=False))
    op.add_column("queues", sa.Column("checkin_window_after", sa.Integer(), server_default="15", nullable=False))
    op.add_column("queues", sa.Column("auto_noshow_mins", sa.Integer(), server_default="30", nullable=False))
    op.add_column("queues", sa.Column("industry_template", sa.String(length=30), server_default="general", nullable=False))

    # 2. Create appointments table
    appointment_status_enum = postgresql.ENUM(
        "pending_approval",
        "confirmed",
        "checked_in",
        "serving",
        "completed",
        "cancelled",
        "no_show",
        name="appointmentstatus",
        create_type=False,
    )
    bind = op.get_bind()
    appointment_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "appointments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("queue_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("queues.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("token_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tokens.id", ondelete="SET NULL"), nullable=True),
        sa.Column("booking_reference", sa.String(length=20), nullable=False, unique=True),
        sa.Column("security_pin", sa.String(length=10), nullable=True),
        sa.Column("customer_name", sa.String(length=120), nullable=False),
        sa.Column("customer_phone", sa.String(length=20), nullable=False),
        sa.Column("customer_email", sa.String(length=120), nullable=True),
        sa.Column("pax_count", sa.Integer(), server_default="1", nullable=False),
        sa.Column("appointment_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("status", appointment_status_enum, server_default="confirmed", nullable=False),
        sa.Column("custom_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("field_schema", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("booked_by", sa.String(length=30), server_default="customer_online", nullable=False),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("checked_in_by", sa.String(length=30), nullable=True),
        sa.Column("reminder_sent_24h", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("reminder_sent_2h", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 3. Create indexes
    op.create_index("ix_appointments_queue_date_status", "appointments", ["queue_id", "appointment_date", "status"])
    op.create_index("ix_appointments_org_date", "appointments", ["org_id", "appointment_date"])
    op.create_index("ix_appointments_phone", "appointments", ["customer_phone"])
    op.create_index("ix_appointments_booking_ref", "appointments", ["booking_reference"], unique=True)
    op.create_index("ix_appointments_token_id", "appointments", ["token_id"])


def downgrade() -> None:
    op.drop_index("ix_appointments_token_id", table_name="appointments")
    op.drop_index("ix_appointments_booking_ref", table_name="appointments")
    op.drop_index("ix_appointments_phone", table_name="appointments")
    op.drop_index("ix_appointments_org_date", table_name="appointments")
    op.drop_index("ix_appointments_queue_date_status", table_name="appointments")
    op.drop_table("appointments")

    bind = op.get_bind()
    sa.Enum(name="appointmentstatus").drop(bind, checkfirst=True)

    op.drop_column("queues", "industry_template")
    op.drop_column("queues", "auto_noshow_mins")
    op.drop_column("queues", "checkin_window_after")
    op.drop_column("queues", "checkin_window_before")
    op.drop_column("queues", "blackout_dates")
    op.drop_column("queues", "schedule_config")
    op.drop_column("queues", "approval_mode")
    op.drop_column("queues", "min_lead_time_mins")
    op.drop_column("queues", "advance_booking_days")
    op.drop_column("queues", "slot_capacity")
    op.drop_column("queues", "slot_duration")
    op.drop_column("queues", "appointment_enabled")
