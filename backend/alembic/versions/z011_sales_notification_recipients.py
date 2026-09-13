"""Add Super Admin-managed sales email recipients.

Revision ID: z011_sales_recipients
Revises: z010_sales_requests
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "z011_sales_recipients"
down_revision = "z010_sales_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sales_notification_recipients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_sales_notification_recipients_email", "sales_notification_recipients", ["email"])


def downgrade() -> None:
    op.drop_index("ix_sales_notification_recipients_email", table_name="sales_notification_recipients")
    op.drop_table("sales_notification_recipients")
