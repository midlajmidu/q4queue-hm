"""replace group_size with companion_names

Revision ID: h637e5f5d084
Revises: def92b8b27cc
Create Date: 2026-06-19 15:25:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'h637e5f5d084'
down_revision = 'def92b8b27cc'
branch_labels = None
depends_on = None

def upgrade():
    # Add companion_names column
    op.add_column('tokens', sa.Column('companion_names', sa.JSON(), server_default='[]', nullable=False))
    # Drop group_size column
    op.drop_column('tokens', 'group_size')

def downgrade():
    # Re-add group_size column
    op.add_column('tokens', sa.Column('group_size', sa.Integer(), server_default='1', nullable=False))
    # Drop companion_names column
    op.drop_column('tokens', 'companion_names')
