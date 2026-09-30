"""Unit tests for token lifecycle timestamp progression and status transitions."""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from app.models.token import Token, TokenStatus


def test_token_timestamp_progression():
    """Verify that a completed token maintains chronological timestamp ordering."""
    base_time = datetime(2026, 9, 30, 10, 0, 0, tzinfo=timezone.utc)
    served_time = base_time + timedelta(minutes=15)
    completed_time = served_time + timedelta(minutes=7)

    token = Token(
        id=uuid.uuid4(),
        token_number="A-01",
        status=TokenStatus.done,
        created_at=base_time,
        served_at=served_time,
        completed_at=completed_time,
    )

    assert token.created_at <= token.served_at
    assert token.served_at <= token.completed_at

    wait_seconds = (token.served_at - token.created_at).total_seconds()
    service_seconds = (token.completed_at - token.served_at).total_seconds()

    assert wait_seconds == 900.0  # 15 minutes
    assert service_seconds == 420.0  # 7 minutes


def test_token_status_enum_values():
    """Verify all recognized token lifecycle statuses."""
    expected_statuses = {"waiting", "serving", "done", "skipped", "deleted"}
    actual_statuses = {s.value for s in TokenStatus}
    assert expected_statuses == actual_statuses


@pytest.mark.asyncio
async def test_undo_remove_token_schedules_single_queue_update(
    client,
    db,
    org_a,
    auth_headers_a,
    monkeypatch,
):
    """Verify that undo_remove_token restores the token and schedules notify_queue_update exactly once."""
    from app.models.queue import Queue
    from app.models.session import Session
    from app.services import token_service

    # 1. Create a queue in Org A
    queue = Queue(
        id=uuid.uuid4(),
        org_id=org_a.id,
        name=f"Restore-Q-{uuid.uuid4().hex[:6]}",
        prefix="R",
        is_active=True,
    )
    db.add(queue)
    await db.flush()

    # 2. Create active session
    session = Session(
        id=uuid.uuid4(),
        org_id=org_a.id,
        queue_id=queue.id,
        session_date=datetime.now(timezone.utc).date(),
        title="Restore Test Session",
        is_active=True,
    )
    db.add(session)
    await db.flush()

    queue.token_session_id = session.id
    await db.flush()

    # 3. Create deleted token
    token = Token(
        id=uuid.uuid4(),
        org_id=org_a.id,
        queue_id=queue.id,
        session_id=session.id,
        token_number=1,
        customer_name="Alice",
        customer_phone="+919876543210",
        status=TokenStatus.deleted,
        deleted_at=datetime.now(timezone.utc),
    )
    db.add(token)
    await db.commit()

    # 4. Track notify_queue_update calls
    calls = []

    async def spy_notify_queue_update(queue_id, org_id):
        calls.append({"queue_id": queue_id, "org_id": org_id})

    monkeypatch.setattr(token_service, "notify_queue_update", spy_notify_queue_update)

    # 5. Execute endpoint
    resp = await client.patch(
        f"/api/v1/tokens/{token.id}/undo_remove",
        headers=auth_headers_a,
    )

    # 6. Assertions
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "waiting"
    assert data["id"] == str(token.id)

    # 7. Assert notify_queue_update was scheduled exactly once with correct args
    assert len(calls) == 1
    assert calls[0]["queue_id"] == queue.id
    assert calls[0]["org_id"] == org_a.id

    # 8. Verify DB state
    await db.refresh(token)
    assert token.status == TokenStatus.waiting
    assert token.deleted_at is None

