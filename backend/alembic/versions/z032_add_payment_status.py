"""add payment_status to tokens

Revision ID: z032_add_payment_status
Revises: z031_add_dine_3d_view_enabled
Create Date: 2026-10-19 20:50:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z032_add_payment_status"
down_revision: Union[str, Sequence[str], None] = "z031_add_dine_3d_view_enabled"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    token_cols = [c["name"] for c in inspector.get_columns("tokens")]
    if "payment_status" not in token_cols:
        op.add_column(
            "tokens",
            sa.Column(
                "payment_status",
                sa.String(20),
                server_default=sa.text("'pending'"),
                nullable=False,
            ),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    token_cols = [c["name"] for c in inspector.get_columns("tokens")]
    if "payment_status" in token_cols:
        op.drop_column("tokens", "payment_status")
