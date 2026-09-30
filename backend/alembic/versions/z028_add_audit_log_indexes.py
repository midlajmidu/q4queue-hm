"""Add high-value created_at and tenant composite indexes to audit_logs

Revision ID: z028_audit_indexes
Revises: z027_appointment_flag
Create Date: 2026-10-01 01:45:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z028_audit_indexes"
down_revision: Union[str, Sequence[str], None] = "z027_appointment_flag"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_indexes = {idx["name"] for idx in inspector.get_indexes("audit_logs")}

    if "ix_audit_logs_created_at" not in existing_indexes:
        op.create_index(
            "ix_audit_logs_created_at",
            "audit_logs",
            ["created_at"],
            unique=False,
        )

    if "ix_audit_logs_parent_created" not in existing_indexes:
        op.create_index(
            "ix_audit_logs_parent_created",
            "audit_logs",
            ["parent_organization_id", "created_at"],
            unique=False,
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_indexes = {idx["name"] for idx in inspector.get_indexes("audit_logs")}

    if "ix_audit_logs_parent_created" in existing_indexes:
        op.drop_index("ix_audit_logs_parent_created", table_name="audit_logs")

    if "ix_audit_logs_created_at" in existing_indexes:
        op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
