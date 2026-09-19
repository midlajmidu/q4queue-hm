import asyncio
import logging
import uuid
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo
from sqlalchemy import select, update, func

from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from app.models.queue import Queue
from app.models.session import Session
from app.models.token import Token, TokenStatus
from app.services.session_service import get_or_create_active_session
from app.core.tz_helpers import queue_business_date

logger = logging.getLogger(__name__)

async def check_and_close_expired_sessions():
    """No-op: sessions remain active until explicitly closed by staff."""
    pass


async def auto_session_task():
    """Background task that runs every minute to check for automated session rollovers and expirations."""
    logger.info("Auto-session background task started.")
    while True:
        try:
            from app.redis.client import get_redis
            lock_minute = datetime.utcnow().strftime("%Y%m%d%H%M")
            acquired = await get_redis().set(
                f"scheduler:auto_session:{lock_minute}", "1", ex=90, nx=True
            )
            if acquired:
                await check_and_rollover_sessions()
                await check_and_close_expired_sessions()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Error in auto_session_task: %s", e, exc_info=True)

        now = datetime.now()
        sleep_seconds = 60 - now.second
        await asyncio.sleep(max(1, sleep_seconds))

def _parse_hhmm(time_str: Optional[str]) -> Optional[tuple[int, int]]:
    if not time_str:
        return None
    try:
        parts = time_str.strip().split(":")
        if len(parts) >= 2:
            return (int(parts[0]), int(parts[1]))
    except Exception:
        pass
    return None

async def rollover_queue_session(db, queue: Queue, org: Organization, force: bool = False):
    """Rollover or create active session for a single queue."""
    tz_str = org.timezone if org and org.timezone else "Asia/Kolkata"
    try:
        local_now = datetime.now(ZoneInfo(tz_str))
    except Exception:
        local_now = datetime.now(ZoneInfo("Asia/Kolkata"))

    today = queue_business_date(local_now, queue.open_time, queue.close_time)

    # Fetch current active session
    active_session = await db.scalar(
        select(Session).where(
            Session.queue_id == queue.id,
            Session.is_active == True
        )
    )

    if active_session:
        # Sessions remain active until explicitly ended by staff
        if not force:
            return active_session

        active_session.is_active = False
        active_session.is_paused = False

        # Check if session for today already exists
        existing_today_session = await db.scalar(
            select(Session).where(
                Session.queue_id == queue.id,
                Session.session_date == today
            )
        )

        if existing_today_session:
            new_session = existing_today_session
            new_session.is_active = True
        else:
            new_session = Session(
                org_id=org.id,
                queue_id=queue.id,
                session_date=today,
                title=today.strftime("%Y-%m-%d"),
                is_active=True
            )
            db.add(new_session)
            await db.flush()

        queue.token_session_id = new_session.id
        queue.current_token_number = queue.starting_sequence - 1
        queue.total_served = 0
        await db.commit()
        return new_session
    else:
        # No active session exists, get or create session for today
        return await get_or_create_active_session(db, queue_id=queue.id, org_id=org.id)

async def check_and_rollover_sessions(target_org_id: Optional[uuid.UUID] = None, force: bool = False):
    """Create today's sessions at each enabled branch's local rollover time."""
    utc_now = datetime.now(ZoneInfo("UTC"))
    async with AsyncSessionLocal() as db:
        stmt = select(Organization).where(Organization.is_active == True)
        if target_org_id:
            stmt = stmt.where(Organization.id == target_org_id)
        else:
            stmt = stmt.where(Organization.auto_session_enabled == True)

        result = await db.execute(stmt)
        orgs = result.scalars().all()

        for org in orgs:
            try:
                try:
                    local_now = utc_now.astimezone(ZoneInfo(org.timezone or "Asia/Kolkata"))
                except Exception:
                    logger.error("Invalid timezone %r for org %s", org.timezone, org.id)
                    continue

                if not force:
                    target_time = _parse_hhmm(org.auto_session_time)
                    if not target_time:
                        continue
                    if (local_now.hour, local_now.minute) != target_time:
                        continue

                queues = await db.execute(
                    select(Queue).where(
                        Queue.org_id == org.id,
                        Queue.is_active == True,
                        Queue.is_deleted == False,
                    )
                )
                queue_list = queues.scalars().all()
                for queue in queue_list:
                    await rollover_or_create_queue_session(db, queue=queue, org=org, force=force)

                logger.info(
                    "Auto-session rollover completed | org=%s local_time=%s timezone=%s count=%d",
                    org.slug,
                    local_now.strftime("%H:%M"),
                    org.timezone or "Asia/Kolkata",
                    len(queue_list)
                )
            except Exception as e:
                await db.rollback()
                logger.error("Failed to auto-rollover sessions for org %s: %s", org.slug, e)

