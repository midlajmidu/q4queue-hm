import os
import json
import uuid
import logging
from datetime import datetime, date
import asyncio

from sqlalchemy import select, delete, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.user import User
from app.models.queue import Queue
from app.models.session import Session
from app.models.token import Token
from app.models.message import Message
from app.models.branch_backup import BranchBackup
from app.models.org_backup import BackupStatus
from app.core.config import get_settings

logger = logging.getLogger(__name__)

BACKUP_DIR = "/app/backups"

def row_to_dict(row):
    """Serialize a SQLAlchemy model instance to a dictionary."""
    d = {}
    for column in row.__table__.columns:
        val = getattr(row, column.name)
        if isinstance(val, uuid.UUID):
            d[column.name] = str(val)
        elif isinstance(val, (datetime, date)):
            d[column.name] = val.isoformat()
        else:
            d[column.name] = val
    return d

async def create_branch_backup(org_id: uuid.UUID, db: AsyncSession, is_safety_backup: bool = False) -> BranchBackup:
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if not org:
        raise ValueError(f"Organization {org_id} not found")
        
    slug = org.slug
    prefix = "SAFETY_" if is_safety_backup else ""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}branch_{slug}-{timestamp}.q4branchbackup"
    filepath = os.path.join(BACKUP_DIR, filename)
    
    # Register the backup as pending
    backup_record = BranchBackup(
        org_id=org_id,
        filename=filename,
        size_bytes=0,
        status=BackupStatus.pending
    )
    if not is_safety_backup:
        db.add(backup_record)
        await db.commit()
        await db.refresh(backup_record)

    try:
        # Fetch branch users
        users = (await db.scalars(select(User).where(User.org_id == org_id))).all()
        
        # Queues, Sessions, Tokens, Messages
        queues = (await db.scalars(select(Queue).where(Queue.org_id == org_id))).all()
        sessions = (await db.scalars(select(Session).where(Session.org_id == org_id))).all()
        tokens = (await db.scalars(select(Token).where(Token.org_id == org_id))).all()
        messages = (await db.scalars(select(Message).where(Message.org_id == org_id))).all()

        data = {
            "organizations": [row_to_dict(org)],
            "users": [row_to_dict(r) for r in users],
            "queues": [row_to_dict(r) for r in queues],
            "sessions": [row_to_dict(r) for r in sessions],
            "tokens": [row_to_dict(r) for r in tokens],
            "messages": [row_to_dict(r) for r in messages],
        }
            
        with open(filepath, "w") as f:
            json.dump(data, f)
            
        size_bytes = os.path.getsize(filepath)
        
        if not is_safety_backup:
            backup_record.status = BackupStatus.success
            backup_record.size_bytes = size_bytes
            await db.commit()
            
        return backup_record
        
    except Exception as e:
        logger.error(f"Backup failed for org {org_id}: {e}")
        if not is_safety_backup:
            backup_record.status = BackupStatus.failed
            await db.commit()
        raise e

