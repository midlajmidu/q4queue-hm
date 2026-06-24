import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, require_organization_admin
from app.models.user import User
from app.schemas.organization_backup import BackupResponse, BackupTriggerResponse
from app.audit.service import record_event

router = APIRouter()

@router.post("/backups", response_model=BackupTriggerResponse)
async def trigger_backup(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User is not associated with a parent organization")
        
    job_id = str(uuid.uuid4())
    
    # Audit log
    await record_event(
        event_type="ORG_BACKUP_TRIGGERED",
        user_id=current_user.id,
        parent_org_id=current_user.parent_organization_id,
        details={"job_id": job_id}
    )
    
    return BackupTriggerResponse(
        job_id=job_id,
        status="pending",
        message="Backup job started successfully."
    )

@router.get("/backups", response_model=List[BackupResponse])
async def list_backups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        return []
    
    # Placeholder for actual backup records
    return []
