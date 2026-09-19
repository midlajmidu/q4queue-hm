"""Add appointment_id to call_logs.

Revision ID: z022_add_appointment_id_to_call_logs
Revises: z021_add_appointments
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "z022_add_appointment_id_to_call_logs"
down_revision: Union[str, None] = "z021_add_appointments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "call_logs",
        sa.Column(
            "appointment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("appointments.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        op.f("ix_call_logs_appointment_id"),
        "call_logs",
        ["appointment_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_call_logs_appointment_id"), table_name="call_logs")
    op.drop_column("call_logs", "appointment_id")
