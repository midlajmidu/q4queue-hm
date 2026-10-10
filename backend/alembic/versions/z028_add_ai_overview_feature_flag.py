"""add ai_overview_enabled to organizations

Revision ID: z028_add_ai_overview_flag
Revises: z030_session_uq, z029_clean_skipped_tokens
Create Date: 2026-10-10 22:50:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z028_add_ai_overview_flag"
down_revision: Union[str, Sequence[str], None] = ("z030_session_uq", "z029_clean_skipped_tokens")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    org_cols = [c["name"] for c in inspector.get_columns("organizations")]
    if "ai_overview_enabled" not in org_cols:
        op.add_column(
            "organizations",
            sa.Column(
                "ai_overview_enabled",
                sa.Boolean(),
                server_default=sa.text("false"),
                nullable=False,
            ),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    org_cols = [c["name"] for c in inspector.get_columns("organizations")]
    if "ai_overview_enabled" in org_cols:
        op.drop_column("organizations", "ai_overview_enabled")
