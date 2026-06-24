import os
import json
import uuid
import logging
from datetime import datetime, date
import asyncio

from sqlalchemy import select, delete, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parent_organization import ParentOrganization
from app.models.organization import Organization
from app.models.user import User
from app.models.queue import Queue
from app.models.session import Session
from app.models.token import Token
from app.models.message import Message
from app.models.organization_announcement import OrganizationAnnouncement
from app.models.org_backup import OrgBackup, BackupStatus
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

async def create_org_backup(parent_org_id: uuid.UUID, db: AsyncSession, is_safety_backup: bool = False) -> OrgBackup:
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        
    po = await db.scalar(select(ParentOrganization).where(ParentOrganization.id == parent_org_id))
    if not po:
        raise ValueError(f"ParentOrganization {parent_org_id} not found")
        
    slug = po.slug
    prefix = "SAFETY_" if is_safety_backup else ""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}{slug}-{timestamp}.q4backup"
    filepath = os.path.join(BACKUP_DIR, filename)
    
    # Register the backup as pending (unless it's a safety backup, we might skip registering or just register it)
    backup_record = OrgBackup(
        parent_org_id=parent_org_id,
        filename=filename,
        size_bytes=0,
        status=BackupStatus.pending
    )
    if not is_safety_backup:
        db.add(backup_record)
        await db.commit()
        await db.refresh(backup_record)

    try:
        # Fetch all related data
        # Fetch organizations first to get org_ids for users that might be missing parent_organization_id
        organizations = (await db.scalars(select(Organization).where(Organization.parent_organization_id == parent_org_id))).all()
        org_ids = [org.id for org in organizations]
        
        if org_ids:
            users_query = select(User).where(
                or_(
                    User.parent_organization_id == parent_org_id,
                    User.org_id.in_(org_ids)
                )
            )
        else:
            users_query = select(User).where(User.parent_organization_id == parent_org_id)
            
        users = (await db.scalars(users_query)).all()

        data = {
            "parent_organizations": [row_to_dict(po)],
            "organizations": [row_to_dict(r) for r in organizations],
            "users": [row_to_dict(r) for r in users],
            "organization_announcements": [row_to_dict(r) for r in (await db.scalars(select(OrganizationAnnouncement).where(OrganizationAnnouncement.parent_organization_id == parent_org_id))).all()],
        }
        
        if org_ids:
            # Queues, Sessions, Tokens, Messages are tied to organizations
            # Some are tied to org_id directly, some indirectly.
            # Queues
            data["queues"] = [row_to_dict(r) for r in (await db.scalars(select(Queue).where(Queue.org_id.in_(org_ids)))).all()]
            queue_ids = [q["id"] for q in data["queues"]]
            
            # Sessions
            data["sessions"] = [row_to_dict(r) for r in (await db.scalars(select(Session).where(Session.org_id.in_(org_ids)))).all()]
            session_ids = [s["id"] for s in data["sessions"]]
            
            # Tokens
            if org_ids:
                data["tokens"] = [row_to_dict(r) for r in (await db.scalars(select(Token).where(Token.org_id.in_(org_ids)))).all()]
            else:
                data["tokens"] = []
                
            # Messages
            if org_ids:
                data["messages"] = [row_to_dict(r) for r in (await db.scalars(select(Message).where(Message.org_id.in_(org_ids)))).all()]
            else:
                data["messages"] = []
        else:
            data["queues"] = []
            data["sessions"] = []
            data["tokens"] = []
            data["messages"] = []
            
        with open(filepath, "w") as f:
            json.dump(data, f)
            
        size_bytes = os.path.getsize(filepath)
        
        if not is_safety_backup:
            backup_record.status = BackupStatus.success
            backup_record.size_bytes = size_bytes
            await db.commit()
            
        return backup_record
        
    except Exception as e:
        logger.error(f"Backup failed for parent org {parent_org_id}: {e}")
        if not is_safety_backup:
            backup_record.status = BackupStatus.failed
            await db.commit()
        raise e

