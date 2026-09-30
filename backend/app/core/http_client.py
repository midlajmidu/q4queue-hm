"""
app/core/http_client.py
Shared, reusable HTTP client with connection pooling and keep-alive.
Avoids repeated TCP/TLS handshake overhead on external API calls (e.g., Meta WhatsApp API).
"""
import asyncio
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

_client: Optional[httpx.AsyncClient] = None
_client_loop: Optional[asyncio.AbstractEventLoop] = None
_lock = asyncio.Lock()


async def get_http_client() -> httpx.AsyncClient:
    """
    Get or create the shared, singleton AsyncClient bound to the current event loop.
    Configured with connection pooling and keep-alive.
    """
    global _client, _client_loop
    current_loop = asyncio.get_running_loop()

    if _client is None or _client.is_closed or _client_loop != current_loop:
        async with _lock:
            # Double-check inside lock
            if _client is None or _client.is_closed or _client_loop != current_loop:
                if _client is not None and not _client.is_closed:
                    try:
                        await _client.aclose()
                    except Exception:
                        pass
                _client = httpx.AsyncClient(
                    timeout=httpx.Timeout(15.0, connect=5.0),
                    limits=httpx.Limits(
                        max_keepalive_connections=20,
                        max_connections=100,
                        keepalive_expiry=30.0,
                    ),
                )
                _client_loop = current_loop
                logger.debug("Initialized shared httpx.AsyncClient with connection pooling")

    return _client


async def close_http_client() -> None:
    """
    Gracefully close the shared AsyncClient during application shutdown.
    """
    global _client, _client_loop
    async with _lock:
        if _client is not None and not _client.is_closed:
            try:
                await _client.aclose()
                logger.debug("Closed shared httpx.AsyncClient")
            except Exception as exc:
                logger.warning("Error closing shared HTTP client: %s", exc)
            finally:
                _client = None
                _client_loop = None
