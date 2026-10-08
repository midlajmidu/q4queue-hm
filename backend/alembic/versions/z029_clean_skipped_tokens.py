"""Clean historical skipped tokens having completed_at set

Revision ID: z029_clean_skipped_tokens
Revises: z028_audit_indexes
Create Date: 2026-10-07 23:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z029_clean_skipped_tokens"
down_revision: Union[str, Sequence[str], None] = "z028_audit_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fix any historical tokens where status is 'skipped' but completed_at was set
    op.execute(
        """
        UPDATE tokens
        SET
            skipped_at = COALESCE(skipped_at, completed_at, NOW()),
            completed_at = NULL,
            completed_by_id = NULL
        WHERE status = 'skipped' AND (completed_at IS NOT NULL OR skipped_at IS NULL);
        """
    )


def downgrade() -> None:
    pass