async def restore_org_backup(parent_org_id: uuid.UUID, filepath: str, db: AsyncSession):
    """
    Restore data from a .q4backup file. WARNING: This wipes existing data!
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Backup file {filepath} not found.")
        
    logger.warning(f"Initiating full RESTORE for ParentOrg {parent_org_id} from {filepath}")
    
    # 1. Create a safety backup
    await create_org_backup(parent_org_id, db, is_safety_backup=True)
    
    # 2. Parse backup data
    with open(filepath, "r") as f:
        data = json.load(f)
        
    def dict_to_row(model_class, d):
        kwargs = {}
        for col in model_class.__table__.columns:
            if col.name in d:
                val = d[col.name]
                if val is not None:
                    # Convert datetimes and UUIDs back
                    if col.type.python_type is datetime:
                        val = datetime.fromisoformat(val)
                    elif col.type.python_type is date:
                        val = date.fromisoformat(val)
                    elif col.type.python_type is uuid.UUID:
                        val = uuid.UUID(val)
                kwargs[col.name] = val
        return model_class(**kwargs)

    try:
        # We must disable triggers or manually delete in correct order
        # Since this is SQLAlchemy AsyncSession, we will execute deletes in reverse dependency order
        
        # Get org_ids to delete tokens, queues, sessions, messages
        org_ids_res = await db.execute(select(Organization.id).where(Organization.parent_organization_id == parent_org_id))
        org_ids = [row[0] for row in org_ids_res]
        
        if org_ids:
            # Tokens
            await db.execute(delete(Token).where(Token.org_id.in_(org_ids)))
            
            # Queues (which cascades Messages if set up, but we'll delete messages first)
            await db.execute(delete(Message).where(Message.org_id.in_(org_ids)))
                
            await db.execute(delete(Queue).where(Queue.org_id.in_(org_ids)))
            await db.execute(delete(Session).where(Session.org_id.in_(org_ids)))
            
        # Organization announcements
        await db.execute(delete(OrganizationAnnouncement).where(OrganizationAnnouncement.parent_organization_id == parent_org_id))
        
        # Users
        if org_ids:
            await db.execute(delete(User).where(
                or_(
                    User.parent_organization_id == parent_org_id,
                    User.org_id.in_(org_ids)
                )
            ))
        else:
            await db.execute(delete(User).where(User.parent_organization_id == parent_org_id))
        
        # Organizations
        await db.execute(delete(Organization).where(Organization.parent_organization_id == parent_org_id))
        
        # ParentOrganization - Do not delete, just update fields to avoid cascading deletion of OrgBackups
        # Find the existing parent org and update it
        po_data_list = data.get("parent_organizations", [])
        if po_data_list:
            po_data = po_data_list[0]
            existing_po = await db.scalar(select(ParentOrganization).where(ParentOrganization.id == parent_org_id))
            if existing_po:
                for col in ParentOrganization.__table__.columns:
                    if col.name in po_data and col.name != 'id':
                        val = po_data[col.name]
                        if val is not None:
                            if col.type.python_type is datetime:
                                val = datetime.fromisoformat(val)
                            elif col.type.python_type is date:
                                val = date.fromisoformat(val)
                            elif col.type.python_type is uuid.UUID:
                                val = uuid.UUID(val)
                        setattr(existing_po, col.name, val)
        await db.flush()
        
        # Now Insert in topological order (skipping ParentOrganization)
        
        db.add_all([dict_to_row(Organization, d) for d in data.get("organizations", [])])
        await db.flush()
        
        db.add_all([dict_to_row(User, d) for d in data.get("users", [])])
        db.add_all([dict_to_row(OrganizationAnnouncement, d) for d in data.get("organization_announcements", [])])
        await db.flush()
        
        db.add_all([dict_to_row(Session, d) for d in data.get("sessions", [])])
        db.add_all([dict_to_row(Queue, d) for d in data.get("queues", [])])
        await db.flush()
        
        # Batch insert tokens & messages if many
        tokens = [dict_to_row(Token, d) for d in data.get("tokens", [])]
        for i in range(0, len(tokens), 1000):
            db.add_all(tokens[i:i+1000])
            await db.flush()
            
        messages = [dict_to_row(Message, d) for d in data.get("messages", [])]
        for i in range(0, len(messages), 1000):
            db.add_all(messages[i:i+1000])
            await db.flush()
            
        await db.commit()
        logger.warning(f"Restore for {parent_org_id} completed successfully.")
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Restore failed! Transaction rolled back. {e}")
        raise e

async def cleanup_old_org_backups(db: AsyncSession, days: int = 30):
    import time
    if not os.path.exists(BACKUP_DIR):
        return
        
    now = time.time()
    retention_period = days * 86400
    
    # 1. Delete files
    for filename in os.listdir(BACKUP_DIR):
        if not filename.endswith(".q4backup"):
            continue
        filepath = os.path.join(BACKUP_DIR, filename)
        if os.path.isfile(filepath):
            file_age = now - os.path.getmtime(filepath)
            if file_age > retention_period:
                try:
                    os.remove(filepath)
                    logger.info(f"Deleted old org backup file: {filename}")
                except Exception as e:
                    logger.error(f"Failed to delete {filename}: {e}")
                    
    # 2. Delete DB records older than 30 days
    from datetime import timedelta
    cutoff = datetime.now() - timedelta(days=days)
    await db.execute(delete(OrgBackup).where(OrgBackup.created_at < cutoff))
    await db.commit()
