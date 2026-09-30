import os
import json
import uuid
import logging
from datetime import datetime, date
import asyncio
import hashlib

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

BACKUP_DIR = getattr(get_settings(), "BACKUP_DIR", "/app/backups")

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

CHUNK_SIZE = 2000

class IncrementalBackupWriter:
    """Incrementally writes JSON backup to a file buffer without loading all data into memory."""
    def __init__(self, file_handle):
        self.file_handle = file_handle
        self.first_section = True
        self.hasher = hashlib.sha256()
        self._first_item = True
        self._write("{\n")

    def _write(self, text: str):
        self.file_handle.write(text)
        self.hasher.update(text.encode("utf-8"))

    def write_eager_section(self, key: str, rows_dict: list):
        if not self.first_section:
            self._write(",\n")
        self.first_section = False
        self._write(f'  "{key}": ')
        self._write(json.dumps(rows_dict))

    def start_array_section(self, key: str):
        if not self.first_section:
            self._write(",\n")
        self.first_section = False
        self._write(f'  "{key}": [')
        self._first_item = True

    def write_array_chunk(self, items_dict: list):
        for item in items_dict:
            if not self._first_item:
                self._write(",\n    ")
            else:
                self._write("\n    ")
                self._first_item = False
            self._write(json.dumps(item))

    def end_array_section(self):
        if not self._first_item:
            self._write("\n  ]")
        else:
            self._write("]")

    def finalize(self) -> str:
        self._write("\n}\n")
        self.file_handle.flush()
        return self.hasher.hexdigest()

