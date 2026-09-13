"""add field_schema snapshot to tokens

Revision ID: z004_add_field_schema
Revises: z003_add_custom_fields
Create Date: 2026-09-13 23:49:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'z004_add_field_schema'
down_revision = 'z003_add_custom_fields'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('tokens', sa.Column('field_schema', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

def downgrade() -> None:
    op.drop_column('tokens', 'field_schema')
