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
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError
from sqlalchemy import select

from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal
from app.models.queue import Queue
from app.models.user import User
from app.websocket.connection_manager import manager
from app.websocket.helpers import build_queue_snapshot

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_live_websocket_user(payload: dict, db) -> User | None:
    """Validate revocable account state for long-lived WebSocket access."""
    try:
        user_id = uuid.UUID(str(payload.get("sub")))
    except (TypeError, ValueError):
        return None

    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None or not user.is_active or user.role != payload.get("role"):
        return None
    if user.is_first_login and not payload.get("is_impersonating", False):
        return None

    iat_raw = payload.get("iat")
    if user.password_changed_at:
        if iat_raw is None:
            return None
        password_changed_at = user.password_changed_at
        if password_changed_at.tzinfo is None:
            password_changed_at = password_changed_at.replace(tzinfo=timezone.utc)
        if int(iat_raw) < int(password_changed_at.timestamp()):
            return None

    if user.parent_organization_id and user.role != "super_admin":
        from app.models.subscription import Subscription
        from app.services.entitlement_service import effective_status

        subscription = await db.scalar(
            select(Subscription).where(
                Subscription.parent_organization_id == user.parent_organization_id
            )
        )
        if subscription is not None and effective_status(subscription) not in {"trialing", "active"}:
            return None
    return user


async def _can_operate_queue(payload: dict, queue: Queue, db) -> bool:
    user = await _get_live_websocket_user(payload, db)
    if user is None:
        return False
    if user.role == "super_admin":
        return True
    if user.role == "organization_admin":
        from app.models.organization import Organization

        queue_parent_id = await db.scalar(
            select(Organization.parent_organization_id).where(Organization.id == queue.org_id)
        )
        return bool(queue_parent_id and queue_parent_id == user.parent_organization_id)
    return user.role in {"admin", "branch_admin", "staff"} and user.org_id == queue.org_id


async def _allow_websocket_handshake(websocket: WebSocket, *, prefix: str, limit: int = 20) -> bool:
    """Small Redis-backed fixed-window guard for WebSocket handshakes."""
    forwarded = websocket.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    client_ip = forwarded or (websocket.client.host if websocket.client else "unknown")
    try:
        from app.redis.client import get_redis

        redis = get_redis()
        bucket = int(datetime.now(timezone.utc).timestamp() // 60)
        key = f"rate:ws:{prefix}:{client_ip}:{bucket}"
        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, 65)
        count, _ = await pipe.execute()
        return int(count) <= limit
    except Exception as exc:
        logger.error("WebSocket rate limiter unavailable | prefix=%s err=%s", prefix, exc)
        return True


@router.websocket("/queues/{queue_id}")
async def websocket_queue(
    websocket: WebSocket,
    queue_id: uuid.UUID,
    token: Optional[str] = Query(default=None, alias="token"),
    auth: Optional[str] = Query(default=None, alias="auth"),
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

    if not await _allow_websocket_handshake(websocket, prefix="queue"):
        await websocket.close(code=4429, reason="Too many connection attempts")
        return

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
                    select(Queue).where(Queue.id == queue_id, Queue.is_deleted == False)
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
        # Browser WebSockets cannot attach an Authorization header. New clients
        # send the JWT in the first frame so credentials never enter URLs/logs.
        if auth == "frame" and not token:
            try:
                auth_message = await asyncio.wait_for(websocket.receive_json(), timeout=5)
                if auth_message.get("type") != "auth" or not isinstance(auth_message.get("token"), str):
                    await websocket.close(code=4401, reason="Authentication required")
                    return
                token = auth_message["token"]
            except (asyncio.TimeoutError, ValueError, TypeError):
                await websocket.close(code=4401, reason="Authentication required")
                return

        is_admin = False
        admin_payload: dict | None = None
        if token:
            try:
                payload = decode_access_token(token)
                async with AsyncSessionLocal() as db:
                    is_admin = await _can_operate_queue(payload, queue, db)
                if not is_admin:
                    await websocket.close(code=4403, reason="Queue access denied")
                    return
                admin_payload = payload
                logger.info(
                    "WS admin connected | user=%s channel=%s",
                    payload.get("sub"),
                    channel,
                )
            except Exception as exc:
                logger.warning("WS token validation failed | queue=%s err=%s", queue_id, exc)
                await websocket.close(code=4401, reason="Invalid or expired credentials")
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
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60)
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                # JWT validation at handshake is not enough for a long-lived
                # connection: an account may be disabled, its password may be
                # changed, or a trial may expire while the socket is open.
                if admin_payload is not None:
                    async with AsyncSessionLocal() as db:
                        if not await _can_operate_queue(admin_payload, queue, db):
                            await websocket.close(code=4403, reason="Queue access expired")
                            break
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
    token: Optional[str] = Query(default=None, alias="token"),
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
        # Authenticate in the first frame to keep JWTs out of request URLs and
        # reverse-proxy/access logs. The query token remains temporarily
        # accepted for backwards compatibility with an already-open old client.
        try:
            if not token:
                auth_message = await asyncio.wait_for(websocket.receive_json(), timeout=5)
                if auth_message.get("type") != "auth" or not isinstance(auth_message.get("token"), str):
                    await websocket.close(code=4401, reason="Authentication required")
                    return
                token = auth_message["token"]

            payload = decode_access_token(token)
            async with AsyncSessionLocal() as db:
                user = await _get_live_websocket_user(payload, db)
            if user is None or user.role not in {"admin", "branch_admin", "staff", "organization_admin", "super_admin"}:
                await websocket.close(code=4403, reason="Notification access denied")
                return

            target_org_id = str(user.org_id or user.parent_organization_id) if (user.org_id or user.parent_organization_id) else None

            if not target_org_id:
                await websocket.close(code=4403, reason="User must belong to an organization")
                return
            
            logger.info("WS notifications connected | user=%s org=%s", payload.get("sub"), target_org_id)
        except (JWTError, asyncio.TimeoutError, ValueError, TypeError):
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
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60)
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                async with AsyncSessionLocal() as db:
                    live_user = await _get_live_websocket_user(payload, db)
                if live_user is None:
                    await websocket.close(code=4403, reason="Notification access expired")
                    break
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

    if not await _allow_websocket_handshake(websocket, prefix="pairing"):
        await websocket.close(code=4429, reason="Too many connection attempts")
        return

    code = code.strip().upper()
    if len(code) != 6 or not code.isalpha() or not code.isascii():
        await websocket.close(code=4400, reason="Invalid pairing code")
        return
    
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
        logger.error("WebSocket pairing error | err=%s", exc)
    finally:
        try:
            from app.monitoring.metrics import WS_DISCONNECTIONS_TOTAL
            WS_DISCONNECTIONS_TOTAL.inc()
        except Exception:
            pass
