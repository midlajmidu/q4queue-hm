"""Add system_settings table, call_status, ring_duration_seconds, and calling rate fields

Revision ID: z025_add_calling_fields
Revises: 9bca7786f318
Create Date: 2026-09-24 00:32:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'z025_add_calling_fields'
down_revision = '9bca7786f318'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Create system_settings table if it doesn't exist
    if 'system_settings' not in inspector.get_table_names():
        op.create_table(
            'system_settings',
            sa.Column('key', sa.String(100), primary_key=True),
            sa.Column('value', sa.String(255), nullable=False),
            sa.Column('description', sa.String(500), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_system_settings_key', 'system_settings', ['key'], unique=False)
        
        # Seed default global settings
        op.execute(
            "INSERT INTO system_settings (key, value, description) VALUES "
            "('global_call_rate_per_minute', '1.50', 'Global default voice call rate per minute in INR'), "
            "('calling_currency', '₹', 'Global default currency symbol for voice call billing') "
            "ON CONFLICT (key) DO NOTHING;"
        )

    # 2. Update call_logs
    call_log_cols = [col['name'] for col in inspector.get_columns('call_logs')]
    if 'call_status' not in call_log_cols:
        op.add_column('call_logs', sa.Column('call_status', sa.String(20), server_default='completed', nullable=False))
    if 'ring_duration_seconds' not in call_log_cols:
        op.add_column('call_logs', sa.Column('ring_duration_seconds', sa.Integer(), server_default='0', nullable=False))

    # 3. Update organizations
    org_cols = [col['name'] for col in inspector.get_columns('organizations')]
    if 'call_rate_per_minute' not in org_cols:
        op.add_column('organizations', sa.Column('call_rate_per_minute', sa.Float(), nullable=True))
    if 'calling_currency' not in org_cols:
        op.add_column('organizations', sa.Column('calling_currency', sa.String(10), server_default='₹', nullable=False))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    org_cols = [col['name'] for col in inspector.get_columns('organizations')]
    if 'calling_currency' in org_cols:
        op.drop_column('organizations', 'calling_currency')
    if 'call_rate_per_minute' in org_cols:
        op.drop_column('organizations', 'call_rate_per_minute')

    call_log_cols = [col['name'] for col in inspector.get_columns('call_logs')]
    if 'ring_duration_seconds' in call_log_cols:
        op.drop_column('call_logs', 'ring_duration_seconds')
    if 'call_status' in call_log_cols:
        op.drop_column('call_logs', 'call_status')

    if 'system_settings' in inspector.get_table_names():
        op.drop_table('system_settings')
