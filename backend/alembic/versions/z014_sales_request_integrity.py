"""Prevent concurrent duplicate pending sales requests.

Revision ID: z014_sales_integrity
Revises: z013_sales_delivery
"""
from alembic import op

revision = "z014_sales_integrity"
down_revision = "z013_sales_delivery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Preserve the newest open request. Older duplicate pending records remain
    # available in history as superseded instead of being deleted.
    op.execute("""
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY parent_organization_id ORDER BY created_at DESC, id DESC
            ) AS row_number
            FROM sales_requests
            WHERE status = 'pending'
        )
        UPDATE sales_requests
        SET status = 'superseded',
            review_note = COALESCE(review_note, 'Superseded while enforcing one open request per customer.'),
            reviewed_at = COALESCE(reviewed_at, NOW())
        WHERE id IN (SELECT id FROM ranked WHERE row_number > 1)
    """)
    op.execute("""
        CREATE UNIQUE INDEX uq_sales_requests_one_pending_per_parent
        ON sales_requests (parent_organization_id)
        WHERE status = 'pending'
    """)


def downgrade() -> None:
    op.drop_index("uq_sales_requests_one_pending_per_parent", table_name="sales_requests")
