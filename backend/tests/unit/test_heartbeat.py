import uuid
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient
from sqlalchemy import select, event
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.organization import Organization
from app.core.security import create_access_token, hash_password
from app.db.session import engine

HEARTBEAT_URL = "/api/v1/users/me/heartbeat"

@pytest.mark.asyncio
async def test_heartbeat_first_time(client: AsyncClient, db: AsyncSession, org_a: Organization):
    """Test 1: User with last_active_at = NULL updates timestamp successfully."""
    user = User(
        org_id=org_a.id,
        email=f"hb_null_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("pw123"),
        role="staff",
        is_first_login=False,
        last_active_at=None,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(
        user_id=str(user.id),
        org_id=str(org_a.id),
        role=user.role,
        email=user.email,
    )
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(HEARTBEAT_URL, headers=headers)
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    # Refresh user to bypass SQLAlchemy session identity map
    await db.refresh(user)
    assert user.last_active_at is not None
    now_utc = datetime.now(timezone.utc)
    stored_dt = user.last_active_at.replace(tzinfo=timezone.utc) if user.last_active_at.tzinfo is None else user.last_active_at
    assert (now_utc - stored_dt).total_seconds() < 5


@pytest.mark.asyncio
async def test_heartbeat_stale_timestamp_updates(client: AsyncClient, db: AsyncSession, org_a: Organization):
    """Test 2: Stale heartbeat (2 minutes old) updates timestamp."""
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=2)
    user = User(
        org_id=org_a.id,
        email=f"hb_stale_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("pw123"),
        role="staff",
        is_first_login=False,
        last_active_at=stale_time,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(
        user_id=str(user.id),
        org_id=str(org_a.id),
        role=user.role,
        email=user.email,
    )
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(HEARTBEAT_URL, headers=headers)
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    # Refresh user to inspect live DB state
    await db.refresh(user)
    stored_dt = user.last_active_at.replace(tzinfo=timezone.utc) if user.last_active_at.tzinfo is None else user.last_active_at
    now_utc = datetime.now(timezone.utc)
    assert stored_dt > stale_time
    assert (now_utc - stored_dt).total_seconds() < 5


@pytest.mark.asyncio
async def test_heartbeat_recent_timestamp_skipped(client: AsyncClient, db: AsyncSession, org_a: Organization):
    """Test 3: Recent heartbeat (10 seconds old) skips UPDATE and leaves timestamp unchanged."""
    recent_time = datetime.now(timezone.utc) - timedelta(seconds=10)
    user = User(
        org_id=org_a.id,
        email=f"hb_recent_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("pw123"),
        role="staff",
        is_first_login=False,
        last_active_at=recent_time,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(
        user_id=str(user.id),
        org_id=str(org_a.id),
        role=user.role,
        email=user.email,
    )
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(HEARTBEAT_URL, headers=headers)
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    await db.refresh(user)
    stored_dt = user.last_active_at.replace(tzinfo=timezone.utc) if user.last_active_at.tzinfo is None else user.last_active_at

    # Timestamp must not have been updated to 'now'
    assert abs((stored_dt - recent_time).total_seconds()) < 1.0


@pytest.mark.asyncio
async def test_heartbeat_boundary_behavior(client: AsyncClient, db: AsyncSession, org_a: Organization):
    """Test 4: Boundary testing at 45s (skipped) vs 55s (updated)."""
    # 4a: 45 seconds ago -> should be skipped (threshold is 50s)
    t_45s = datetime.now(timezone.utc) - timedelta(seconds=45)
    user_45 = User(
        org_id=org_a.id,
        email=f"hb_45s_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("pw123"),
        role="staff",
        is_first_login=False,
        last_active_at=t_45s,
    )
    db.add(user_45)

    # 4b: 55 seconds ago -> should be updated
    t_55s = datetime.now(timezone.utc) - timedelta(seconds=55)
    user_55 = User(
        org_id=org_a.id,
        email=f"hb_55s_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("pw123"),
        role="staff",
        is_first_login=False,
        last_active_at=t_55s,
    )
    db.add(user_55)
    await db.commit()
    await db.refresh(user_45)
    await db.refresh(user_55)

    # Hit heartbeat for user_45
    token_45 = create_access_token(user_id=str(user_45.id), org_id=str(org_a.id), role=user_45.role, email=user_45.email)
    resp_45 = await client.post(HEARTBEAT_URL, headers={"Authorization": f"Bearer {token_45}"})
    assert resp_45.status_code == 200

    # Hit heartbeat for user_55
    token_55 = create_access_token(user_id=str(user_55.id), org_id=str(org_a.id), role=user_55.role, email=user_55.email)
    resp_55 = await client.post(HEARTBEAT_URL, headers={"Authorization": f"Bearer {token_55}"})
    assert resp_55.status_code == 200

    # Refresh both
    await db.refresh(user_45)
    await db.refresh(user_55)

    dt_45 = user_45.last_active_at.replace(tzinfo=timezone.utc) if user_45.last_active_at.tzinfo is None else user_45.last_active_at
    assert abs((dt_45 - t_45s).total_seconds()) < 1.0  # Not updated

    dt_55 = user_55.last_active_at.replace(tzinfo=timezone.utc) if user_55.last_active_at.tzinfo is None else user_55.last_active_at
    now_utc = datetime.now(timezone.utc)
    assert dt_55 > t_55s  # Updated
    assert (now_utc - dt_55).total_seconds() < 5


@pytest.mark.asyncio
async def test_heartbeat_invalid_auth(client: AsyncClient):
    """Test 5: Unauthenticated or invalid token rejected with 401."""
    # No token
    resp_no_token = await client.post(HEARTBEAT_URL)
    assert resp_no_token.status_code == 401

    # Tampered token
    resp_bad_token = await client.post(HEARTBEAT_URL, headers={"Authorization": "Bearer bad.token.signature"})
    assert resp_bad_token.status_code == 401


@pytest.mark.asyncio
async def test_existing_presence_semantics_preserved(client: AsyncClient, db: AsyncSession, org_a: Organization):
    """Test 6: User with recently throttled heartbeat remains Online under 120s presence window."""
    t_40s = datetime.now(timezone.utc) - timedelta(seconds=40)
    user = User(
        org_id=org_a.id,
        email=f"hb_pres_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("pw123"),
        role="staff",
        is_first_login=False,
        last_active_at=t_40s,
    )
    db.add(user)
    await db.commit()

    token = create_access_token(user_id=str(user.id), org_id=str(org_a.id), role=user.role, email=user.email)
    resp = await client.post(HEARTBEAT_URL, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200

    # Query using exact monitoring/dashboard presence logic (now - 120 seconds)
    two_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=2)
    online_count = await db.scalar(
        select(User.id).where(User.id == user.id, User.last_active_at >= two_mins_ago)
    )
    assert online_count is not None, "User should be considered online within the 120-second presence window"


@pytest.mark.asyncio
async def test_sql_execution_zero_updates_on_throttled_heartbeat(client: AsyncClient, db: AsyncSession, org_a: Organization):
    """Test 7: Verify that SQL UPDATE is NOT emitted when heartbeat is throttled."""
    recent_time = datetime.now(timezone.utc) - timedelta(seconds=15)
    user = User(
        org_id=org_a.id,
        email=f"hb_sql_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("pw123"),
        role="staff",
        is_first_login=False,
        last_active_at=recent_time,
    )
    db.add(user)
    await db.commit()

    token = create_access_token(user_id=str(user.id), org_id=str(org_a.id), role=user.role, email=user.email)
    headers = {"Authorization": f"Bearer {token}"}

    executed_queries = []

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        executed_queries.append(statement)

    event.listen(engine.sync_engine, "before_cursor_execute", before_cursor_execute)
    try:
        resp = await client.post(HEARTBEAT_URL, headers=headers)
        assert resp.status_code == 200
    finally:
        event.remove(engine.sync_engine, "before_cursor_execute", before_cursor_execute)

    # Filter for UPDATE queries on users table
    update_queries = [
        q for q in executed_queries
        if "UPDATE" in q.upper() and "USERS" in q.upper()
    ]

    assert len(update_queries) == 0, f"Expected 0 UPDATE statements on users, but got: {update_queries}"
