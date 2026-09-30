"""Unit tests for queue session management service."""
import uuid
import pytest
from unittest.mock import AsyncMock
from app.services.session_service import get_or_create_active_session
from app.models.session import Session
from app.models.queue import Queue
from app.models.organization import Organization


@pytest.mark.asyncio
async def test_get_or_create_active_session_reuses_existing_active_session():
    """Verify that if a queue already references an active session, that session is reused."""
    mock_db = AsyncMock()
    org_id = uuid.uuid4()
    queue_id = uuid.uuid4()
    session_id = uuid.uuid4()

    existing_session = Session(
        id=session_id,
        org_id=org_id,
        queue_id=queue_id,
        is_active=True,
    )
    test_queue = Queue(
        id=queue_id,
        org_id=org_id,
        name="Main Queue",
        token_session_id=session_id,
    )

    # First scalar call: Organization lookup
    # Second scalar call: Queue lookup
    mock_db.scalar.side_effect = [
        Organization(id=org_id, name="Test Branch", timezone="Asia/Kolkata"),
        test_queue,
    ]
    # db.get(Session, session_id) returns the existing session
    mock_db.get.return_value = existing_session

    result_session = await get_or_create_active_session(
        mock_db,
        queue_id=queue_id,
        org_id=org_id,
    )

    assert result_session.id == session_id
    assert result_session.is_active is True
