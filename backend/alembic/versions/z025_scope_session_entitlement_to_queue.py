"""scope session entitlement to queue

Revision ID: z025_scope_session_entitlement
Revises: z024_add_user_soft_delete
Create Date: 2026-09-27 22:50:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z025_scope_session_entitlement"
down_revision: Union[str, Sequence[str], None] = "z024_add_user_soft_delete"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update plan_entitlements for sessions.created.max to scope 'queue'
    op.execute(
        sa.text(
            "UPDATE plan_entitlements SET scope = 'queue' WHERE key = 'sessions.created.max'"
        )
    )
    # Update subscription_entitlement_overrides for sessions.created.max to scope 'queue'
    op.execute(
        sa.text(
            "UPDATE subscription_entitlement_overrides SET scope = 'queue' WHERE key = 'sessions.created.max'"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE plan_entitlements SET scope = 'subscription' WHERE key = 'sessions.created.max'"
        )
    )
    op.execute(
        sa.text(
            "UPDATE subscription_entitlement_overrides SET scope = 'subscription' WHERE key = 'sessions.created.max'"
        )
    )
