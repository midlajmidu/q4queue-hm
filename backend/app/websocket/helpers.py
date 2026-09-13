"""
app/websocket/helpers.py
Queue state snapshot builder — sent on connect and after every update.

Provides a single function to build the full queue state that prevents
UI desync on reconnection.
"""
import logging
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

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
    
    from app.models.parent_organization import ParentOrganization
    parent_org = None
    if org and org.parent_organization_id:
        parent_org_result = await db.execute(select(ParentOrganization).where(ParentOrganization.id == org.parent_organization_id))
        parent_org = parent_org_result.scalar_one_or_none()
    
    # ── Currently serving ──────────────────────────────────────────
    # ── All serving tokens (multi-lane: all N lanes) ───────────────
    all_serving_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.session_id == queue.token_session_id,
            Token.status == TokenStatus.serving,
        )
        .order_by(Token.assigned_line.asc().nullsfirst(), Token.token_number.asc())
    )
    serving_rows = list(all_serving_result.scalars().all())
    serving_token = max(serving_rows, key=lambda token: token.token_number, default=None)
    current_serving = serving_token.token_number if serving_token else (queue.starting_sequence - 1)
    serving_details = None
    if serving_token:
        serving_details = {
            "token_number": serving_token.token_number,
            "customer_name": serving_token.customer_name,
            "assigned_line": serving_token.assigned_line,
            "called_via_invite": serving_token.called_via_invite,
            "entry_type": getattr(serving_token, "entry_type", "qr"),
            "pax_count": getattr(serving_token, "pax_count", 1),
        }
        if is_admin:
            serving_details["customer_age"] = serving_token.customer_age
            serving_details["customer_phone"] = serving_token.customer_phone
            serving_details["companion_names"] = serving_token.companion_names
            serving_details["custom_data"] = getattr(serving_token, "custom_data", None)
            serving_details["field_schema"] = getattr(serving_token, "field_schema", None)

    all_serving_tokens = []
    for t in serving_rows:
        sd = {
            "id": str(t.id),
            "token_number": t.token_number,
            "customer_name": t.customer_name,
            "assigned_line": t.assigned_line,
            "called_via_invite": t.called_via_invite,
            "served_at": t.served_at.isoformat() if t.served_at else None,
            "entry_type": getattr(t, "entry_type", "qr"),
            "pax_count": getattr(t, "pax_count", 1),
            "shared_lines": getattr(t, "shared_lines", []),
            "completed_lines": getattr(t, "completed_lines", []),
        }
        if is_admin:
            sd["customer_phone"] = t.customer_phone
            sd["customer_age"] = t.customer_age
            sd["custom_data"] = getattr(t, "custom_data", None)
            sd["field_schema"] = getattr(t, "field_schema", None)
        all_serving_tokens.append(sd)

    # ── Waiting count ──────────────────────────────────────────────
    counts_result = await db.execute(
        select(
            func.count(Token.id).filter(Token.status == TokenStatus.waiting),
            func.count(Token.id).filter(Token.status == TokenStatus.done),
            func.count(Token.id).filter(Token.status == TokenStatus.skipped),
            func.count(Token.id).filter(Token.status == TokenStatus.deleted),
            func.count(Token.id),
        ).where(
            Token.queue_id == queue_id,
            Token.session_id == queue.token_session_id,
        )
    )
    waiting_count, done_count, skipped_count, deleted_count, issued_count = counts_result.one()

    # ── Total Issued count & Session info for current session ──
    session_date_str = None
    is_past_session = False
    session = None
    if queue.token_session_id:
        from app.models.session import Session
        session = await db.get(Session, queue.token_session_id)
        if session:
            session_date_str = session.session_date.isoformat()
            tz_str = org.timezone if org and org.timezone else "Asia/Kolkata"
            local_now = datetime.now(ZoneInfo(tz_str))
            from app.core.tz_helpers import queue_business_date
            today = queue_business_date(local_now, queue.open_time, queue.close_time)
            if session.session_date < today:
                is_past_session = True

    else:
        issued_count = 0

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
            "pax_count": getattr(t, "pax_count", 1),
        }
        if is_admin:
            token_data["id"] = str(t.id)
            token_data["customer_age"] = t.customer_age
            token_data["customer_phone"] = t.customer_phone
            token_data["companion_names"] = t.companion_names
            token_data["removed_by"] = getattr(t, "removed_by", None)
            token_data["custom_data"] = getattr(t, "custom_data", None)
            token_data["field_schema"] = getattr(t, "field_schema", None)
        recent_tokens.append(token_data)

    # ── Waiting tokens (all of them, or limit 50 for large queues) ──
    waiting_tokens = []
    if is_admin:
        waiting_tokens_result = await db.execute(
            select(Token)
            .where(
                Token.queue_id == queue_id,
                Token.session_id == queue.token_session_id,
                Token.status == TokenStatus.waiting,
            )
            .order_by(Token.token_number.asc())
            .limit(200)
        )
        waiting_rows = waiting_tokens_result.scalars().all()
    else:
        waiting_rows = []

    for t in waiting_rows:
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
            "pax_count": getattr(t, "pax_count", 1),
        }
        if is_admin:
            token_data["customer_age"] = t.customer_age
            token_data["customer_phone"] = t.customer_phone
            token_data["companion_names"] = t.companion_names
            token_data["removed_by"] = getattr(t, "removed_by", None)
            token_data["custom_data"] = getattr(t, "custom_data", None)
            token_data["field_schema"] = getattr(t, "field_schema", None)
        waiting_tokens.append(token_data)

    # ── Skipped tokens (all of them, or limit 50) ──
    skipped_tokens = []
    if is_admin:
        skipped_tokens_result = await db.execute(
            select(Token)
            .where(
                Token.queue_id == queue_id,
                Token.session_id == queue.token_session_id,
                Token.status == TokenStatus.skipped,
            )
            .order_by(Token.token_number.desc())
            .limit(200)
        )
        skipped_rows = skipped_tokens_result.scalars().all()
    else:
        skipped_rows = []

    for t in skipped_rows:
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
            token_data["custom_data"] = getattr(t, "custom_data", None)
        skipped_tokens.append(token_data)

    # ── Deleted tokens (all of them, or limit 50) ──
    deleted_tokens = []
    if is_admin:
        deleted_tokens_result = await db.execute(
            select(Token)
            .where(
                Token.queue_id == queue_id,
                Token.session_id == queue.token_session_id,
                Token.status == TokenStatus.deleted,
            )
            .order_by(Token.token_number.desc())
            .limit(200)
        )
        deleted_rows = deleted_tokens_result.scalars().all()
    else:
        deleted_rows = []

    for t in deleted_rows:
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
            "pax_count": getattr(t, "pax_count", 1),
        }
        if is_admin:
            token_data["customer_age"] = t.customer_age
            token_data["customer_phone"] = t.customer_phone
            token_data["companion_names"] = t.companion_names
            token_data["removed_by"] = getattr(t, "removed_by", None)
            token_data["custom_data"] = getattr(t, "custom_data", None)
        deleted_tokens.append(token_data)

    # Public display sockets must never become a customer-directory API. They
    # receive operational ticket numbers only; authenticated admin sockets keep
    # the detailed records needed to operate the line.
    if not is_admin:
        if serving_details:
            serving_details = {
                key: serving_details.get(key)
                for key in ("token_number", "assigned_line", "called_via_invite", "entry_type", "pax_count")
            }
        all_serving_tokens = [
            {
                key: item.get(key)
                for key in ("token_number", "assigned_line", "called_via_invite", "entry_type", "pax_count", "shared_lines", "completed_lines")
            }
            for item in all_serving_tokens
        ]
        recent_tokens = [
            {
                key: item.get(key)
                for key in ("token_number", "status", "assigned_line", "called_via_invite")
            }
            for item in recent_tokens
        ]
        waiting_tokens = []
        skipped_tokens = []
        deleted_tokens = []

    session_active = bool(session and session.is_active)
    session_paused = bool(session and session.is_paused)
    effective_active = bool(
        queue.is_active and not queue.is_deleted and session_active
    )
    effective_paused = bool(queue.is_paused or session_paused)

    return {
        "type": "queue_snapshot",
        "queue_id": str(queue_id),
        "session_id": str(queue.token_session_id) if queue.token_session_id else None,
        "queue_name": queue.name,
        "prefix": queue.prefix,
        "announcement": queue.announcement,
        "is_active": effective_active,
        "is_paused": effective_paused,
        "queue_is_active": queue.is_active,
        "queue_is_paused": queue.is_paused,
        "session_is_active": session_active,
        "session_is_paused": session_paused,
        "session_date": session_date_str,
        "is_past_session": is_past_session,
        "is_current_session": session_is_current,
        "within_operating_hours": within_hours,
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
        "total_issued": issued_count,
        "recent_tokens": recent_tokens,
        "waiting_tokens": waiting_tokens,
        "skipped_tokens": skipped_tokens,
        "deleted_tokens": deleted_tokens,
        "waiting_tokens_truncated": bool(is_admin and waiting_count > len(waiting_tokens)),
        "skipped_tokens_truncated": bool(is_admin and skipped_count > len(skipped_tokens)),
        "deleted_tokens_truncated": bool(is_admin and deleted_count > len(deleted_tokens)),
        "org_logo_url": None,
        "org_brand_color": None,
        "custom_fields": getattr(queue, "custom_fields", None),
        "enable_shared_tokens": getattr(org, "enable_shared_tokens", False) or getattr(parent_org, "enable_shared_tokens", False),
    }


