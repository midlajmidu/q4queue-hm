"""Add is_active and is_paused to sessions

Revision ID: z007_session_flags
Revises: z006_default_token_fields
Create Date: 2026-08-30 16:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'z007_session_flags'
down_revision = 'z006_default_token_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('sessions')]
    
    if 'is_active' not in existing_columns:
        op.add_column('sessions', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))
    if 'is_paused' not in existing_columns:
        op.add_column('sessions', sa.Column('is_paused', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('sessions', 'is_paused')
    op.drop_column('sessions', 'is_active')
