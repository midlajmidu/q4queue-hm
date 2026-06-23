"""Add service_lines to queues and assigned_line to tokens

Revision ID: b1c2d3e4f5a6
Revises: a45fe17ec0a9
Create Date: 2026-06-23 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a45fe17ec0a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add service_lines to queues (0 = single counter, >0 = multi-lane)
    op.add_column('queues', sa.Column('service_lines', sa.Integer(), server_default='0', nullable=False))
    # Add assigned_line to tokens (which lane this token is serving at)
    op.add_column('tokens', sa.Column('assigned_line', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('tokens', 'assigned_line')
    op.drop_column('queues', 'service_lines')
