"""add system_settings table

Revision ID: z026_add_system_settings_table
Revises: z025_scope_session_entitlement_to_queue
Create Date: 2026-09-28 01:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z026_add_system_settings_table"
down_revision: Union[str, Sequence[str], None] = "z025_scope_session_entitlement"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "system_settings" not in tables:
        op.create_table(
            "system_settings",
            sa.Column("key", sa.String(100), primary_key=True, index=True),
            sa.Column("value", sa.String(255), nullable=False),
            sa.Column("description", sa.String(500), nullable=True),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "system_settings" in tables:
        op.drop_table("system_settings")
