"""Add plans, trial subscriptions and entitlement usage.

Revision ID: z008_trials
Revises: z008_call_status_ring_duration
"""
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "z008_trials"
down_revision = "z008_call_status_ring_duration"
branch_labels = None
depends_on = None

TRIAL_PLAN_ID = uuid.UUID("00000000-0000-4000-8000-000000000014")


def upgrade() -> None:
    op.create_table(
        "plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(80), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_plans_code", "plans", ["code"])

    op.create_table(
        "plan_entitlements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("limit_value", sa.Integer(), nullable=True),
        sa.Column("scope", sa.String(30), nullable=False),
        sa.Column("reset_period", sa.String(30), server_default="none", nullable=False),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("plan_id", "key", name="uq_plan_entitlement_key"),
    )
    op.create_index("ix_plan_entitlements_plan_id", "plan_entitlements", ["plan_id"])

    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("source", sa.String(40), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("trial_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parent_organization_id"], ["parent_organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("parent_organization_id"),
    )
    op.create_index("ix_subscriptions_parent_organization_id", "subscriptions", ["parent_organization_id"])
    op.create_index("ix_subscriptions_plan_id", "subscriptions", ["plan_id"])
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])

    op.create_table(
        "entitlement_usage",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entitlement_key", sa.String(100), nullable=False),
        sa.Column("scope_type", sa.String(30), nullable=False),
        sa.Column("scope_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("used", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "subscription_id", "entitlement_key", "scope_type", "scope_id", "period_start",
            name="uq_entitlement_usage_scope_period",
        ),
    )
    op.create_index("ix_entitlement_usage_subscription_id", "entitlement_usage", ["subscription_id"])

    plans = sa.table("plans", sa.column("id", postgresql.UUID), sa.column("code"), sa.column("name"), sa.column("version"), sa.column("is_active"))
    entitlements = sa.table(
        "plan_entitlements", sa.column("id", postgresql.UUID), sa.column("plan_id", postgresql.UUID),
        sa.column("key"), sa.column("limit_value"), sa.column("scope"), sa.column("reset_period")
    )
    op.bulk_insert(plans, [{"id": TRIAL_PLAN_ID, "code": "free_trial_v1", "name": "Free Trial", "version": 1, "is_active": True}])
    op.bulk_insert(entitlements, [
        {"id": uuid.uuid4(), "plan_id": TRIAL_PLAN_ID, "key": "branches.max", "limit_value": 1, "scope": "parent", "reset_period": "none"},
        {"id": uuid.uuid4(), "plan_id": TRIAL_PLAN_ID, "key": "queues.max", "limit_value": 1, "scope": "branch", "reset_period": "none"},
        {"id": uuid.uuid4(), "plan_id": TRIAL_PLAN_ID, "key": "staff_users.max", "limit_value": 1, "scope": "branch", "reset_period": "none"},
        {"id": uuid.uuid4(), "plan_id": TRIAL_PLAN_ID, "key": "sessions.created.max", "limit_value": 3, "scope": "subscription", "reset_period": "trial"},
        {"id": uuid.uuid4(), "plan_id": TRIAL_PLAN_ID, "key": "tokens.created.max_per_session", "limit_value": 20, "scope": "session", "reset_period": "session"},
    ])


def downgrade() -> None:
    op.drop_table("entitlement_usage")
    op.drop_table("subscriptions")
    op.drop_table("plan_entitlements")
    op.drop_index("ix_plans_code", table_name="plans")
    op.drop_table("plans")
