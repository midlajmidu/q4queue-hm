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
from app.models.organization import Organization

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

    # ── Org Branding ───────────────────────────────────────────────
    org_result = await db.execute(select(Organization).where(Organization.id == queue.org_id))
    org = org_result.scalar_one_or_none()
    
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
    current_serving = serving_token.token_number if serving_token else (queue.starting_sequence - 1)
    
    serving_details = None
    if serving_token:
        serving_details = {
            "token_number": serving_token.token_number,
            "customer_name": serving_token.customer_name,
            "assigned_line": serving_token.assigned_line,
            "called_via_invite": serving_token.called_via_invite,
            "entry_type": getattr(serving_token, "entry_type", "qr"),
        }
        if is_admin:
            # Mask sensitive data for public screens
            serving_details["customer_age"] = serving_token.customer_age
            serving_details["customer_phone"] = serving_token.customer_phone
            serving_details["companion_names"] = serving_token.companion_names

    # ── All serving tokens (multi-lane: all N lanes) ───────────────
    all_serving_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.serving,
        )
        .order_by(Token.assigned_line.asc().nullsfirst(), Token.token_number.asc())
    )
    all_serving_tokens = []
    for t in all_serving_result.scalars().all():
        sd = {
            "id": str(t.id),
            "token_number": t.token_number,
            "customer_name": t.customer_name,
            "assigned_line": t.assigned_line,
            "called_via_invite": t.called_via_invite,
            "served_at": t.served_at.isoformat() if t.served_at else None,
            "entry_type": getattr(t, "entry_type", "qr"),
        }
        if is_admin:
            sd["customer_phone"] = t.customer_phone
            sd["customer_age"] = t.customer_age
        all_serving_tokens.append(sd)

    # ── Waiting count ──────────────────────────────────────────────
    waiting_result = await db.execute(
        select(func.count())
        .select_from(Token)
        .where(
            Token.queue_id == queue_id,
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.waiting,
        )
    )
    waiting_count = waiting_result.scalar_one()

    # ── Done and Skipped counts ──
    done_result = await db.execute(
        select(func.count(Token.id)).where(
            Token.queue_id == queue_id,
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.done,
        )
    )
    done_count = done_result.scalar_one()

    skipped_result = await db.execute(
        select(func.count(Token.id)).where(
            Token.queue_id == queue_id,
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.skipped,
        )
    )
    skipped_count = skipped_result.scalar_one()

    # ── Recent tokens (last 5 served/serving/skipped/deleted for display) ───
    recent_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.session_id == queue.token_session_id,
            Token.status.in_([TokenStatus.serving, TokenStatus.done, TokenStatus.skipped, TokenStatus.deleted]),
        )
        .order_by(Token.token_number.desc())
        .limit(50)
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
            "assigned_line": t.assigned_line,
            "called_via_invite": t.called_via_invite,
            "entry_type": getattr(t, "entry_type", "qr"),
            "skipped_at": getattr(t, "skipped_at", None).isoformat() if getattr(t, "skipped_at", None) else None,
            "deleted_at": getattr(t, "deleted_at", None).isoformat() if getattr(t, "deleted_at", None) else None,
            "recalled_at": getattr(t, "recalled_at", None).isoformat() if getattr(t, "recalled_at", None) else None,
        }
        if is_admin:
            token_data["customer_age"] = t.customer_age
            token_data["customer_phone"] = t.customer_phone
            token_data["companion_names"] = t.companion_names
            token_data["removed_by"] = getattr(t, "removed_by", None)
        recent_tokens.append(token_data)

    # ── Waiting tokens (all of them, or limit 50 for large queues) ──
    waiting_tokens_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.session_id == queue.token_session_id,
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
            "assigned_line": t.assigned_line,
            "called_via_invite": t.called_via_invite,
            "entry_type": getattr(t, "entry_type", "qr"),
            "skipped_at": getattr(t, "skipped_at", None).isoformat() if getattr(t, "skipped_at", None) else None,
            "deleted_at": getattr(t, "deleted_at", None).isoformat() if getattr(t, "deleted_at", None) else None,
            "recalled_at": getattr(t, "recalled_at", None).isoformat() if getattr(t, "recalled_at", None) else None,
        }
        if is_admin:
            token_data["customer_age"] = t.customer_age
            token_data["customer_phone"] = t.customer_phone
            token_data["companion_names"] = t.companion_names
            token_data["removed_by"] = getattr(t, "removed_by", None)
        waiting_tokens.append(token_data)

    # ── Skipped tokens (all of them, or limit 50) ──
    skipped_tokens_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.skipped,
        )
        .order_by(Token.token_number.desc())
        .limit(50)
    )
    
    skipped_tokens = []
    for t in skipped_tokens_result.scalars().all():
        token_data = {
            "id": str(t.id),
            "token_number": t.token_number,
            "status": t.status.value,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "served_at": t.served_at.isoformat() if t.served_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "customer_name": t.customer_name,
            "called_via_invite": t.called_via_invite,
            "entry_type": getattr(t, "entry_type", "qr"),
            "skipped_at": getattr(t, "skipped_at", None).isoformat() if getattr(t, "skipped_at", None) else None,
            "deleted_at": getattr(t, "deleted_at", None).isoformat() if getattr(t, "deleted_at", None) else None,
            "recalled_at": getattr(t, "recalled_at", None).isoformat() if getattr(t, "recalled_at", None) else None,
        }
        if is_admin:
            token_data["customer_age"] = t.customer_age
            token_data["customer_phone"] = t.customer_phone
            token_data["companion_names"] = t.companion_names
            token_data["removed_by"] = getattr(t, "removed_by", None)
        skipped_tokens.append(token_data)

    # ── Deleted tokens (all of them, or limit 50) ──
    deleted_tokens_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.deleted,
        )
        .order_by(Token.token_number.desc())
        .limit(50)
    )
    
    deleted_tokens = []
    for t in deleted_tokens_result.scalars().all():
        token_data = {
            "id": str(t.id),
            "token_number": t.token_number,
            "status": t.status.value,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "served_at": t.served_at.isoformat() if t.served_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "customer_name": t.customer_name,
            "called_via_invite": t.called_via_invite,
            "entry_type": getattr(t, "entry_type", "qr"),
            "skipped_at": getattr(t, "skipped_at", None).isoformat() if getattr(t, "skipped_at", None) else None,
            "deleted_at": getattr(t, "deleted_at", None).isoformat() if getattr(t, "deleted_at", None) else None,
            "recalled_at": getattr(t, "recalled_at", None).isoformat() if getattr(t, "recalled_at", None) else None,
        }
        if is_admin:
            token_data["customer_age"] = t.customer_age
            token_data["customer_phone"] = t.customer_phone
            token_data["companion_names"] = t.companion_names
            token_data["removed_by"] = getattr(t, "removed_by", None)
        deleted_tokens.append(token_data)

    return {
        "type": "queue_snapshot",
        "queue_id": str(queue_id),
        "session_id": str(queue.token_session_id),
        "queue_name": queue.name,
        "prefix": queue.prefix,
        "announcement": queue.announcement,
        "is_active": queue.is_active,
        "is_paused": queue.is_paused,
        "service_lines": queue.service_lines,
        "open_time": queue.open_time,
        "close_time": queue.close_time,
        "current_serving": current_serving,
        "serving_details": serving_details,
        "all_serving_tokens": all_serving_tokens,
        "waiting_count": waiting_count,
        "done_count": done_count,
        "skipped_count": skipped_count,
        "last_called": current_serving,
        "total_issued": queue.current_token_number - queue.starting_sequence + 1 if queue.current_token_number >= queue.starting_sequence else 0,
        "recent_tokens": recent_tokens,
        "waiting_tokens": waiting_tokens,
        "skipped_tokens": skipped_tokens,
        "deleted_tokens": deleted_tokens,
        "org_logo_url": org.logo_url if org else None,
        "org_brand_color": org.brand_color if org else None,
    }
