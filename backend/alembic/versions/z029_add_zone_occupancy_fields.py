"""Add zone occupancy fields to queues

Revision ID: z029_zone_fields
Revises: z028_audit_indexes
Create Date: 2026-10-08 19:37:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z029_zone_fields"
down_revision: Union[str, Sequence[str], None] = "z028_audit_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {col["name"] for col in inspector.get_columns("queues")}

    if "queue_type" not in existing_cols:
        op.add_column(
            "queues",
            sa.Column("queue_type", sa.String(length=20), server_default="normal", nullable=False),
        )

    if "max_capacity" not in existing_cols:
        op.add_column(
            "queues",
            sa.Column("max_capacity", sa.Integer(), server_default="0", nullable=False),
        )

    if "zone_duration_mins" not in existing_cols:
        op.add_column(
            "queues",
            sa.Column("zone_duration_mins", sa.Integer(), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {col["name"] for col in inspector.get_columns("queues")}

    if "zone_duration_mins" in existing_cols:
        op.drop_column("queues", "zone_duration_mins")
    if "max_capacity" in existing_cols:
        op.drop_column("queues", "max_capacity")
    if "queue_type" in existing_cols:
        op.drop_column("queues", "queue_type")
