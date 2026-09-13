"""Make parent_organization_id in sales_requests nullable to support public sales inquiries.

Revision ID: z018_public_sales_requests
Revises: z017_whatsapp_delivery_mode
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "z018_public_sales_requests"
down_revision = "z017_whatsapp_delivery_mode"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("sales_requests", "parent_organization_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)


def downgrade() -> None:
    op.alter_column("sales_requests", "parent_organization_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
