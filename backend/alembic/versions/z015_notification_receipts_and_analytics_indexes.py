"""Add per-user notification receipts and analytics query indexes.

Revision ID: z015_notification_receipts
Revises: z014_sales_integrity
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "z015_notification_receipts"
down_revision: Union[str, None] = "z014_sales_integrity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "message_receipts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("message_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cleared_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "user_id", name="uq_message_receipt_user"),
    )
    op.create_index("ix_message_receipts_message_id", "message_receipts", ["message_id"])
    op.create_index("ix_message_receipts_user_id", "message_receipts", ["user_id"])
    op.create_index("ix_messages_org_created_at", "messages", ["org_id", sa.text("created_at DESC")])
    op.create_index("ix_tokens_org_created_at", "tokens", ["org_id", sa.text("created_at DESC")])
    op.create_index("ix_tokens_org_status_created_at", "tokens", ["org_id", "status", sa.text("created_at DESC")])
    op.create_index("ix_tokens_org_queue_created_at", "tokens", ["org_id", "queue_id", sa.text("created_at DESC")])


def downgrade() -> None:
    op.drop_index("ix_tokens_org_queue_created_at", table_name="tokens")
    op.drop_index("ix_tokens_org_status_created_at", table_name="tokens")
    op.drop_index("ix_tokens_org_created_at", table_name="tokens")
    op.drop_index("ix_messages_org_created_at", table_name="messages")
    op.drop_index("ix_message_receipts_user_id", table_name="message_receipts")
    op.drop_index("ix_message_receipts_message_id", table_name="message_receipts")
    op.drop_table("message_receipts")
