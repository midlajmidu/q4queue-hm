"""merge conflict

Revision ID: 163be5af6d94
Revises: 556925cb89ae, f5182235f719
Create Date: 2026-06-22 15:11:34.118855

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '163be5af6d94'
down_revision: Union[str, None] = ('556925cb89ae', 'f5182235f719')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