async def restore_branch_backup(org_id: uuid.UUID, filepath: str, db: AsyncSession):
    """
    Restore data from a .q4branchbackup file. WARNING: This wipes existing branch data!
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Backup file {filepath} not found.")
        
    logger.warning(f"Initiating full RESTORE for Branch (Org) {org_id} from {filepath}")
    
    # 1. Create a safety backup
    await create_branch_backup(org_id, db, is_safety_backup=True)
    
    # 2. Parse backup data
    with open(filepath, "r") as f:
        data = json.load(f)
        
    # --- SECURITY HARDENING: ISOLATION VALIDATION ---
    str_org_id = str(org_id)
    
    for d in data.get("users", []):
        if d.get("org_id") and str(d["org_id"]) != str_org_id:
            raise ValueError("Security validation failed: Invalid org_id in users backup.")

    for d in data.get("queues", []):
        if d.get("org_id") and str(d["org_id"]) != str_org_id:
            raise ValueError("Security validation failed: Invalid org_id in queues backup.")

    for d in data.get("sessions", []):
        if d.get("org_id") and str(d["org_id"]) != str_org_id:
            raise ValueError("Security validation failed: Invalid org_id in sessions backup.")

    for d in data.get("tokens", []):
        if d.get("org_id") and str(d["org_id"]) != str_org_id:
            raise ValueError("Security validation failed: Invalid org_id in tokens backup.")

    for d in data.get("messages", []):
        if d.get("org_id") and str(d["org_id"]) != str_org_id:
            raise ValueError("Security validation failed: Invalid org_id in messages backup.")
    # -------------------------------------------------------
        
    def dict_to_row(model_class, d):
        kwargs = {}
        for col in model_class.__table__.columns:
            if col.name in d:
                val = d[col.name]
                if val is not None:
                    if col.type.python_type is datetime:
                        val = datetime.fromisoformat(val)
                    elif col.type.python_type is date:
                        val = date.fromisoformat(val)
                    elif col.type.python_type is uuid.UUID:
                        val = uuid.UUID(val)
                kwargs[col.name] = val
        return model_class(**kwargs)

    try:
        # Delete existing child data in reverse dependency order
        await db.execute(delete(Token).where(Token.org_id == org_id))
        await db.execute(delete(Message).where(Message.org_id == org_id))
        await db.execute(delete(Queue).where(Queue.org_id == org_id))
        await db.execute(delete(Session).where(Session.org_id == org_id))
        await db.execute(delete(User).where(User.org_id == org_id))
        
        # Organization - Do not delete, just update fields
        org_data_list = data.get("organizations", [])
        if org_data_list:
            org_data = org_data_list[0]
            existing_org = await db.scalar(select(Organization).where(Organization.id == org_id))
            if existing_org:
                for col in Organization.__table__.columns:
                    if col.name in org_data and col.name not in ('id', 'parent_organization_id'):
                        val = org_data[col.name]
                        if val is not None:
                            if col.type.python_type is datetime:
                                val = datetime.fromisoformat(val)
                            elif col.type.python_type is date:
                                val = date.fromisoformat(val)
                            elif col.type.python_type is uuid.UUID:
                                val = uuid.UUID(val)
                        setattr(existing_org, col.name, val)
        await db.flush()
        
        # Now Insert in topological order
        db.add_all([dict_to_row(User, d) for d in data.get("users", [])])
        await db.flush()
        
        db.add_all([dict_to_row(Session, d) for d in data.get("sessions", [])])
        db.add_all([dict_to_row(Queue, d) for d in data.get("queues", [])])
        await db.flush()
        
        tokens = [dict_to_row(Token, d) for d in data.get("tokens", [])]
        for i in range(0, len(tokens), 1000):
            db.add_all(tokens[i:i+1000])
            await db.flush()
            
        messages = [dict_to_row(Message, d) for d in data.get("messages", [])]
        for i in range(0, len(messages), 1000):
            db.add_all(messages[i:i+1000])
            await db.flush()
            
        await db.commit()
        logger.warning(f"Restore for Branch {org_id} completed successfully.")
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Restore failed! Transaction rolled back. {e}")
        raise e

async def cleanup_old_branch_backups(db: AsyncSession, days: int = 30):
    import time
    if not os.path.exists(BACKUP_DIR):
        return
        
    now = time.time()
    retention_period = days * 86400
    
    # 1. Delete files
    for filename in os.listdir(BACKUP_DIR):
        if not filename.endswith(".q4branchbackup"):
            continue
        filepath = os.path.join(BACKUP_DIR, filename)
        if os.path.isfile(filepath):
            file_age = now - os.path.getmtime(filepath)
            if file_age > retention_period:
                try:
                    os.remove(filepath)
                    logger.info(f"Deleted old branch backup file: {filename}")
                except Exception as e:
                    logger.error(f"Failed to delete {filename}: {e}")
                    
    # 2. Delete DB records older than 30 days
    from datetime import timedelta
    cutoff = datetime.now() - timedelta(days=days)
    await db.execute(delete(BranchBackup).where(BranchBackup.created_at < cutoff))
    await db.commit()
