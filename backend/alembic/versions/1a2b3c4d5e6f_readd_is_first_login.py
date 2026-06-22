"""readd is_first_login

Revision ID: 1a2b3c4d5e6f
Revises: 163be5af6d94
Create Date: 2026-06-22 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a2b3c4d5e6f'
down_revision: Union[str, None] = '163be5af6d94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if column exists first to avoid errors if it was already added somehow
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='is_first_login'"))
    if not result.fetchone():
        op.add_column('users', sa.Column('is_first_login', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'is_first_login')
