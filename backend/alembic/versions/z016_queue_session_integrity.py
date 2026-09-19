"""Enforce queue/session/token referential and numbering integrity.

Revision ID: z016_queue_session_integrity
Revises: z015_notification_receipts
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "z016_queue_session_integrity"
down_revision: Union[str, None] = "z015_notification_receipts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Allow nullable FIRST before setting invalid foreign keys to NULL
    op.alter_column("queues", "token_session_id", existing_type=sa.UUID(), nullable=True)

    # 2. Repair legacy pointers and the historical multiple-active-session state
    # before constraints are installed.
    op.execute(
        """
        UPDATE queues q
        SET token_session_id = NULL
        WHERE token_session_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.id = q.token_session_id)
        """
    )
    op.execute(
        """
        UPDATE sessions s
        SET is_active = EXISTS (
            SELECT 1 FROM queues q
            WHERE q.id = s.queue_id AND q.token_session_id = s.id
        ),
        is_paused = CASE WHEN EXISTS (
            SELECT 1 FROM queues q
            WHERE q.id = s.queue_id AND q.token_session_id = s.id
        ) THEN is_paused ELSE false END
        """
    )
    op.execute(
        """
        DELETE FROM tokens
        WHERE session_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.id = tokens.session_id)
        """
    )

    op.create_foreign_key(
        "fk_queues_token_session_id", "queues", "sessions",
        ["token_session_id"], ["id"], ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_tokens_session_id", "tokens", "sessions",
        ["session_id"], ["id"], ondelete="CASCADE",
    )
    op.drop_constraint("uq_token_queue_number", "tokens", type_="unique")
    op.create_unique_constraint(
        "uq_token_queue_session_number", "tokens",
        ["queue_id", "session_id", "token_number"],
    )
    op.create_index(
        "ix_tokens_queue_session_status_number", "tokens",
        ["queue_id", "session_id", "status", "token_number"],
    )


def downgrade() -> None:
    op.drop_index("ix_tokens_queue_session_status_number", table_name="tokens")
    op.drop_constraint("uq_token_queue_session_number", "tokens", type_="unique")
    op.create_unique_constraint("uq_token_queue_number", "tokens", ["queue_id", "token_number"])
    op.drop_constraint("fk_tokens_session_id", "tokens", type_="foreignkey")
    op.drop_constraint("fk_queues_token_session_id", "queues", type_="foreignkey")
    op.alter_column("queues", "token_session_id", existing_type=sa.UUID(), nullable=False)
