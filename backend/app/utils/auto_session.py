import asyncio
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from app.models.session import Session
from app.schemas.session import SessionCreate
from app.services.session_service import create_session

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
                # Create a new session for the current date
                # Local time for session date
                local_now = datetime.now(ZoneInfo("Asia/Kolkata"))
                session_date = local_now.date()
                
                # Verify we don't already have one for this date
                existing_today = await db.execute(
                    select(Session).where(
                        Session.org_id == org.id,
                        Session.session_date == session_date
                    )
                )
                if not existing_today.scalar_one_or_none():
                    logger.info(f"Auto-creating new session for org {org.slug} at {current_time_str}")
                    
                    data = SessionCreate(
                        session_date=session_date,
                        title=f"Auto Session ({local_now.strftime('%b %d')})"
                    )
                    
                    await create_session(db, org_id=org.id, data=data)
                else:
                    logger.info(f"Skipping auto-session for org {org.slug} - session already exists for {session_date}")
            except Exception as e:
                logger.error(f"Failed to auto-rollover session for org {org.slug}: {e}")
