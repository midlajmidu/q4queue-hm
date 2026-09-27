"""add user soft delete columns is_deleted and deleted_at

Revision ID: z024_add_user_soft_delete
Revises: z023_merge_heads
Create Date: 2026-09-27 18:45:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z024_add_user_soft_delete"
down_revision: Union[str, Sequence[str], None] = "z023_merge_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "deleted_at")
    op.drop_column("users", "is_deleted")
