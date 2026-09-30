"""
Unit tests for build_queue_snapshots_dual in app.websocket.helpers.
Verifies snapshot structure, PII redaction, collection filtering, and mutation isolation.
"""
import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.queue import Queue
from app.models.session import Session
from app.models.token import Token, TokenStatus
from app.websocket.helpers import build_queue_snapshots_dual


@pytest.mark.asyncio
async def test_build_queue_snapshots_dual_error_on_missing_queue(db: AsyncSession):
    """Missing queue returns error type in both public and admin snapshots."""
    missing_id = uuid.uuid4()
    snapshots = await build_queue_snapshots_dual(db, queue_id=missing_id)
    assert snapshots["public"]["type"] == "error"
    assert snapshots["admin"]["type"] == "error"
    assert "Queue not found" in snapshots["public"]["message"]


@pytest.mark.asyncio
async def test_build_queue_snapshots_dual_redaction_and_data_parity(
    db: AsyncSession,
    org_a: Organization,
):
    """Verify admin has full data and PII, while public strictly redacts PII and admin collections."""
    queue = Queue(
        id=uuid.uuid4(),
        org_id=org_a.id,
        name=f"Snap-Q-{uuid.uuid4().hex[:6]}",
        prefix="S",
        is_active=True,
        table_config=[{"id": "t1", "name": "Table 1"}],
    )
    db.add(queue)
    await db.flush()

    session = Session(
        id=uuid.uuid4(),
        org_id=org_a.id,
        queue_id=queue.id,
        session_date=datetime.now(timezone.utc).date(),
        title="Snap Test Session",
        is_active=True,
    )
    db.add(session)
    await db.flush()

    queue.token_session_id = session.id
    await db.flush()

    # Create tokens across various states with sensitive PII
    tokens = [
        Token(
            id=uuid.uuid4(),
            org_id=org_a.id,
            queue_id=queue.id,
            session_id=session.id,
            token_number=1,
            customer_name="Serving Customer",
            customer_phone="+919876543210",
            customer_age=30,
            status=TokenStatus.serving,
            assigned_line=1,
            served_at=datetime.now(timezone.utc),
            shared_lines=[1],
            completed_lines=[],
        ),
        Token(
            id=uuid.uuid4(),
            org_id=org_a.id,
            queue_id=queue.id,
            session_id=session.id,
            token_number=2,
            customer_name="Waiting Customer",
            customer_phone="+919876543211",
            customer_age=25,
            status=TokenStatus.waiting,
        ),
        Token(
            id=uuid.uuid4(),
            org_id=org_a.id,
            queue_id=queue.id,
            session_id=session.id,
            token_number=3,
            customer_name="Skipped Customer",
            customer_phone="+919876543212",
            customer_age=40,
            status=TokenStatus.skipped,
            skipped_at=datetime.now(timezone.utc),
        ),
        Token(
            id=uuid.uuid4(),
            org_id=org_a.id,
            queue_id=queue.id,
            session_id=session.id,
            token_number=4,
            customer_name="Deleted Customer",
            customer_phone="+919876543213",
            customer_age=50,
            status=TokenStatus.deleted,
            deleted_at=datetime.now(timezone.utc),
        ),
        Token(
            id=uuid.uuid4(),
            org_id=org_a.id,
            queue_id=queue.id,
            session_id=session.id,
            token_number=5,
            customer_name="Done Customer",
            customer_phone="+919876543214",
            customer_age=35,
            status=TokenStatus.done,
            served_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
        ),
    ]
    for t in tokens:
        db.add(t)
    await db.commit()

    snapshots = await build_queue_snapshots_dual(db, queue_id=queue.id)
    public = snapshots["public"]
    admin = snapshots["admin"]

    # 1. Parity on queue-level metadata
    assert public["type"] == "queue_snapshot"
    assert admin["type"] == "queue_snapshot"
    assert public["queue_id"] == str(queue.id)
    assert admin["queue_id"] == str(queue.id)
    assert public["queue_name"] == queue.name
    assert admin["queue_name"] == queue.name
    assert public["prefix"] == queue.prefix
    assert admin["prefix"] == queue.prefix
    assert public["is_active"] == admin["is_active"]
    assert public["is_paused"] == admin["is_paused"]
    assert public["waiting_count"] == 1
    assert admin["waiting_count"] == 1
    assert public["skipped_count"] == 1
    assert admin["skipped_count"] == 1
    assert public["done_count"] == 1
    assert admin["done_count"] == 1

    # 2. Admin snapshot retains PII & admin collections
    assert len(admin["waiting_tokens"]) == 1
    assert admin["waiting_tokens"][0]["customer_phone"] == "+919876543211"
    assert len(admin["skipped_tokens"]) == 1
    assert admin["skipped_tokens"][0]["customer_phone"] == "+919876543212"
    assert len(admin["deleted_tokens"]) == 1
    assert admin["deleted_tokens"][0]["customer_phone"] == "+919876543213"
    assert admin["serving_details"]["customer_phone"] == "+919876543210"

    # 3. Public snapshot strictly redacts PII
    # serving_details
    assert "customer_phone" not in public["serving_details"]
    assert "customer_age" not in public["serving_details"]
    assert "customer_name" not in public["serving_details"]
    assert public["serving_details"]["token_number"] == 1

    # waiting_tokens only expose token_number and session_id
    assert len(public["waiting_tokens"]) == 1
    assert public["waiting_tokens"][0] == {"token_number": 2, "session_id": str(session.id)}

    # skipped and deleted tokens are strictly empty in public
    assert public["skipped_tokens"] == []
    assert public["deleted_tokens"] == []
    assert public["waiting_tokens_truncated"] is False
    assert public["skipped_tokens_truncated"] is False
    assert public["deleted_tokens_truncated"] is False

    # recent tokens redact PII
    for rt in public["recent_tokens"]:
        assert "customer_phone" not in rt
        assert "customer_name" not in rt


