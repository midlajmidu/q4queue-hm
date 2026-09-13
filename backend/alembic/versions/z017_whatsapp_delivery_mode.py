"""Track the WhatsApp notification delivery mode in managed schema.

Revision ID: z017_whatsapp_delivery_mode
Revises: z016_queue_session_integrity
"""
from typing import Sequence, Union

from alembic import op


revision: str = "z017_whatsapp_delivery_mode"
down_revision: Union[str, None] = "z016_queue_session_integrity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Some existing installations received this field through an earlier
    # manual schema update. IF NOT EXISTS makes the migration safe for both
    # those databases and clean installations.
    op.execute(
        """
        ALTER TABLE whatsapp_configs
        ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(30)
        NOT NULL DEFAULT 'button_reply_only'
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE whatsapp_configs DROP COLUMN IF EXISTS delivery_mode")
