"""add deleted to tokenstatus enum

Revision ID: 413a3f767c6d
Revises: 51405f7d612f
Create Date: 2026-03-08 07:28:52.401106

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '413a3f767c6d'
down_revision: Union[str, None] = '51405f7d612f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Postgres doesn't allow ALTER TYPE ... ADD VALUE in a transaction block
    # but Alembic usually handles this. If it fails, we may need to use
    # op.get_bind().execution_options(isolation_level="AUTOCOMMIT")
    with op.get_context().autocommit_block():
        op.execute("""
DO $$
BEGIN
    ALTER TYPE tokenstatus ADD VALUE 'deleted';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
""")


def downgrade() -> None:
    # Enum values can't be easily removed in Postgres without dropping the whole type
    pass