@pytest.mark.asyncio
async def test_build_queue_snapshots_dual_mutation_isolation(
    db: AsyncSession,
    org_a: Organization,
):
    """Verify that mutating the public snapshot dictionary does NOT leak into or mutate the admin snapshot."""
    queue = Queue(
        id=uuid.uuid4(),
        org_id=org_a.id,
        name=f"Iso-Q-{uuid.uuid4().hex[:6]}",
        prefix="I",
        is_active=True,
        table_config=[{"id": "t1"}],
    )
    db.add(queue)
    await db.flush()

    session = Session(
        id=uuid.uuid4(),
        org_id=org_a.id,
        queue_id=queue.id,
        session_date=datetime.now(timezone.utc).date(),
        title="Iso Test Session",
        is_active=True,
    )
    db.add(session)
    await db.flush()

    queue.token_session_id = session.id
    await db.flush()

    token = Token(
        id=uuid.uuid4(),
        org_id=org_a.id,
        queue_id=queue.id,
        session_id=session.id,
        token_number=10,
        customer_name="Iso Customer",
        customer_phone="+919876543299",
        status=TokenStatus.serving,
        assigned_line=1,
        served_at=datetime.now(timezone.utc),
        shared_lines=[1, 2],
    )
    db.add(token)
    await db.commit()

    snapshots = await build_queue_snapshots_dual(db, queue_id=queue.id)
    public = snapshots["public"]
    admin = snapshots["admin"]

    # Mutate public dictionary
    public["serving_details"]["token_number"] = 999
    assert admin["serving_details"]["token_number"] == 10

    public["all_serving_tokens"][0]["token_number"] = 888
    assert admin["all_serving_tokens"][0]["token_number"] == 10

    public["all_serving_tokens"][0]["shared_lines"].append(99)
    assert 99 not in admin["all_serving_tokens"][0]["shared_lines"]

    public["waiting_tokens"].append({"token_number": 9999})
    assert len(admin["waiting_tokens"]) == 0

    public["skipped_tokens"].append({"fake": True})
    assert len(admin["skipped_tokens"]) == 0

    public["table_config"].append({"id": "t2"})
    assert len(admin["table_config"]) == 1

    # Mutate admin dictionary
    admin["serving_details"]["token_number"] = 777
    assert public["serving_details"]["token_number"] == 999
