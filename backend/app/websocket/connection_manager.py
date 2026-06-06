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
        self._lock = asyncio.Lock()

    @staticmethod
    def get_channel(org_id: str, queue_id: str) -> str:
        """Build the tenant-isolated channel name."""
        return f"org_{org_id}_queue_{queue_id}"

    @staticmethod
    def get_notification_channel(org_id: str) -> str:
        """Build the tenant-isolated notification channel name."""
        return f"org_{org_id}_notifications"

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        """Accept and register a WebSocket client."""
        await websocket.accept()
        async with self._lock:
            self._connections[channel].add(websocket)
        logger.info(
            "WS connected | channel=%s clients=%d",
            channel,
            len(self._connections[channel]),
        )

    async def disconnect(self, channel: str, websocket: WebSocket) -> None:
        """Remove a WebSocket client. Safe to call multiple times."""
        async with self._lock:
            self._connections[channel].discard(websocket)
            if not self._connections[channel]:
                del self._connections[channel]
        logger.info("WS disconnected | channel=%s", channel)

    async def broadcast(self, channel: str, message: dict[str, Any]) -> None:
        """
        Send a JSON message to ALL connected WebSocket clients in a channel.
        Handles broken connections gracefully — removes dead sockets.
        """
        async with self._lock:
            sockets = list(self._connections.get(channel, set()))

        if not sockets:
            return

        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)

        # Clean up dead connections
        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections[channel].discard(ws)
                if not self._connections.get(channel):
                    self._connections.pop(channel, None)
            logger.debug(
                "Removed %d dead sockets from channel %s", len(dead), channel
            )

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
