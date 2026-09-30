"""add appointment_feature_enabled to organizations and parent_organizations

Revision ID: z027_add_appointment_feature_flag
Revises: z026_add_system_settings_table
Create Date: 2026-09-29 20:50:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "z027_appointment_flag"
down_revision: Union[str, Sequence[str], None] = "z026_add_system_settings_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    org_cols = [c["name"] for c in inspector.get_columns("organizations")]
    if "appointment_feature_enabled" not in org_cols:
        op.add_column(
            "organizations",
            sa.Column(
                "appointment_feature_enabled",
                sa.Boolean(),
                server_default=sa.text("false"),
                nullable=False,
            ),
        )

    parent_org_cols = [c["name"] for c in inspector.get_columns("parent_organizations")]
    if "appointment_feature_enabled" not in parent_org_cols:
        op.add_column(
            "parent_organizations",
            sa.Column(
                "appointment_feature_enabled",
                sa.Boolean(),
                server_default=sa.text("false"),
                nullable=False,
            ),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    parent_org_cols = [c["name"] for c in inspector.get_columns("parent_organizations")]
    if "appointment_feature_enabled" in parent_org_cols:
        op.drop_column("parent_organizations", "appointment_feature_enabled")

    org_cols = [c["name"] for c in inspector.get_columns("organizations")]
    if "appointment_feature_enabled" in org_cols:
        op.drop_column("organizations", "appointment_feature_enabled")
