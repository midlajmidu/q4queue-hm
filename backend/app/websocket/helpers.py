"""
app/websocket/helpers.py
Queue state snapshot builder — sent on connect and after every update.

Provides a single function to build the full queue state that prevents
UI desync on reconnection.
"""
import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.queue import Queue
from app.models.token import Token, TokenStatus

logger = logging.getLogger(__name__)


async def build_queue_snapshot(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    is_admin: bool = False,
) -> dict:
    """
    Build a complete queue state snapshot for WebSocket clients.

    Sent:
      - On initial WebSocket connect (prevents desync)
      - After every queue state change (via Redis publish)

    Returns dict with:
      type, queue_id, queue_name, prefix, current_serving,
      waiting_count, last_called, recent_tokens
    """
    # ── Queue metadata ─────────────────────────────────────────────
    q_result = await db.execute(select(Queue).where(Queue.id == queue_id))
    queue = q_result.scalar_one_or_none()
    if queue is None:
        return {"type": "error", "message": "Queue not found"}

    # ── Currently serving ──────────────────────────────────────────
    serving_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.serving,
        )
        .order_by(Token.token_number.desc())
        .limit(1)
    )
    serving_token = serving_result.scalar_one_or_none()
    current_serving = serving_token.token_number if serving_token else 0
    
    serving_details = None
    if serving_token:
        serving_details = {
            "token_number": serving_token.token_number,
            "customer_name": serving_token.customer_name,
        }
        if is_admin:
            # Mask sensitive data for public screens
            serving_details["customer_age"] = serving_token.customer_age
            serving_details["customer_phone"] = serving_token.customer_phone

    # ── Waiting count ──────────────────────────────────────────────
    waiting_result = await db.execute(
        select(func.count())
        .select_from(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.waiting,
        )
    )
    waiting_count = waiting_result.scalar_one()

    # ── Recent tokens (last 5 served/serving/skipped/deleted for display) ───
    recent_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status.in_([TokenStatus.serving, TokenStatus.done, TokenStatus.skipped, TokenStatus.deleted]),
        )
        .order_by(Token.token_number.desc())
        .limit(5)
    )
    
    recent_tokens = []
    for t in recent_result.scalars().all():
        token_data = {
            "token_number": t.token_number,
            "status": t.status.value,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "served_at": t.served_at.isoformat() if t.served_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "customer_name": t.customer_name,
        }
        if is_admin:
            token_data["customer_age"] = t.customer_age
            token_data["customer_phone"] = t.customer_phone
        recent_tokens.append(token_data)

    # ── Waiting tokens (all of them, or limit 50 for large queues) ──
    waiting_tokens_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.waiting,
        )
        .order_by(Token.token_number.asc())
        .limit(50)
    )
    
    waiting_tokens = []
    for t in waiting_tokens_result.scalars().all():
        token_data = {
            "id": str(t.id),
            "token_number": t.token_number,
            "status": t.status.value,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "served_at": t.served_at.isoformat() if t.served_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "customer_name": t.customer_name,
        }
        if is_admin:
            token_data["customer_age"] = t.customer_age
            token_data["customer_phone"] = t.customer_phone
        waiting_tokens.append(token_data)

    return {
        "type": "queue_snapshot",
        "queue_id": str(queue_id),
        "session_id": str(queue.token_session_id),   # ← token session isolation key
        "queue_name": queue.name,
        "prefix": queue.prefix,
        "announcement": queue.announcement,
        "is_active": queue.is_active,
        "current_serving": current_serving,
        "serving_details": serving_details,
        "waiting_count": waiting_count,
        "last_called": current_serving,
        "total_issued": queue.current_token_number,
        "recent_tokens": recent_tokens,
        "waiting_tokens": waiting_tokens,
    }
