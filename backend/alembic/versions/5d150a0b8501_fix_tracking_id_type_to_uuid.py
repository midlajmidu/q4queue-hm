"""fix tracking_id type to uuid

Revision ID: 5d150a0b8501
Revises: 9743f2adec57
Create Date: 2026-06-21 13:42:08.908031

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5d150a0b8501'
down_revision: Union[str, None] = '9743f2adec57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE tokens ALTER COLUMN tracking_id TYPE uuid USING tracking_id::uuid")


def downgrade() -> None:
    op.execute("ALTER TABLE tokens ALTER COLUMN tracking_id TYPE varchar USING tracking_id::varchar")
