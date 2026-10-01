"""
app/services/plivo_sync_service.py
Synchronizes Call Detail Records (CDR) from Plivo REST API into the local call_logs table.
Ensures calls initiated via WebRTC or Plivo SDK are accurately tracked with their authoritative
durations, status, and billable amounts even if client webhooks were interrupted or blocked.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import uuid
import httpx
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.call_log import CallLog
from app.models.organization import Organization
from app.models.user import User
from app.models.token import Token

logger = logging.getLogger(__name__)

# Cache timestamp to prevent spamming Plivo API on rapid page reloads
_LAST_SYNC_TIME: Dict[str, datetime] = {}
SYNC_COOLDOWN_SECONDS = 10


async def sync_plivo_calls(db: AsyncSession, org_id: Optional[uuid.UUID] = None, force: bool = False) -> int:
    """
    Fetch recent outbound call logs from Plivo REST API and synchronize them into call_logs.
    """
    settings = get_settings()
    auth_id = settings.PLIVO_AUTH_ID
    auth_token = settings.PLIVO_AUTH_TOKEN

    if not auth_id or not auth_token:
        logger.warning("Plivo credentials not configured; skipping call sync.")
        return 0

    cache_key = str(org_id) if org_id else "global"
    now = datetime.now(timezone.utc)
    last_sync = _LAST_SYNC_TIME.get(cache_key)

    if not force and last_sync and (now - last_sync).total_seconds() < SYNC_COOLDOWN_SECONDS:
        logger.debug("Plivo sync skipped due to cooldown (%s seconds)", SYNC_COOLDOWN_SECONDS)
        return 0

    _LAST_SYNC_TIME[cache_key] = now

    url = f"https://api.plivo.com/v1/Account/{auth_id}/Call/"
    raw_calls: List[Dict[str, Any]] = []

    try:
        async with httpx.AsyncClient(auth=(auth_id, auth_token), timeout=15.0) as client:
            offset = 0
            page_size = 50
            # Fetch up to 250 calls across pages to cover historical calls
            while offset < 250:
                resp = await client.get(url, params={"limit": page_size, "offset": offset, "call_direction": "outbound"})
                if resp.status_code == 200:
                    data = resp.json()
                    objects = data.get("objects", [])
                    if not objects:
                        break
                    raw_calls.extend(objects)
                    if len(objects) < page_size or not data.get("meta", {}).get("next"):
                        break
                    offset += page_size
                else:
                    logger.error("Plivo API call sync error: status=%s, resp=%s", resp.status_code, resp.text)
                    break
    except Exception as exc:
        logger.error("Failed to connect to Plivo API for call sync: %s", exc)
        return 0

    if not raw_calls:
        return 0

    # Filter for customer outbound calls (ignoring internal SIP legs)
    customer_calls = [
        c for c in raw_calls 
        if c.get("call_direction") == "outbound" and not str(c.get("to_number", "")).startswith("sip:")
    ]

    # Target organization if explicitly requested (e.g. branch-specific sync)
    target_org_id = org_id

    # Find a default caller user for this org (branch admin or staff)
    user_res = await db.execute(
        select(User.id).where(User.org_id == target_org_id).order_by(User.created_at.asc()).limit(1)
    )
    default_user_id = user_res.scalars().first()

    synced_count = 0

    for c in customer_calls:
        raw_to = str(c.get("to_number") or "").strip()
        if not raw_to or raw_to.startswith("sip:"):
            continue

        phone = f"+{raw_to}" if not raw_to.startswith("+") else raw_to
        dur = int(float(c.get("call_duration") or 0))
        ring = int(float(c.get("ring_duration") or 0))
        state = str(c.get("call_state") or "").upper().strip()

        if state == "ANSWER" or dur > 0:
            call_status = "completed"
        elif state == "BUSY":
            call_status = "busy"
        elif ring < 5:
            call_status = "cancelled"
        else:
            call_status = "no_answer"

        init_str = c.get("initiation_time")
        if init_str:
            try:
                created_at = datetime.fromisoformat(init_str)
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
            except Exception:
                created_at = now
        else:
            created_at = now

        # Calls end after they initiate, so CallLog.created_at is typically initiation_time + ring + talk
        time_margin_before = timedelta(minutes=5)
        time_margin_after = timedelta(hours=2)

        phone_variants = list(set([phone, phone.lstrip("+"), f"+{phone.lstrip('+')}"]))

        # First try matching by target_org_id if specified, or across all orgs if global sync
        existing_log = None
        conditions = [
            CallLog.customer_phone.in_(phone_variants),
            CallLog.created_at >= created_at - time_margin_before,
            CallLog.created_at <= created_at + time_margin_after,
        ]
        if org_id:
            conditions.append(CallLog.organization_id == target_org_id)

        existing_res = await db.execute(
            select(CallLog).where(and_(*conditions)).order_by(CallLog.created_at.desc()).limit(1)
        )
        existing_log = existing_res.scalars().first()

        # Fallback for phone matching if duration is 0
        if not existing_log and target_org_id:
            fallback_res = await db.execute(
                select(CallLog).where(
                    and_(
                        CallLog.organization_id == target_org_id,
                        CallLog.customer_phone.in_(phone_variants),
                        CallLog.duration_seconds == 0,
                        CallLog.created_at >= created_at - timedelta(hours=12),
                        CallLog.created_at <= created_at + timedelta(hours=12),
                    )
                ).order_by(CallLog.created_at.desc()).limit(1)
            )
            existing_log = fallback_res.scalars().first()

        if existing_log:
            # Update duration and status if it was incomplete
            updated = False
            if dur > 0 and (existing_log.duration_seconds == 0 or dur > existing_log.duration_seconds):
                existing_log.duration_seconds = dur
                existing_log.call_status = "completed"
                updated = True
            if ring > 0 and (existing_log.ring_duration_seconds == 0 or ring > existing_log.ring_duration_seconds):
                existing_log.ring_duration_seconds = ring
                updated = True
            if updated:
                synced_count += 1
        # Never insert an unmatched or phantom call from the shared Plivo account into a branch!
        # Every branch call must be originated by that branch's user/webhook.

    if synced_count > 0:
        await db.commit()
        logger.info("Synced %d call records from Plivo for org %s", synced_count, target_org_id)

    return synced_count
