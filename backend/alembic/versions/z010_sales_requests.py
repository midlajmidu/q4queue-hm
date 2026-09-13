"""Add durable customer sales and trial-conversion requests.

Revision ID: z010_sales_requests
Revises: z009_customer_lifecycle
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "z010_sales_requests"
down_revision = "z009_customer_lifecycle"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sales_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("contact_name", sa.String(120), nullable=False),
        sa.Column("contact_email", sa.String(255), nullable=False),
        sa.Column("contact_phone", sa.String(30), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("source", sa.String(30), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("reviewed_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parent_organization_id"], ["parent_organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sales_requests_parent_organization_id", "sales_requests", ["parent_organization_id"])
    op.create_index("ix_sales_requests_requested_by_user_id", "sales_requests", ["requested_by_user_id"])
    op.create_index("ix_sales_requests_status", "sales_requests", ["status"])


def downgrade() -> None:
    op.drop_index("ix_sales_requests_status", table_name="sales_requests")
    op.drop_index("ix_sales_requests_requested_by_user_id", table_name="sales_requests")
    op.drop_index("ix_sales_requests_parent_organization_id", table_name="sales_requests")
    op.drop_table("sales_requests")
