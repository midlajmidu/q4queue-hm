"""queue_first_refactor

Revision ID: 79f0c8075c95
Revises: z003_add_custom_fields
Create Date: 2026-08-01 00:22:23.896759

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '79f0c8075c95'
down_revision: Union[str, None] = 'z003_add_custom_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add queue_id to sessions (nullable initially)
    op.add_column('sessions', sa.Column('queue_id', sa.UUID(), nullable=True))
    
    # 2. Drop old constraints that would block migration
    op.drop_constraint('uq_session_org_date', 'sessions', type_='unique')
    op.drop_constraint('uq_queue_name_org_session', 'queues', type_='unique')
    
    # 3. Execute Data Migration
    conn = op.get_bind()
    
    # Create mapping of old queues to merged master queues
    conn.execute(sa.text("""
        CREATE TEMP TABLE queue_mapping AS
        WITH ranked_queues AS (
            SELECT id, org_id, name, created_at,
                   ROW_NUMBER() OVER(PARTITION BY org_id, name ORDER BY created_at ASC) as rn
            FROM queues
        )
        SELECT 
            q.id as old_id,
            rq.id as master_id,
            q.org_id,
            q.session_id,
            q.name
        FROM queues q
        JOIN ranked_queues rq ON q.org_id = rq.org_id AND q.name = rq.name AND rq.rn = 1;
    """))

    # Update tokens to point to master queue
    conn.execute(sa.text("""
        UPDATE tokens t
        SET queue_id = qm.master_id
        FROM queue_mapping qm
        WHERE t.queue_id = qm.old_id;
    """))
    
    # Create mapping for duplicating sessions per queue
    conn.execute(sa.text("""
        CREATE TEMP TABLE session_mapping (
            old_session_id UUID,
            master_queue_id UUID,
            new_session_id UUID DEFAULT gen_random_uuid(),
            session_date DATE,
            org_id UUID
        );
    """))
    
    conn.execute(sa.text("""
        INSERT INTO session_mapping (old_session_id, master_queue_id, session_date, org_id)
        SELECT DISTINCT
            qm.session_id,
            qm.master_id,
            s.session_date,
            s.org_id
        FROM queue_mapping qm
        JOIN sessions s ON qm.session_id = s.id
        WHERE qm.session_id IS NOT NULL;
    """))
    
    # Insert the new duplicated sessions with queue_id
    conn.execute(sa.text("""
        INSERT INTO sessions (id, org_id, session_date, title, queue_id, created_at)
        SELECT 
            sm.new_session_id,
            sm.org_id,
            sm.session_date,
            TO_CHAR(sm.session_date, 'YYYY-MM-DD'),
            sm.master_queue_id,
            NOW()
        FROM session_mapping sm;
    """))
    
    # Update tokens to point to the new session
    conn.execute(sa.text("""
        UPDATE tokens t
        SET session_id = sm.new_session_id
        FROM session_mapping sm
        WHERE t.session_id = sm.old_session_id AND t.queue_id = sm.master_queue_id;
    """))
    
    # Delete old sessions (the original ones don't have queue_id)
    conn.execute(sa.text("""
        DELETE FROM sessions WHERE queue_id IS NULL;
    """))
    
    # Delete duplicate queues
    conn.execute(sa.text("""
        DELETE FROM queues WHERE id NOT IN (SELECT master_id FROM queue_mapping);
    """))

    # 4. Enforce schema changes now that data is migrated
    op.alter_column('sessions', 'queue_id', existing_type=sa.UUID(), nullable=False)
    op.create_index(op.f('ix_sessions_queue_id'), 'sessions', ['queue_id'], unique=False)
    op.create_unique_constraint('uq_session_queue_date', 'sessions', ['queue_id', 'session_date'])
    op.create_foreign_key('fk_sessions_queue_id', 'sessions', 'queues', ['queue_id'], ['id'], ondelete='CASCADE')
    
    op.drop_index('ix_queues_session_id', table_name='queues')
    op.create_unique_constraint('uq_queue_name_org', 'queues', ['name', 'org_id'])
    op.drop_constraint('queues_session_id_fkey', 'queues', type_='foreignkey')
    op.drop_column('queues', 'session_id')


def downgrade() -> None:
    raise Exception("Downgrade not supported for this major structural refactor")
