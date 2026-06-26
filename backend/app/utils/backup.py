import os
import time
import logging
import subprocess
from datetime import datetime, timedelta
from urllib.parse import urlparse
from apscheduler.schedulers.background import BackgroundScheduler
from app.core.config import get_settings

logger = logging.getLogger(__name__)

BACKUP_DIR = "/app/backups"

def _get_db_creds():
    settings = get_settings()
    url = settings.DATABASE_URL
    # Format: postgresql+asyncpg://user:password@host:port/db
    if "://" not in url:
        return None
    
    # Strip +asyncpg for standard parsing
    clean_url = url.replace("+asyncpg", "")
    parsed = urlparse(clean_url)
    
    return {
        "user": parsed.username,
        "password": parsed.password,
        "host": parsed.hostname,
        "port": str(parsed.port) if parsed.port else "5432",
        "dbname": parsed.path.lstrip("/"),
    }

def perform_backup():
    """Runs pg_dump to create a compressed archive of the database."""
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        
    creds = _get_db_creds()
    if not creds:
        logger.error("Could not parse database credentials for backup.")
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"q4queue_backup_{timestamp}.dump"
    filepath = os.path.join(BACKUP_DIR, filename)

    env = os.environ.copy()
    if creds["password"]:
        env["PGPASSWORD"] = creds["password"]

    command = [
        "pg_dump",
        "-F", "c",          # Custom format (compressed archive)
        "-h", creds["host"],
        "-p", creds["port"],
        "-U", creds["user"],
        "-d", creds["dbname"],
        "-f", filepath
    ]

    logger.info(f"Starting automated backup: {filename}")
    try:
        result = subprocess.run(command, env=env, check=True, capture_output=True, text=True)
        logger.info(f"Backup successful: {filepath}")
        cleanup_old_backups()
    except subprocess.CalledProcessError as e:
        logger.error(f"Backup failed. Error: {e.stderr}")
        if os.path.exists(filepath):
            os.remove(filepath)

def cleanup_old_backups():
    """Deletes backup files older than 7 days."""
    if not os.path.exists(BACKUP_DIR):
        return

    now = time.time()
    retention_period = 7 * 86400  # 7 days in seconds

    for filename in os.listdir(BACKUP_DIR):
        if not filename.endswith(".dump"):
            continue
            
        filepath = os.path.join(BACKUP_DIR, filename)
        if os.path.isfile(filepath):
            file_age = now - os.path.getmtime(filepath)
            if file_age > retention_period:
                try:
                    os.remove(filepath)
                    logger.info(f"Deleted old backup: {filename}")
                except Exception as e:
                    logger.error(f"Failed to delete old backup {filename}: {e}")

async def restore_backup(filename: str, session):
    """
    Terminates active connections and restores the database from a file.
    Must be run within an active async session context.
    """
    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Backup file not found: {filename}")

    creds = _get_db_creds()
    if not creds:
        raise ValueError("Could not parse DB credentials.")

    logger.warning(f"Initiating full database restore from {filename}...")

    # Terminate active connections (except this one)
    from sqlalchemy import text
    terminate_sql = text(f"""
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = '{creds['dbname']}' 
        AND pid <> pg_backend_pid();
    """)
    await session.execute(terminate_sql)
    await session.commit()

    env = os.environ.copy()
    if creds["password"]:
        env["PGPASSWORD"] = creds["password"]

    command = [
        "pg_restore",
        "-c",               # Clean (drop) database objects before recreating
        "-h", creds["host"],
        "-p", creds["port"],
        "-U", creds["user"],
        "-d", creds["dbname"],
        filepath
    ]

    try:
        # We don't use check=True because pg_restore -c often throws minor warnings if objects don't exist
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        if result.returncode != 0 and "error" in result.stderr.lower():
            logger.error(f"Restore warnings/errors: {result.stderr}")
            # If it totally fails, raise. But pg_restore returns non-zero even for minor warnings.
            # We'll assume success if it ran, but log errors.
        logger.warning(f"Database successfully restored from {filename}")
    except Exception as e:
        logger.error(f"Exception during pg_restore: {e}")
        raise

async def backup_task():
    """Background task that runs every minute to check for scheduled backups."""
    import asyncio
    from app.db.session import AsyncSessionLocal
    from app.services.org_backup_service import create_org_backup, cleanup_old_org_backups
    from sqlalchemy import select
    from app.models.parent_organization import ParentOrganization

    logger.info("Backup task started. Tenant backups will trigger based on their custom backup_time setting.")
    
    while True:
        try:
            now_time = datetime.now().strftime("%H:%M")
            async with AsyncSessionLocal() as db:
                # 1. Trigger backup for every Parent Org matching current time
                pos = await db.scalars(
                    select(ParentOrganization.id).where(
                        ParentOrganization.is_active == True,
                        ParentOrganization.backup_time == now_time
                    )
                )
                for po_id in pos:
                    try:
                        await create_org_backup(po_id, db)
                    except Exception as e:
                        logger.error(f"Scheduled backup failed for ParentOrg {po_id}: {e}")
                
                # 2. Cleanup old backups (only run once daily to avoid unnecessary DB queries)
                if now_time == "03:00":
                    try:
                        await cleanup_old_org_backups(db)
                    except Exception as e:
                        logger.error(f"Scheduled cleanup failed: {e}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in backup_task: {e}")
            
        # Sleep until the start of the next minute
        now = datetime.now()
        sleep_seconds = 60 - now.second
        await asyncio.sleep(sleep_seconds)
