"""Unit tests for cross-branch analytics CSV export."""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.responses import StreamingResponse
from app.services.analytics_service import get_cross_branch_csv_data


@pytest.mark.asyncio
async def test_cross_branch_csv_streaming_header():
    """Verify that get_cross_branch_csv_data yields valid CSV headers for StreamingResponse."""
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.all.return_value = []
    mock_db.execute.return_value = mock_res

    org_id = uuid.uuid4()
    gen = get_cross_branch_csv_data(mock_db, [org_id])
    response = StreamingResponse(gen, media_type="text/csv")

    chunks = []
    async for chunk in response.body_iterator:
        chunks.append(chunk)

    csv_output = "".join(chunks)
    header_line = csv_output.strip().splitlines()[0]
    expected_headers = [
        "Date",
        "Branch",
        "Token Number",
        "Queue",
        "Customer Name",
        "Customer Phone",
        "Status",
        "Created At",
        "Served At",
        "Completed At",
        "Wait Time (mins)",
        "Serve Time (mins)",
        "Served By",
        "Call Method",
    ]
    for h in expected_headers:
        assert h in header_line
