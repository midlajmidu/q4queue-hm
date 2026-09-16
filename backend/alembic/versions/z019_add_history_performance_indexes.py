"""Add composite indexes for history and analytics workload performance.

Revision ID: z019_history_perf_indexes
Revises: z018_public_sales_requests
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z019_history_perf_indexes"
down_revision: Union[str, None] = "z018_public_sales_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_tokens_org_created_at ON tokens (org_id, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tokens_org_queue_created_at ON tokens (org_id, queue_id, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tokens_session_created_at ON tokens (session_id, created_at DESC)")


def downgrade() -> None:
    op.drop_index("ix_tokens_session_created_at", table_name="tokens")
    op.drop_index("ix_tokens_org_queue_created_at", table_name="tokens")
    op.drop_index("ix_tokens_org_created_at", table_name="tokens")
