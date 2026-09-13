"""Align existing organisation calling configuration fields with PostgreSQL.

Revision ID: z012_calling_rates
Revises: z011_sales_recipients
"""
import sqlalchemy as sa
from alembic import op

revision = "z012_calling_rates"
down_revision = "z011_sales_recipients"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("call_rate_per_minute", sa.Float(), nullable=True))
    op.add_column("organizations", sa.Column("calling_currency", sa.String(10), server_default="₹", nullable=False))


def downgrade() -> None:
    op.drop_column("organizations", "calling_currency")
    op.drop_column("organizations", "call_rate_per_minute")
