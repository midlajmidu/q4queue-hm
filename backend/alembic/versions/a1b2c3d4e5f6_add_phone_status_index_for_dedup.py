"""add phone status index for dedup

Revision ID: a1b2c3d4e5f6
Revises: ee1e7289f226
Create Date: 2026-04-09 10:05:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "ee1e7289f226"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_tokens_queue_phone_status",
        "tokens",
        ["queue_id", "customer_phone", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_tokens_queue_phone_status", table_name="tokens")
