"""Unit tests for organization settings endpoint logic."""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.api.v1.endpoints.organization import get_organization_settings, OrganizationSettingsResponse
from app.models.user import User
from app.models.organization import Organization


@pytest.mark.asyncio
async def test_get_organization_settings_requires_org_id():
    """Verify that accessing organization settings without an org_id raises 400."""
    mock_db = AsyncMock()
    user_without_org = User(
        id=uuid.uuid4(),
        email="no_org@example.com",
        org_id=None,
    )

    with pytest.raises(HTTPException) as exc_info:
        await get_organization_settings(db=mock_db, current_user=user_without_org)

    assert exc_info.value.status_code == 400
    assert "User does not belong to an organization" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_organization_settings_returns_settings():
    """Verify that organization settings are correctly assembled and returned."""
    mock_db = AsyncMock()
    test_org_id = uuid.uuid4()
    user_with_org = User(
        id=uuid.uuid4(),
        email="admin@clinic.com",
        org_id=test_org_id,
    )
    mock_org = Organization(
        id=test_org_id,
        name="Apollo Clinic",
        slug="apollo-clinic",
        address="123 Health Ave",
        phone_number="+919876543210",
        timezone="Asia/Kolkata",
        auto_session_enabled=True,
        auto_session_time="09:00",
        parent_organization_id=None,
    )

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_org
    mock_db.execute.return_value = mock_result

    response = await get_organization_settings(db=mock_db, current_user=user_with_org)

    assert isinstance(response, OrganizationSettingsResponse)
    assert response.name == "Apollo Clinic"
    assert response.slug == "apollo-clinic"
    assert response.email == "admin@clinic.com"
    assert response.timezone == "Asia/Kolkata"
    assert response.auto_session_enabled is True
