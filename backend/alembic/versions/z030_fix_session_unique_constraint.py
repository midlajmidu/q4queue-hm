"""Fix session unique constraint: replace uq_session_org_date with uq_session_queue_date

Revision ID: z030_session_uq
Revises: z029_zone_fields
Create Date: 2026-10-08 20:55:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z030_session_uq"
down_revision: Union[str, Sequence[str], None] = "z029_zone_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # 1. Inspect existing constraints on sessions
    constraints = inspector.get_unique_constraints("sessions")
    constraint_names = {c["name"] for c in constraints}

    # 2. Drop old org-level constraint if present
    if "uq_session_org_date" in constraint_names:
        op.drop_constraint("uq_session_org_date", "sessions", type_="unique")

    # 3. Clean up legacy orphan sessions where queue_id is NULL (from pre-queue-first refactor)
    conn.execute(sa.text("DELETE FROM sessions WHERE queue_id IS NULL;"))

    # 4. Create queue-level unique constraint if not present
    if "uq_session_queue_date" not in constraint_names:
        op.create_unique_constraint(
            "uq_session_queue_date",
            "sessions",
            ["queue_id", "session_date"]
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    constraints = inspector.get_unique_constraints("sessions")
    constraint_names = {c["name"] for c in constraints}

    if "uq_session_queue_date" in constraint_names:
        op.drop_constraint("uq_session_queue_date", "sessions", type_="unique")

    if "uq_session_org_date" not in constraint_names:
        op.create_unique_constraint(
            "uq_session_org_date",
            "sessions",
            ["org_id", "session_date"]
        )
