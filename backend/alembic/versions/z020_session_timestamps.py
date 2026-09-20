"""Add session lifecycle timestamps: started_at, ended_at, scheduled_close_at.

These columns power the midnight-spanning auto-close engine:
  - started_at     — set when staff presses Start
  - ended_at       — set when staff presses End OR auto-close fires
  - scheduled_close_at — UTC time the background task will auto-close the session

Revision ID: z020_session_timestamps
Revises: wa_notify_skip_recall_remove
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z020_session_timestamps"
down_revision: Union[str, None] = "wa_notify_skip_recall_remove"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "sessions",
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "sessions",
        sa.Column("scheduled_close_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Index to speed up the background auto-close sweep
    op.create_index(
        "ix_sessions_autoclose",
        "sessions",
        ["is_active", "scheduled_close_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_sessions_autoclose", table_name="sessions")
    op.drop_column("sessions", "scheduled_close_at")
    op.drop_column("sessions", "ended_at")
    op.drop_column("sessions", "started_at")
