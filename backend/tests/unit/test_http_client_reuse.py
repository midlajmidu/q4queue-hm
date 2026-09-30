"""
Unit tests for HTTPX connection reuse and shared HTTP client lifecycle.
Verifies:
1. Shared client is initialized correctly with pooling.
2. Client is reused across multiple calls.
3. Client is cleanly closed during shutdown.
4. Existing external WhatsApp messaging behavior remains unchanged when using the shared client.
"""
import uuid
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
import pytest

from app.core.http_client import get_http_client, close_http_client


@pytest.mark.asyncio
async def test_shared_client_initialization_and_reuse():
    """Verify shared client is initialized with proper pooling and reused across calls."""
    try:
        client1 = await get_http_client()
        assert isinstance(client1, httpx.AsyncClient)
        assert not client1.is_closed

        client2 = await get_http_client()
        # Must be the exact same instance across calls
        assert client1 is client2
    finally:
        await close_http_client()


@pytest.mark.asyncio
async def test_shared_client_shutdown():
    """Verify shared client is properly closed upon shutdown and re-initialized on demand."""
    try:
        client = await get_http_client()
        assert not client.is_closed

        await close_http_client()
        assert client.is_closed

        # Getting client again after close should create a new live instance
        new_client = await get_http_client()
        assert not new_client.is_closed
        assert new_client is not client
    finally:
        await close_http_client()


@pytest.mark.asyncio
async def test_whatsapp_send_uses_shared_client_with_mocked_network():
    """Verify send_whatsapp_message posts via shared client without making real network calls."""
    from app.whatsapp.message_service import send_whatsapp_message

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "messages": [{"id": "wamid.HBgLM...mocked"}]
    }

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.post.return_value = mock_resp

    org_id = uuid.uuid4()
    msg_id = uuid.uuid4()

    mock_db_msg = MagicMock()
    mock_db_msg.id = msg_id

    with patch("app.core.http_client.get_http_client", AsyncMock(return_value=mock_client)), \
         patch("app.whatsapp.message_service.get_global_config_dict", AsyncMock(return_value={
             "access_token": "mock_token",
             "phone_number_id": "123456789",
             "api_version": "v21.0",
             "template_language": "en_US",
         })), \
         patch("app.whatsapp.message_service._store_message", AsyncMock(return_value=mock_db_msg)), \
         patch("app.whatsapp.message_service._update_message_status", AsyncMock()) as mock_update_status:

        await send_whatsapp_message(
            phone="+919876543210",
            event_type="queue_joined",
            variables=["Customer", "A-01", "1"],
            org_id=org_id,
        )

        # Verify client was called with expected headers and endpoint
        mock_client.post.assert_called_once()
        call_args, call_kwargs = mock_client.post.call_args
        assert "123456789/messages" in call_args[0]
        assert call_kwargs["headers"]["Authorization"] == "Bearer mock_token"
        assert call_kwargs["timeout"] == 10.0
        assert call_kwargs["json"]["messaging_product"] == "whatsapp"

        # Verify message status update was called with mocked Meta message ID
        mock_update_status.assert_called_once()
        assert mock_update_status.call_args[0][0] == msg_id
        assert mock_update_status.call_args[1]["meta_message_id"] == "wamid.HBgLM...mocked"
