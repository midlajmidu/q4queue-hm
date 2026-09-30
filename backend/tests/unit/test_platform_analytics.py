"""Unit tests for super admin platform analytics calculation."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.api.v1.endpoints.super_admin import get_platform_analytics, PlatformAnalytics
from app.models.user import User


@pytest.mark.asyncio
async def test_get_platform_analytics_calculates_metrics():
    """Verify that get_platform_analytics aggregates metrics and returns PlatformAnalytics schema."""
    mock_db = AsyncMock()
    # Mock db.scalar to return predictable integer counts for consecutive queries
    counts = [10, 5, 3, 25, 100, 50, 8, 4, 3, 2, 1]
    mock_db.scalar.side_effect = lambda query: counts.pop(0) if counts else 0

    mock_execute_res = MagicMock()
    mock_execute_res.all.return_value = []
    mock_db.execute.return_value = mock_execute_res

    super_admin_user = User(
        email="superadmin@example.com",
        role="super_admin",
        is_active=True,
    )

    result = await get_platform_analytics(
        is_test=False,
        _super_admin=super_admin_user,
        db=mock_db,
    )

    assert isinstance(result, PlatformAnalytics)
    assert result.total_active_queues == 10
    assert result.total_waiting_customers == 5
    assert result.total_serving_customers == 3
    assert result.total_queue_entries_today == 25
    assert result.total_customers_served == 50
    assert result.total_staff_users == 8
