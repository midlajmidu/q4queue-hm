"""add_whatsapp_enabled_to_orgs

Revision ID: 47e7ce2626b4
Revises: e7200a663ac8
Create Date: 2026-08-21 21:54:47.273700

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '47e7ce2626b4'
down_revision: Union[str, None] = 'e7200a663ac8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('is_whatsapp_enabled', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('parent_organizations', sa.Column('is_whatsapp_enabled', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    op.drop_column('parent_organizations', 'is_whatsapp_enabled')
    op.drop_column('organizations', 'is_whatsapp_enabled')
