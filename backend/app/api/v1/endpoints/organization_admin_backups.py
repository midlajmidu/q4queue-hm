import os
import shutil
import uuid
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, require_organization_admin
from app.models.user import User
from app.models.org_backup import OrgBackup
from app.middleware.rate_limiter import api_rate_limit

router = APIRouter()

@router.get("/backups")
async def list_backups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
) -> Any:
    """
    List all backups for the current ParentOrganization.
    """
    if not current_user.parent_organization_id:
        return []
        
    backups = await db.scalars(
        select(OrgBackup)
        .where(OrgBackup.parent_org_id == current_user.parent_organization_id)
        .order_by(OrgBackup.created_at.desc())
    )
    
    # Format for JSON response
    result = []
    for b in backups.all():
        result.append({
            "id": str(b.id),
            "filename": b.filename,
            "size_bytes": b.size_bytes,
            "status": b.status,
            "created_at": b.created_at.isoformat()
        })
    return result

@router.get("/backups/{backup_id}/download", dependencies=[Depends(api_rate_limit)])
async def download_backup(
    backup_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
) -> Any:
    """
    Download a specific backup file.
    """
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="Not authorized")
        
    backup = await db.scalar(
        select(OrgBackup)
        .where(OrgBackup.id == backup_id)
        .where(OrgBackup.parent_org_id == current_user.parent_organization_id)
    )
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
        
    # Construct path
    # Assuming BACKUP_DIR is /app/backups matching org_backup_service.py
    from app.services.org_backup_service import BACKUP_DIR
    filepath = os.path.join(BACKUP_DIR, backup.filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup file is missing from disk")
        
    return FileResponse(path=filepath, filename=backup.filename, media_type='application/json')

async def background_restore_task(parent_org_id: uuid.UUID, filepath: str, db: AsyncSession):
    from app.services.org_backup_service import restore_org_backup
    try:
        await restore_org_backup(parent_org_id, filepath, db)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Background restore failed: {e}")
    finally:
        # Cleanup uploaded file
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass

@router.post("/backups/restore", dependencies=[Depends(api_rate_limit)])
async def restore_backup(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
) -> Any:
    """
    Restore data from a .q4backup file. Overwrites everything!
    """
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not associated with a parent organization")
        
    safe_filename = os.path.basename(file.filename)
    if not safe_filename.endswith(".q4backup"):
        raise HTTPException(status_code=400, detail="Invalid backup file format")
        
    # Save file temporarily
    temp_dir = "/tmp/q4queue_restores"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{safe_filename}")
    
    max_size = 50 * 1024 * 1024 # 50MB
    size = 0
    with open(temp_path, "wb") as buffer:
        while content := await file.read(1024 * 1024):
            size += len(content)
            if size > max_size:
                buffer.close()
                os.remove(temp_path)
                raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")
            buffer.write(content)
        
    # Add to background tasks
    # Because db session might close after response, it's safer to use AsyncSessionLocal inside task
    # Or rely on dependency injection if background task shares scope. Wait, in FastAPI, BackgroundTasks can use Depends(get_db), 
    # but the session closes. I should create a new session inside the task.
    
    async def task_wrapper(po_id, path):
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await background_restore_task(po_id, path, session)
            
    background_tasks.add_task(task_wrapper, current_user.parent_organization_id, temp_path)
    
    return {"message": "Restore initiated. A safety backup will be taken before restoration."}
