"""
Alembic migration: h001_add_whatsapp_tables
Add all WhatsApp Cloud API tables + tracking_id column to tokens.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "h001_add_whatsapp_tables"
down_revision = "49cf574ceceb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. whatsapp_configs ───────────────────────────────────────
    op.create_table(
        "whatsapp_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("business_id", sa.String(100), nullable=True),
        sa.Column("phone_number_id", sa.String(100), nullable=True),
        sa.Column("waba_id", sa.String(100), nullable=True),
        sa.Column("access_token", sa.Text, nullable=True),
        sa.Column("app_id", sa.String(100), nullable=True),
        sa.Column("app_secret", sa.String(200), nullable=True),
        sa.Column("webhook_url", sa.String(500), nullable=True),
        sa.Column("webhook_verify_token", sa.String(200), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="disconnected"),
        sa.Column("is_enabled", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("payment_active", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("business_verified", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("webhook_active", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("org_id", name="uq_whatsapp_config_org"),
    )
    op.create_index("ix_whatsapp_configs_org_id", "whatsapp_configs", ["org_id"])

    # ── 2. whatsapp_templates ─────────────────────────────────────
    op.create_table(
        "whatsapp_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("template_name", sa.String(100), nullable=False, unique=True),
        sa.Column("category", sa.String(50), nullable=False, server_default="UTILITY"),
        sa.Column("language", sa.String(10), nullable=False, server_default="en"),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("body_text", sa.Text, nullable=False),
        sa.Column("variables", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("event_type", sa.String(50), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_whatsapp_templates_name", "whatsapp_templates", ["template_name"])
    op.create_index("ix_whatsapp_templates_event", "whatsapp_templates", ["event_type"])

    # ── 3. whatsapp_messages ──────────────────────────────────────
    op.create_table(
        "whatsapp_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("queue_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("token_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("customer_name", sa.String(120), nullable=True),
        sa.Column("message_type", sa.String(30), nullable=False, server_default="template"),
        sa.Column("template_name", sa.String(100), nullable=True),
        sa.Column("template_variables", postgresql.JSONB, nullable=True),
        sa.Column("rendered_body", sa.Text, nullable=True),
        sa.Column("event_type", sa.String(50), nullable=True),
        sa.Column("meta_message_id", sa.String(200), nullable=True, unique=True),
        sa.Column("delivery_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("error_code", sa.String(20), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_whatsapp_messages_org_id", "whatsapp_messages", ["org_id"])
    op.create_index("ix_whatsapp_messages_token_id", "whatsapp_messages", ["token_id"])
    op.create_index("ix_whatsapp_messages_phone", "whatsapp_messages", ["phone"])
    op.create_index("ix_whatsapp_messages_meta_id", "whatsapp_messages", ["meta_message_id"])
    op.create_index("ix_whatsapp_messages_status", "whatsapp_messages", ["delivery_status"])
    op.create_index("ix_whatsapp_messages_event", "whatsapp_messages", ["event_type"])

    # ── 4. whatsapp_webhook_logs ──────────────────────────────────
    op.create_table(
        "whatsapp_webhook_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("meta_message_id", sa.String(200), nullable=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("payload", postgresql.JSONB, nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("processed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_whatsapp_webhook_logs_meta_id", "whatsapp_webhook_logs", ["meta_message_id"])
    op.create_index("ix_whatsapp_webhook_logs_event", "whatsapp_webhook_logs", ["event_type"])

    # ── 5. whatsapp_daily_stats ───────────────────────────────────
    op.create_table(
        "whatsapp_daily_stats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("stat_date", sa.String(10), nullable=False),
        sa.Column("total_sent", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_delivered", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_read", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_failed", sa.Integer, nullable=False, server_default="0"),
        sa.Column("estimated_cost", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("org_id", "stat_date", name="uq_whatsapp_daily_stat_org_date"),
    )
    op.create_index("ix_whatsapp_daily_stats_org_id", "whatsapp_daily_stats", ["org_id"])
    op.create_index("ix_whatsapp_daily_stats_date", "whatsapp_daily_stats", ["stat_date"])

    # ── 6. Add tracking_id to tokens ─────────────────────────────
    op.add_column(
        "tokens",
        sa.Column(
            "tracking_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    # Back-fill existing rows with a generated UUID
    op.execute(
        "UPDATE tokens SET tracking_id = gen_random_uuid() WHERE tracking_id IS NULL"
    )
    # Now make it non-nullable and unique
    op.alter_column("tokens", "tracking_id", nullable=False)
    op.create_unique_constraint("uq_tokens_tracking_id", "tokens", ["tracking_id"])
    op.create_index("ix_tokens_tracking_id", "tokens", ["tracking_id"])

    # ── 7. Add whatsapp_reminder_sent to tokens ───────────────────
    op.add_column(
        "tokens",
        sa.Column("whatsapp_reminder_sent", sa.Boolean, nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("tokens", "whatsapp_reminder_sent")
    op.drop_index("ix_tokens_tracking_id", "tokens")
    op.drop_constraint("uq_tokens_tracking_id", "tokens")
    op.drop_column("tokens", "tracking_id")

    op.drop_table("whatsapp_daily_stats")
    op.drop_table("whatsapp_webhook_logs")
    op.drop_table("whatsapp_messages")
    op.drop_table("whatsapp_templates")
    op.drop_table("whatsapp_configs")
