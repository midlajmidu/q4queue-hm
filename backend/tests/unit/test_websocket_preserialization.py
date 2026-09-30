"""
Unit tests for WebSocket queue snapshot pre-serialization and differentiated broadcast.
Verifies:
1. Queue public snapshot JSON remains valid.
2. Queue admin snapshot JSON remains valid.
3. Existing payload structure is unchanged.
4. send_text() receives valid JSON in the optimized path.
5. Existing tenant/public/admin routing behavior remains unchanged.
"""
import json
from unittest.mock import AsyncMock
import pytest

from app.websocket.connection_manager import ConnectionManager


def _mock_ws() -> AsyncMock:
    ws = AsyncMock()
    ws.send_text = AsyncMock()
    ws.send_json = AsyncMock()
    ws.accept = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest.mark.asyncio
async def test_broadcast_differentiated_preserialized_strings():
    """Verify that already-serialized JSON strings are sent directly via send_text without double-serialization."""
    mgr = ConnectionManager()
    channel = "org_123_queue_456"

    ws_admin = _mock_ws()
    ws_public = _mock_ws()

    await mgr.connect(channel, ws_admin, is_admin=True)
    await mgr.connect(channel, ws_public, is_admin=False)

    public_payload = {"type": "queue_update", "current_serving": 10, "waiting_count": 5}
    admin_payload = {
        "type": "queue_update",
        "current_serving": 10,
        "waiting_count": 5,
        "customer_phone": "+1234567890",
    }

    public_json = json.dumps(public_payload)
    admin_json = json.dumps(admin_payload)

    await mgr.broadcast_differentiated(channel, public_json, admin_json)

    # ws_admin must receive the exact admin JSON string via send_text
    ws_admin.send_text.assert_called_once_with(admin_json)
    # ws_public must receive the exact public JSON string via send_text
    ws_public.send_text.assert_called_once_with(public_json)

    # Validating JSON structure received by clients
    received_admin = json.loads(ws_admin.send_text.call_args[0][0])
    received_public = json.loads(ws_public.send_text.call_args[0][0])

    assert received_admin["customer_phone"] == "+1234567890"
    assert "customer_phone" not in received_public
    assert received_public["current_serving"] == 10
    assert received_public["type"] == "queue_update"


@pytest.mark.asyncio
async def test_broadcast_differentiated_dict_fallback():
    """Verify that dict payloads are serialized once and sent via send_text."""
    mgr = ConnectionManager()
    channel = "org_123_queue_456"

    ws_admin = _mock_ws()
    ws_public = _mock_ws()

    await mgr.connect(channel, ws_admin, is_admin=True)
    await mgr.connect(channel, ws_public, is_admin=False)

    public_payload = {"type": "queue_update", "current_serving": 2}
    admin_payload = {"type": "queue_update", "current_serving": 2, "secret": "abc"}

    await mgr.broadcast_differentiated(channel, public_payload, admin_payload)

    ws_admin.send_text.assert_called_once()
    ws_public.send_text.assert_called_once()

    received_admin = json.loads(ws_admin.send_text.call_args[0][0])
    received_public = json.loads(ws_public.send_text.call_args[0][0])

    assert received_admin == admin_payload
    assert received_public == public_payload


@pytest.mark.asyncio
async def test_broadcast_differentiated_tenant_isolation():
    """Verify messages on one channel do not leak to another channel."""
    mgr = ConnectionManager()
    ch1 = "org_1_queue_1"
    ch2 = "org_2_queue_2"

    ws1 = _mock_ws()
    ws2 = _mock_ws()

    await mgr.connect(ch1, ws1, is_admin=False)
    await mgr.connect(ch2, ws2, is_admin=False)

    msg_payload = {"type": "queue_update", "queue": 1}
    await mgr.broadcast_differentiated(ch1, msg_payload, msg_payload)

    ws1.send_text.assert_called_once()
    ws2.send_text.assert_not_called()


@pytest.mark.asyncio
async def test_broadcast_differentiated_dead_socket_cleanup():
    """Verify dead sockets are cleaned up on send_text exception."""
    mgr = ConnectionManager()
    channel = "org_1_queue_1"

    ws_alive = _mock_ws()
    ws_dead = _mock_ws()
    ws_dead.send_text.side_effect = RuntimeError("Broken pipe")

    await mgr.connect(channel, ws_alive, is_admin=False)
    await mgr.connect(channel, ws_dead, is_admin=False)
    assert mgr.active_count(channel) == 2

    await mgr.broadcast_differentiated(channel, '{"type": "ok"}', '{"type": "ok"}')

    assert mgr.active_count(channel) == 1
    ws_alive.send_text.assert_called_once_with('{"type": "ok"}')
