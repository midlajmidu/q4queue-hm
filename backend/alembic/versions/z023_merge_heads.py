"""merge heads: z020_branch_type_table_config and z022_add_appointment_id_to_call_logs

Revision ID: z023_merge_heads
Revises: z020_branch_type_table_config, z022_add_appointment_id_to_call_logs
Create Date: 2026-09-20 23:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "z023_merge_heads"
down_revision: Union[str, Sequence[str], None] = (
    "z020_branch_type_table_config",
    "z022_add_appointment_id_to_call_logs",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
