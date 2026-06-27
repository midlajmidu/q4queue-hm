"""merge all heads into single head

Revision ID: z001_merge_heads
Revises: wa_notify_skip_recall_remove, a1b2c3d4e5f6
Create Date: 2026-06-27 00:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "z001_merge_heads"
down_revision = ("wa_notify_skip_recall_remove", "a1b2c3d4e5f6")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
