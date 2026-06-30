"""
app/websocket/pubsub.py
Redis Pub/Sub layer — decouples WebSocket broadcasts from DB operations.

AUDIT FIXES:
  - Subscriber loop now re-subscribes after connection loss
  - Added REDIS_RECONNECTS metric tracking
  - Socket timeout increased to avoid false disconnects

Architecture:
  1. Queue engine commits DB change
  2. Publishes event to Redis channel
  3. ALL backend instances receive the event (via subscriber loop)
  4. Each instance broadcasts to its local WebSocket clients

This makes the system horizontally scalable.
"""
import asyncio
import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis
from redis.asyncio import Redis
from redis.asyncio.client import PubSub

from app.core.config import get_settings
from app.websocket.connection_manager import manager

logger = logging.getLogger(__name__)
settings = get_settings()

# Module-level subscriber state
_pubsub: Optional[PubSub] = None
_subscriber_task: Optional[asyncio.Task] = None
_redis_sub: Optional[Redis] = None

# Channel patterns
QUEUE_CHANNEL_PATTERN = "org_*_queue_*"
NOTIFICATIONS_CHANNEL_PATTERN = "org_*_notifications"


# ─────────────────────────────────────────────────────────────────────────────
# Publishing (called after DB commit in token_service)
# ─────────────────────────────────────────────────────────────────────────────

async def publish_queue_update(
    redis_client: Redis,
    *,
    channel: str,
    payload: dict[str, Any],
) -> None:
    """
    Publish a queue state change to the Redis channel.
    MUST be called AFTER the DB transaction commits.
    """
    message = json.dumps(payload)
    try:
        await redis_client.publish(channel, message)
        logger.debug("Published to %s | %s", channel, message[:120])
        # Track publish metric
        try:
            from app.monitoring.metrics import REDIS_PUBLISH_TOTAL
            REDIS_PUBLISH_TOTAL.inc()
        except Exception:
            pass
    except Exception as exc:
        # Publishing failure must NOT crash the API request
        logger.error("Redis publish failed | channel=%s err=%s", channel, exc)
        try:
            from app.monitoring.metrics import REDIS_PUBLISH_ERRORS
            REDIS_PUBLISH_ERRORS.inc()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Subscriber loop (runs as background task in each backend instance)
# ─────────────────────────────────────────────────────────────────────────────

async def _subscriber_loop() -> None:
    """
    Infinite loop: reads Redis Pub/Sub messages and broadcasts
    them to local WebSocket clients via the ConnectionManager.

    AUDIT FIX: Reconnects and re-subscribes on connection loss,
    rather than using a stale PubSub object.
    """
    logger.info("Redis subscriber loop started | patterns=%s, %s", QUEUE_CHANNEL_PATTERN, NOTIFICATIONS_CHANNEL_PATTERN)

    while True:
        redis_conn = None
        pubsub = None
        try:
            # Create a fresh connection for subscribing
            redis_conn = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=30,  # AUDIT: Increased from 5 to avoid false timeouts
            )
            pubsub = redis_conn.pubsub()
            await pubsub.psubscribe(QUEUE_CHANNEL_PATTERN, NOTIFICATIONS_CHANNEL_PATTERN)
            logger.info("Subscriber connected and subscribed to %s, %s", QUEUE_CHANNEL_PATTERN, NOTIFICATIONS_CHANNEL_PATTERN)

            # Read messages
            while True:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=1.0
                )
                if message is None:
                    await asyncio.sleep(0.01)
                    continue

                if message["type"] not in ("pmessage", "message"):
                    continue

                channel = message.get("channel", "")
                if isinstance(channel, bytes):
                    channel = channel.decode("utf-8")

                data_raw = message.get("data", b"{}")
                if isinstance(data_raw, bytes):
                    data_raw = data_raw.decode("utf-8")

                try:
                    payload = json.loads(data_raw)
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON on channel %s", channel)
                    continue

                if payload.get("type") == "queue_update" and "public" in payload and "admin" in payload:
                    # Give the public snapshot a type as well
                    payload["public"]["type"] = "queue_update"
                    payload["admin"]["type"] = "queue_update"
                    await manager.broadcast_differentiated(channel, payload["public"], payload["admin"])
                else:
                    await manager.broadcast(channel, payload)

        except asyncio.CancelledError:
            logger.info("Subscriber loop cancelled — shutting down")
            break
        except Exception as exc:
            # AUDIT FIX: Track reconnect metric
            try:
                from app.monitoring.metrics import REDIS_RECONNECTS
                REDIS_RECONNECTS.inc()
            except Exception:
                pass
            logger.error("Subscriber connection lost: %s — reconnecting in 3s", exc)
            await asyncio.sleep(3)
        finally:
            # Clean up before reconnecting
            if pubsub:
                try:
                    await pubsub.punsubscribe(QUEUE_CHANNEL_PATTERN, NOTIFICATIONS_CHANNEL_PATTERN)
                    await pubsub.aclose()
                except Exception:
                    pass
            if redis_conn:
                try:
                    await redis_conn.aclose()
                except Exception:
                    pass


# ─────────────────────────────────────────────────────────────────────────────
# Lifecycle (called from main.py lifespan)
# ─────────────────────────────────────────────────────────────────────────────

async def start_subscriber() -> None:
    """
    Start the background subscriber task.
    AUDIT FIX: Task now manages its own Redis connections internally,
    so it can reconnect cleanly on failure.
    """
    global _subscriber_task
    _subscriber_task = asyncio.create_task(_subscriber_loop())
    logger.info("Subscriber task started")


async def stop_subscriber() -> None:
    """Cancel the subscriber task on shutdown."""
    global _subscriber_task

    if _subscriber_task:
        _subscriber_task.cancel()
        try:
            await _subscriber_task
        except asyncio.CancelledError:
            pass

    logger.info("Redis subscriber stopped")
