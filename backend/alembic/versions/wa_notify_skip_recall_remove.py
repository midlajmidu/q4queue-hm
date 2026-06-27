"""Add notify_skipped, notify_recalled, notify_removed to whatsapp_configs

Revision ID: wa_notify_skip_recall_remove
Revises: h001_add_whatsapp_tables
Create Date: 2026-06-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers — depends only on the WhatsApp tables migration
revision = 'wa_notify_skip_recall_remove'
down_revision = 'h001_add_whatsapp_tables'
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    """Return True if the column already exists (safe to re-run)."""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :tbl AND column_name = :col"
    ), {"tbl": table, "col": column})
    return result.fetchone() is not None


def upgrade() -> None:
    for col in ['notify_skipped', 'notify_recalled', 'notify_removed']:
        if not _column_exists('whatsapp_configs', col):
            op.add_column(
                'whatsapp_configs',
                sa.Column(col, sa.Boolean(), server_default=sa.text('true'), nullable=False)
            )


def downgrade() -> None:
    for col in ['notify_removed', 'notify_recalled', 'notify_skipped']:
        if _column_exists('whatsapp_configs', col):
            op.drop_column('whatsapp_configs', col)
