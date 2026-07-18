"""Remove brand color

Revision ID: 56b87f8aaa68
Revises: z002_add_max_branches
Create Date: 2026-07-17 18:55:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '56b87f8aaa68'
down_revision = '3647b14744a4'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Drop brand_color from organizations
    op.drop_column('organizations', 'brand_color')
    # Drop brand_color from parent_organizations
    op.drop_column('parent_organizations', 'brand_color')

def downgrade() -> None:
    # Add brand_color back
    op.add_column('organizations', sa.Column('brand_color', sa.String(length=20), nullable=True))
    op.add_column('parent_organizations', sa.Column('brand_color', sa.String(length=20), nullable=True))
