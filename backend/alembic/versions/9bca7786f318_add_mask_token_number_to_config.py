"""add_mask_token_number_to_config

Revision ID: 9bca7786f318
Revises: 47e7ce2626b4
Create Date: 2026-08-21 22:17:36.397283

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9bca7786f318'
down_revision: Union[str, None] = '47e7ce2626b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('whatsapp_configs', sa.Column('mask_token_number', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('whatsapp_configs', 'mask_token_number')