async def create_org_backup(parent_org_id: uuid.UUID, db: AsyncSession, is_safety_backup: bool = False) -> OrgBackup:
    if not os.path.exists(BACKUP_DIR):
        await asyncio.to_thread(os.makedirs, BACKUP_DIR, exist_ok=True)
        
    po = await db.scalar(select(ParentOrganization).where(ParentOrganization.id == parent_org_id))
    if not po:
        raise ValueError(f"ParentOrganization {parent_org_id} not found")
        
    slug = po.slug
    prefix = "SAFETY_" if is_safety_backup else ""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}{slug}-{timestamp}.q4backup"
    filepath = os.path.join(BACKUP_DIR, filename)
    temp_filepath = f"{filepath}.tmp"
    
    # Acquire per-tenant lock if Redis is available
    redis = None
    lock_key = f"lock:backup:parent_org:{parent_org_id}"
    lock_token = str(uuid.uuid4())
    lock_acquired = False
    try:
        from app.redis.client import get_redis
        redis = get_redis()
        lock_acquired = await redis.set(lock_key, lock_token, ex=300, nx=True)
        if not lock_acquired:
            raise RuntimeError(f"Backup already in progress for ParentOrganization {parent_org_id}")
    except (RuntimeError, ConnectionError) as e:
        if "already in progress" in str(e):
            raise
        logger.warning(f"Redis unavailable for backup locking on {parent_org_id}: {e}")
        redis = None
        lock_acquired = False

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

    file_handle = None
    try:
        if os.path.exists(temp_filepath):
            await asyncio.to_thread(os.remove, temp_filepath)
        file_handle = await asyncio.to_thread(open, temp_filepath, "w", encoding="utf-8")
        writer = IncrementalBackupWriter(file_handle)

        # 1. Fetch metadata and branch IDs
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
        announcements = (await db.scalars(select(OrganizationAnnouncement).where(OrganizationAnnouncement.parent_organization_id == parent_org_id))).all()

        # 2. Write eager metadata sections
        await asyncio.to_thread(writer.write_eager_section, "parent_organizations", [row_to_dict(po)])
        await asyncio.to_thread(writer.write_eager_section, "organizations", [row_to_dict(r) for r in organizations])
        await asyncio.to_thread(writer.write_eager_section, "users", [row_to_dict(r) for r in users])
        await asyncio.to_thread(writer.write_eager_section, "organization_announcements", [row_to_dict(r) for r in announcements])

        if org_ids:
            # 3. Queues (eager)
            queues = (await db.scalars(select(Queue).where(Queue.org_id.in_(org_ids)))).all()
            await asyncio.to_thread(writer.write_eager_section, "queues", [row_to_dict(r) for r in queues])

            # 4. Sessions (chunked via keyset pagination)
            await asyncio.to_thread(writer.start_array_section, "sessions")
            last_session_id = None
            while True:
                stmt = select(Session).where(Session.org_id.in_(org_ids))
                if last_session_id is not None:
                    stmt = stmt.where(Session.id > last_session_id)
                stmt = stmt.order_by(Session.id.asc()).limit(CHUNK_SIZE)
                chunk = (await db.scalars(stmt)).all()
                if not chunk:
                    break
                last_session_id = chunk[-1].id
                chunk_dicts = [row_to_dict(s) for s in chunk]
                del chunk
                await asyncio.to_thread(writer.write_array_chunk, chunk_dicts)
                del chunk_dicts
                await asyncio.sleep(0)
            await asyncio.to_thread(writer.end_array_section)

            # 5. Tokens (chunked via keyset pagination)
            await asyncio.to_thread(writer.start_array_section, "tokens")
            last_token_id = None
            while True:
                stmt = select(Token).where(Token.org_id.in_(org_ids))
                if last_token_id is not None:
                    stmt = stmt.where(Token.id > last_token_id)
                stmt = stmt.order_by(Token.id.asc()).limit(CHUNK_SIZE)
                chunk = (await db.scalars(stmt)).all()
                if not chunk:
                    break
                last_token_id = chunk[-1].id
                chunk_dicts = [row_to_dict(t) for t in chunk]
                del chunk
                await asyncio.to_thread(writer.write_array_chunk, chunk_dicts)
                del chunk_dicts
                await asyncio.sleep(0)
            await asyncio.to_thread(writer.end_array_section)

            # 6. Messages (chunked via keyset pagination)
            await asyncio.to_thread(writer.start_array_section, "messages")
            last_msg_id = None
            while True:
                stmt = select(Message).where(Message.org_id.in_(org_ids))
                if last_msg_id is not None:
                    stmt = stmt.where(Message.id > last_msg_id)
                stmt = stmt.order_by(Message.id.asc()).limit(CHUNK_SIZE)
                chunk = (await db.scalars(stmt)).all()
                if not chunk:
                    break
                last_msg_id = chunk[-1].id
                chunk_dicts = [row_to_dict(m) for m in chunk]
                del chunk
                await asyncio.to_thread(writer.write_array_chunk, chunk_dicts)
                del chunk_dicts
                await asyncio.sleep(0)
            await asyncio.to_thread(writer.end_array_section)
        else:
            await asyncio.to_thread(writer.write_eager_section, "queues", [])
            await asyncio.to_thread(writer.write_eager_section, "sessions", [])
            await asyncio.to_thread(writer.write_eager_section, "tokens", [])
            await asyncio.to_thread(writer.write_eager_section, "messages", [])

        # 7. Finalize and atomic rename
        await asyncio.to_thread(writer.finalize)
        await asyncio.to_thread(file_handle.close)
        file_handle = None

        size_bytes = await asyncio.to_thread(os.path.getsize, temp_filepath)
        await asyncio.to_thread(os.replace, temp_filepath, filepath)

        if not is_safety_backup:
            backup_record.status = BackupStatus.success
            backup_record.size_bytes = size_bytes
            await db.commit()

        return backup_record

    except Exception as e:
        logger.error(f"Backup failed for parent org {parent_org_id}: {e}")
        if file_handle:
            try:
                await asyncio.to_thread(file_handle.close)
            except Exception:
                pass
        if os.path.exists(temp_filepath):
            try:
                await asyncio.to_thread(os.remove, temp_filepath)
            except Exception as rm_err:
                logger.warning(f"Failed to remove temporary backup file {temp_filepath}: {rm_err}")
        if not is_safety_backup:
            backup_record.status = BackupStatus.failed
            try:
                await db.commit()
            except Exception:
                await db.rollback()
        raise e
    finally:
        if redis and lock_acquired:
            try:
                RELEASE_LOCK_SCRIPT = """
                if redis.call("get", KEYS[1]) == ARGV[1] then
                    return redis.call("del", KEYS[1])
                else
                    return 0
                end
                """
                await redis.eval(RELEASE_LOCK_SCRIPT, 1, lock_key, lock_token)
            except Exception as lock_err:
                logger.warning(f"Failed to release backup lock for {parent_org_id}: {lock_err}")

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
        
    # --- SECURITY HARDENING: TENANT ISOLATION VALIDATION ---
    valid_org_ids = set()
    
    # 2a. Validate and isolate Organizations
    for d in data.get("organizations", []):
        d["parent_organization_id"] = str(parent_org_id)
        if "id" in d and d["id"]:
            valid_org_ids.add(str(d["id"]))

    # 2b. Validate downstream entities
    for d in data.get("users", []):
        if d.get("parent_organization_id"):
            d["parent_organization_id"] = str(parent_org_id)
        if d.get("org_id") and str(d["org_id"]) not in valid_org_ids:
            raise ValueError("Security validation failed: Invalid org_id in users backup.")

    for d in data.get("organization_announcements", []):
        d["parent_organization_id"] = str(parent_org_id)

    for d in data.get("queues", []):
        if d.get("org_id") and str(d["org_id"]) not in valid_org_ids:
            raise ValueError("Security validation failed: Invalid org_id in queues backup.")

    for d in data.get("sessions", []):
        if d.get("org_id") and str(d["org_id"]) not in valid_org_ids:
            raise ValueError("Security validation failed: Invalid org_id in sessions backup.")

    for d in data.get("tokens", []):
        if d.get("org_id") and str(d["org_id"]) not in valid_org_ids:
            raise ValueError("Security validation failed: Invalid org_id in tokens backup.")

    for d in data.get("messages", []):
        if d.get("org_id") and str(d["org_id"]) not in valid_org_ids:
            raise ValueError("Security validation failed: Invalid org_id in messages backup.")
    # -------------------------------------------------------
        
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
        filepath = os.path.join(BACKUP_DIR, filename)
        if not os.path.isfile(filepath):
            continue

        # Clean up stale temporary files left behind by interrupted or crashed backups
        if filename.endswith(".tmp"):
            file_age = now - os.path.getmtime(filepath)
            if file_age > 3600:
                try:
                    os.remove(filepath)
                    logger.info(f"Deleted stale backup temp file: {filename}")
                except Exception as e:
                    logger.error(f"Failed to delete stale temp file {filename}: {e}")
            continue

        if not filename.endswith(".q4backup"):
            continue

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
