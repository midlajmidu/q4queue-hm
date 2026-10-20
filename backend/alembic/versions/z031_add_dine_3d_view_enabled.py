"""add dine_3d_view_enabled to organizations

Revision ID: z031_add_dine_3d_view_enabled
Revises: z028_add_ai_overview_flag
Create Date: 2026-10-19 18:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z031_add_dine_3d_view_enabled"
down_revision: Union[str, Sequence[str], None] = "z028_add_ai_overview_flag"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    org_cols = [c["name"] for c in inspector.get_columns("organizations")]
    if "dine_3d_view_enabled" not in org_cols:
        op.add_column(
            "organizations",
            sa.Column(
                "dine_3d_view_enabled",
                sa.Boolean(),
                server_default=sa.text("true"),
                nullable=False,
            ),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    org_cols = [c["name"] for c in inspector.get_columns("organizations")]
    if "dine_3d_view_enabled" in org_cols:
        op.drop_column("organizations", "dine_3d_view_enabled")
