import asyncio
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from app.models.session import Session
from app.models.queue import Queue
from app.services.session_service import get_or_create_active_session

logger = logging.getLogger(__name__)

async def auto_session_task():
    """Background task that runs every minute to check for automated session rollovers."""
    logger.info("Auto-session background task started.")
    while True:
        try:
            await check_and_rollover_sessions()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in auto_session_task: {e}")
        
        # Sleep until the start of the next minute
        now = datetime.now()
        sleep_seconds = 60 - now.second
        await asyncio.sleep(sleep_seconds)

async def check_and_rollover_sessions():
    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    current_time_str = now.strftime("%H:%M")
    
    async with AsyncSessionLocal() as db:
        # Find all organizations that have auto session enabled and the time matches
        logger.info(f"Checking auto sessions for time: {current_time_str}")
        result = await db.execute(
            select(Organization).where(
                Organization.is_active == True,
                Organization.auto_session_enabled == True,
                Organization.auto_session_time == current_time_str
            )
        )
        orgs = result.scalars().all()
        
        for org in orgs:
            try:
                queues = await db.execute(select(Queue).where(Queue.org_id == org.id, Queue.is_active == True))
                for queue in queues.scalars().all():
                    await get_or_create_active_session(db, queue_id=queue.id, org_id=org.id)
                logger.info(f"Auto-session rollover completed for org {org.slug} at {current_time_str}")
            except Exception as e:
                logger.error(f"Failed to auto-rollover sessions for org {org.slug}: {e}")
