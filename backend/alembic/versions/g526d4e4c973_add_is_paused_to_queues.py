"""Add is_paused to queues

Revision ID: g526d4e4c973
Revises: f415c3f3b862
Create Date: 2026-06-16 18:25:48.117668

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'g526d4e4c973'
down_revision: Union[str, None] = '4e899b8ae435'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('queues', sa.Column('is_paused', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('queues', 'is_paused')
