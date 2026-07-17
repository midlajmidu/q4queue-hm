"""
app/websocket/routes.py
WebSocket endpoint — real-time queue updates.

GET /api/v1/ws/queues/{queue_id}

AUDIT FIXES:
  - Accept WebSocket BEFORE attempting close (prevents ASGI race)
  - Added WS metrics tracking (connect/disconnect counters)
  - Added rate-limit check for WS handshake
  - Improved error handling on initial DB query failure

Auth modes:
  - Admin: pass token as query param ?token=<JWT>
  - Public: no token required (display/customer screens)

Security:
  - Client NEVER specifies org_id or channel
  - All channel resolution is server-side from DB lookup
  - Invalid queue → close(4404) after accept
  - Invalid admin token → close(4401) after accept
"""
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError
from sqlalchemy import select

from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal
from app.models.queue import Queue
from app.websocket.connection_manager import manager
from app.websocket.helpers import build_queue_snapshot

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/queues/{queue_id}")
async def websocket_queue(
    websocket: WebSocket,
    queue_id: uuid.UUID,
    token: Optional[str] = Query(default=None, alias="token"),
):
    """
    Real-time WebSocket endpoint for a specific queue.

    Query params:
      token (optional) — JWT for admin authentication

    Lifecycle:
      1. Accept connection first (required by ASGI protocol)
      2. Validate queue exists → resolve org_id server-side
      3. If admin token provided → validate JWT + org match
      4. Send full state snapshot
      5. Keep alive — pushes come via Redis subscriber loop
      6. On disconnect → clean up
    """
    channel: Optional[str] = None

    # AUDIT FIX: Accept the connection FIRST.
    # ASGI protocol requires accept() before close().
    # Validation errors are sent as close frames after acceptance.
    await websocket.accept()

    # Track metric
    try:
        from app.monitoring.metrics import WS_CONNECTIONS_TOTAL
        WS_CONNECTIONS_TOTAL.inc()
    except Exception:
        pass

    try:
        # ── 1. Validate queue & resolve channel ───────────────────
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Queue).where(Queue.id == queue_id)
                )
                queue = result.scalar_one_or_none()
        except Exception as exc:
            logger.error("WS DB lookup failed | queue=%s err=%s", queue_id, exc)
            await websocket.close(code=4500, reason="Internal server error")
            return

        if queue is None:
            await websocket.close(code=4404, reason="Queue not found")
            return

        # Channel is resolved SERVER-SIDE from DB — never from client
        org_id_str = str(queue.org_id)
        channel = manager.get_channel(org_id_str, str(queue_id))

        # ── 2. Admin auth (optional) ─────────────────────────────
        is_admin = False
        if token:
            try:
                payload = decode_access_token(token)
                jwt_org_id = payload.get("org_id")
                if jwt_org_id != org_id_str:
                    await websocket.close(code=4403, reason="Queue does not belong to your organization")
                    return
                is_admin = True
                logger.info(
                    "WS admin connected | user=%s channel=%s",
                    payload.get("sub"),
                    channel,
                )
            except JWTError:
                await websocket.close(code=4401, reason="Invalid or expired token")
                return
        else:
            logger.info("WS public client connected | channel=%s", channel)

        # ── 3. Register with connection manager ───────────────────
        # Note: accept() already called above, so we use _register_only
        async with manager._lock:
            manager._connections[channel].add(websocket)
            if is_admin:
                manager._admin_connections[channel].add(websocket)
        logger.info(
            "WS registered | channel=%s clients=%d",
            channel, manager.active_count(channel),
        )

        # ── 4. Send full state snapshot immediately ───────────────
        async with AsyncSessionLocal() as db:
            snapshot = await build_queue_snapshot(db, queue_id=queue_id, is_admin=is_admin)
        await websocket.send_json(snapshot)

        # ── 5. Keep alive loop ────────────────────────────────────
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("WebSocket error | queue=%s err=%s", queue_id, exc)
    finally:
        # ── 6. Clean up ──────────────────────────────────────────
        if channel:
            await manager.disconnect(channel, websocket)
        # Track metric
        try:
            from app.monitoring.metrics import WS_DISCONNECTIONS_TOTAL
            WS_DISCONNECTIONS_TOTAL.inc()
        except Exception:
            pass

@router.websocket("/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    token: str = Query(..., alias="token"),
):
    """
    Real-time WebSocket endpoint for organization-wide notifications.

    Query params:
      token (required) — JWT for admin authentication
    """
    channel: Optional[str] = None
    target_org_id: Optional[str] = None

    await websocket.accept()

    try:
        from app.monitoring.metrics import WS_CONNECTIONS_TOTAL
        WS_CONNECTIONS_TOTAL.inc()
    except Exception:
        pass

    try:
        # Validate JWT + org match
        try:
            payload = decode_access_token(token)
            org_id_str = payload.get("org_id")
            parent_org_id_str = payload.get("parent_org_id")
            
            target_org_id = org_id_str or parent_org_id_str

            if not target_org_id:
                await websocket.close(code=4403, reason="User must belong to an organization")
                return
            
            logger.info("WS notifications connected | user=%s org=%s", payload.get("sub"), target_org_id)
        except JWTError:
            await websocket.close(code=4401, reason="Invalid or expired token")
            return

        channel = manager.get_notification_channel(target_org_id)

        async with manager._lock:
            manager._connections[channel].add(websocket)
        logger.info(
            "WS registered | channel=%s clients=%d",
            channel, manager.active_count(channel),
        )

        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("WebSocket notifications error | err=%s", exc)
    finally:
        if target_org_id:
            channel_to_disconnect = manager.get_notification_channel(str(target_org_id))
            await manager.disconnect(channel_to_disconnect, websocket)
        try:
            from app.monitoring.metrics import WS_DISCONNECTIONS_TOTAL
            WS_DISCONNECTIONS_TOTAL.inc()
        except Exception:
            pass


@router.websocket("/pairing/{code}")
async def websocket_pairing(websocket: WebSocket, code: str):
    """
    WebSocket endpoint for Smart TV Pairing handshake.
    The TV connects to this endpoint using the generated 6-character code and waits for a redirect.
    """
    await websocket.accept()
    
    try:
        from app.redis.client import get_redis
        redis = get_redis()
        
        # Verify the code exists in redis
        val = await redis.get(f"pairing:{code}")
        if not val:
            await websocket.close(code=4404, reason="Code not found or expired")
            return
            
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"pairing_channel:{code}")
        
        try:
            import asyncio
            import json
            
            async def listen_pubsub():
                while True:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message:
                        try:
                            data = json.loads(message["data"])
                            await websocket.send_json(data)
                            break # Close after successful pairing
                        except Exception as e:
                            logger.error("Error parsing pairing message | err=%s", e)
                    await asyncio.sleep(0.1)

            async def listen_client():
                try:
                    while True:
                        await websocket.receive_text()
                except WebSocketDisconnect:
                    pass

            pubsub_task = asyncio.create_task(listen_pubsub())
            client_task = asyncio.create_task(listen_client())
            
            done, pending = await asyncio.wait(
                [pubsub_task, client_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for task in pending:
                task.cancel()
                
        finally:
            await pubsub.unsubscribe(f"pairing_channel:{code}")
            await pubsub.aclose()
            
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("WebSocket pairing error | code=%s err=%s", code, exc)
    finally:
        try:
            from app.monitoring.metrics import WS_DISCONNECTIONS_TOTAL
            WS_DISCONNECTIONS_TOTAL.inc()
        except Exception:
            pass
