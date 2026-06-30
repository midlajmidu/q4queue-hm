"""
app/websocket/connection_manager.py
In-memory WebSocket connection manager.

Tracks active connections per queue channel.
Thread-safe via asyncio locks.
Designed for horizontal scaling with Redis Pub/Sub (this handles LOCAL broadcast only).
"""
import asyncio
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections grouped by channel.

    Channel format: org_{org_id}_queue_{queue_id}

    Methods:
      connect(channel, ws)    — register a client
      disconnect(channel, ws) — remove a client
      broadcast(channel, msg) — send to ALL clients in channel
      get_channel(org_id, queue_id) — build channel name
      active_count(channel)   — number of live sockets
    """

    def __init__(self) -> None:
        # channel → set of WebSocket connections
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._admin_connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    @staticmethod
    def get_channel(org_id: str, queue_id: str) -> str:
        """Build the tenant-isolated channel name."""
        return f"org_{org_id}_queue_{queue_id}"

    @staticmethod
    def get_notification_channel(org_id: str) -> str:
        """Build the tenant-isolated notification channel name."""
        return f"org_{org_id}_notifications"

    async def connect(self, channel: str, websocket: WebSocket, is_admin: bool = False) -> None:
        """Accept and register a WebSocket client."""
        await websocket.accept()
        async with self._lock:
            self._connections[channel].add(websocket)
            if is_admin:
                self._admin_connections[channel].add(websocket)
        logger.info(
            "WS connected | channel=%s clients=%d admin=%s",
            channel,
            len(self._connections[channel]),
            is_admin
        )

    async def disconnect(self, channel: str, websocket: WebSocket) -> None:
        """Remove a WebSocket client. Safe to call multiple times."""
        async with self._lock:
            if channel in self._connections:
                self._connections[channel].discard(websocket)
                if not self._connections[channel]:
                    del self._connections[channel]
            if channel in self._admin_connections:
                self._admin_connections[channel].discard(websocket)
                if not self._admin_connections[channel]:
                    del self._admin_connections[channel]
        try:
            await websocket.close()
        except Exception:
            pass

    async def broadcast(self, channel: str, message: dict[str, Any]) -> None:
        """Send JSON to all clients in a specific channel."""
        if channel not in self._connections:
            return

        # Snapshot the set to avoid RuntimeError if disconnected during iteration
        async with self._lock:
            sockets = list(self._connections[channel])

        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect(channel, ws)

    async def broadcast_differentiated(self, channel: str, public_message: dict, admin_message: dict) -> None:
        """Send admin JSON to admin clients, public JSON to public clients."""
        if channel not in self._connections:
            return

        async with self._lock:
            sockets = list(self._connections[channel])
            admin_sockets = set(self._admin_connections.get(channel, set()))

        for ws in sockets:
            try:
                if ws in admin_sockets:
                    await ws.send_json(admin_message)
                else:
                    await ws.send_json(public_message)
            except Exception:
                await self.disconnect(channel, ws)

    def active_count(self, channel: str) -> int:
        """Return how many live sockets are in a channel."""
        return len(self._connections.get(channel, set()))

    @property
    def total_connections(self) -> int:
        """Total WebSocket connections across all channels."""
        return sum(len(s) for s in self._connections.values())

    @property
    def active_channels(self) -> list[str]:
        """List of channels with at least one client."""
        return list(self._connections.keys())


# ── Module-level singleton ────────────────────────────────────────────────────
manager = ConnectionManager()
