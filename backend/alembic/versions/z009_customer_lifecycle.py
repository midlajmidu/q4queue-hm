"""Add managed-customer entitlement overrides and a manual custom plan.

Revision ID: z009_customer_lifecycle
Revises: z008_trials
"""
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "z009_customer_lifecycle"
down_revision = "z008_trials"
branch_labels = None
depends_on = None

CUSTOM_PLAN_ID = uuid.UUID("00000000-0000-4000-8000-000000000015")


def upgrade() -> None:
    op.create_table(
        "subscription_entitlement_overrides",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("limit_value", sa.Integer(), nullable=True),
        sa.Column("scope", sa.String(30), nullable=False),
        sa.Column("reset_period", sa.String(30), server_default="none", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("subscription_id", "key", name="uq_subscription_entitlement_override_key"),
    )
    op.create_index(
        "ix_subscription_entitlement_overrides_subscription_id",
        "subscription_entitlement_overrides",
        ["subscription_id"],
    )
    plans = sa.table(
        "plans", sa.column("id", postgresql.UUID), sa.column("code"), sa.column("name"),
        sa.column("version"), sa.column("is_active"),
    )
    op.bulk_insert(plans, [{
        "id": CUSTOM_PLAN_ID, "code": "manual_custom_v1", "name": "Manual Custom",
        "version": 1, "is_active": True,
    }])


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM plans WHERE id = :id").bindparams(id=str(CUSTOM_PLAN_ID)))
    op.drop_index(
        "ix_subscription_entitlement_overrides_subscription_id",
        table_name="subscription_entitlement_overrides",
    )
    op.drop_table("subscription_entitlement_overrides")