async def build_queue_snapshots_dual(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
) -> dict:
    """
    Build BOTH public and admin queue state snapshots in a SINGLE database pass.
    Executes database queries ONCE (14 queries instead of 28), then redacts
    sensitive PII in Python memory for the public snapshot.

    Returns:
      {
        "public": <public_snapshot_dict>,
        "admin": <admin_snapshot_dict>
      }
    """
    admin_snapshot = await build_queue_snapshot(db, queue_id=queue_id, is_admin=True)
    if admin_snapshot.get("type") == "error":
        return {"public": admin_snapshot, "admin": admin_snapshot}

    import copy
    public_snapshot = copy.deepcopy(admin_snapshot)

    # Redact PII for public broadcast view
    if public_snapshot.get("serving_details"):
        public_snapshot["serving_details"] = {
            k: public_snapshot["serving_details"].get(k)
            for k in ("token_number", "assigned_line", "called_via_invite", "entry_type", "pax_count")
            if k in public_snapshot["serving_details"]
        }

    public_snapshot["all_serving_tokens"] = [
        {
            k: item.get(k)
            for k in ("token_number", "assigned_line", "called_via_invite", "entry_type", "pax_count", "shared_lines", "completed_lines")
            if k in item
        }
        for item in public_snapshot.get("all_serving_tokens", [])
    ]

    public_snapshot["recent_tokens"] = [
        {
            k: item.get(k)
            for k in ("token_number", "status", "assigned_line", "called_via_invite")
            if k in item
        }
        for item in public_snapshot.get("recent_tokens", [])
    ]

    public_snapshot["waiting_tokens"] = []
    public_snapshot["skipped_tokens"] = []
    public_snapshot["deleted_tokens"] = []
    public_snapshot["waiting_tokens_truncated"] = False
    public_snapshot["skipped_tokens_truncated"] = False
    public_snapshot["deleted_tokens_truncated"] = False

    return {
        "public": public_snapshot,
        "admin": admin_snapshot,
    }
