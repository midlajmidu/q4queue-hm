"""add branch_type to organizations and table_config to queues

Revision ID: z020_branch_type_table_config
Revises: z019_history_perf_indexes
Create Date: 2026-09-16 17:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'z020_branch_type_table_config'
down_revision = 'z004_add_field_schema'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column(
        'organizations',
        sa.Column('branch_type', sa.String(length=50), server_default='standard', nullable=False)
    )
    op.add_column(
        'queues',
        sa.Column('table_config', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True)
    )

def downgrade() -> None:
    op.drop_column('queues', 'table_config')
    op.drop_column('organizations', 'branch_type')
