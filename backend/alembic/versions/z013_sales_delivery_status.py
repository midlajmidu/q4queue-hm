"""Track internal sales-request notification delivery.

Revision ID: z013_sales_delivery
Revises: z012_calling_rates
"""
import sqlalchemy as sa
from alembic import op

revision = "z013_sales_delivery"
down_revision = "z012_calling_rates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sales_requests",
        sa.Column("notification_status", sa.String(30), server_default="pending", nullable=False),
    )
    op.add_column(
        "sales_requests",
        sa.Column("notification_attempted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "sales_requests",
        sa.Column("notification_error", sa.String(255), nullable=True),
    )
    op.create_index("ix_sales_requests_notification_status", "sales_requests", ["notification_status"])


def downgrade() -> None:
    op.drop_index("ix_sales_requests_notification_status", table_name="sales_requests")
    op.drop_column("sales_requests", "notification_error")
    op.drop_column("sales_requests", "notification_attempted_at")
    op.drop_column("sales_requests", "notification_status")
