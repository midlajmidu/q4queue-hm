"""Add notify_skipped, notify_recalled, notify_removed to whatsapp_configs

Revision ID: wa_notify_skip_recall_remove
Revises: 
Create Date: 2026-06-27

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'wa_notify_skip_recall_remove'
down_revision = ('h001_add_whatsapp_tables', 'a1b2c3d4e5f6')
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'whatsapp_configs',
        sa.Column('notify_skipped', sa.Boolean(), server_default=sa.text('true'), nullable=False)
    )
    op.add_column(
        'whatsapp_configs',
        sa.Column('notify_recalled', sa.Boolean(), server_default=sa.text('true'), nullable=False)
    )
    op.add_column(
        'whatsapp_configs',
        sa.Column('notify_removed', sa.Boolean(), server_default=sa.text('true'), nullable=False)
    )


def downgrade() -> None:
    op.drop_column('whatsapp_configs', 'notify_removed')
    op.drop_column('whatsapp_configs', 'notify_recalled')
    op.drop_column('whatsapp_configs', 'notify_skipped')
