"""remove_branch_logo_url

Revision ID: 715b7f8bbb69
Revises: 56b87f8aaa68
Create Date: 2026-07-18 01:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '715b7f8bbb69'
down_revision = '56b87f8aaa68'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column('organizations', 'logo_url')


def downgrade():
    op.add_column('organizations', sa.Column('logo_url', sa.String(length=500), nullable=True))
