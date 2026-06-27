"""Add notify_skipped, notify_recalled, notify_removed to whatsapp_configs

Revision ID: wa_notify_skip_recall_remove
Revises: h001_add_whatsapp_tables
Create Date: 2026-06-27

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers — depends only on the WhatsApp tables migration
revision = 'wa_notify_skip_recall_remove'
down_revision = 'h001_add_whatsapp_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use ADD COLUMN IF NOT EXISTS (PostgreSQL 9.6+) — fully idempotent
    op.execute(
        "ALTER TABLE whatsapp_configs "
        "ADD COLUMN IF NOT EXISTS notify_skipped BOOLEAN NOT NULL DEFAULT TRUE"
    )
    op.execute(
        "ALTER TABLE whatsapp_configs "
        "ADD COLUMN IF NOT EXISTS notify_recalled BOOLEAN NOT NULL DEFAULT TRUE"
    )
    op.execute(
        "ALTER TABLE whatsapp_configs "
        "ADD COLUMN IF NOT EXISTS notify_removed BOOLEAN NOT NULL DEFAULT TRUE"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE whatsapp_configs DROP COLUMN IF EXISTS notify_removed")
    op.execute("ALTER TABLE whatsapp_configs DROP COLUMN IF EXISTS notify_recalled")
    op.execute("ALTER TABLE whatsapp_configs DROP COLUMN IF EXISTS notify_skipped")
