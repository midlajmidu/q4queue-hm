"""
tests/unit/test_connection_manager.py
Unit tests for the WebSocket ConnectionManager (no network needed).
"""
import asyncio
from unittest.mock import AsyncMock


from app.websocket.connection_manager import ConnectionManager


def _mock_ws(accept=True) -> AsyncMock:
    ws = AsyncMock()
    ws.send_json = AsyncMock()
    ws.send_text = AsyncMock()
    ws.accept = AsyncMock()
    return ws


class TestConnectionManager:

    def setup_method(self):
        self.mgr = ConnectionManager()

    def test_get_channel_format(self):
        ch = self.mgr.get_channel("org-abc", "queue-xyz")
        assert ch == "org_org-abc_queue_queue-xyz"

    async def test_connect_increments_count(self):
        ws = _mock_ws()
        await self.mgr.connect("ch1", ws)
        assert self.mgr.active_count("ch1") == 1

    async def test_disconnect_decrements_count(self):
        ws = _mock_ws()
        await self.mgr.connect("ch1", ws)
        await self.mgr.disconnect("ch1", ws)
        assert self.mgr.active_count("ch1") == 0

    async def test_disconnect_idempotent(self):
        ws = _mock_ws()
        await self.mgr.connect("ch1", ws)
        await self.mgr.disconnect("ch1", ws)
        await self.mgr.disconnect("ch1", ws)  # no crash
        assert self.mgr.active_count("ch1") == 0

    async def test_broadcast_reaches_all_clients(self):
        ws1 = _mock_ws()
        ws2 = _mock_ws()
        await self.mgr.connect("ch1", ws1)
        await self.mgr.connect("ch1", ws2)
        await self.mgr.broadcast("ch1", {"type": "test"})
        ws1.send_json.assert_called_once_with({"type": "test"})
        ws2.send_json.assert_called_once_with({"type": "test"})

    async def test_broadcast_removes_dead_sockets(self):
        ws_alive = _mock_ws()
        ws_dead = _mock_ws()
        ws_dead.send_json.side_effect = Exception("connection reset")

        await self.mgr.connect("ch1", ws_alive)
        await self.mgr.connect("ch1", ws_dead)
        assert self.mgr.active_count("ch1") == 2

        await self.mgr.broadcast("ch1", {"type": "test"})

        assert self.mgr.active_count("ch1") == 1
        ws_alive.send_json.assert_called_once()

    async def test_broadcast_to_empty_channel_no_error(self):
        await self.mgr.broadcast("nonexistent", {"type": "test"})
        # should not raise

    async def test_multiple_channels_isolated(self):
        ws1 = _mock_ws()
        ws2 = _mock_ws()
        await self.mgr.connect("ch_a", ws1)
        await self.mgr.connect("ch_b", ws2)

        await self.mgr.broadcast("ch_a", {"type": "a"})

        ws1.send_json.assert_called_once_with({"type": "a"})
        ws2.send_json.assert_not_called()

    async def test_total_connections(self):
        for i in range(5):
            await self.mgr.connect(f"ch_{i}", _mock_ws())
        assert self.mgr.total_connections == 5

    async def test_active_channels(self):
        await self.mgr.connect("ch_a", _mock_ws())
        await self.mgr.connect("ch_b", _mock_ws())
        channels = self.mgr.active_channels
        assert set(channels) == {"ch_a", "ch_b"}

    async def test_concurrent_connect_disconnect_safe(self):
        """20 concurrent connects and disconnects on the same channel."""
        sockets = [_mock_ws() for _ in range(20)]

        await asyncio.gather(
            *(self.mgr.connect("stress", ws) for ws in sockets)
        )
        assert self.mgr.active_count("stress") == 20

        await asyncio.gather(
            *(self.mgr.disconnect("stress", ws) for ws in sockets)
        )
        assert self.mgr.active_count("stress") == 0
