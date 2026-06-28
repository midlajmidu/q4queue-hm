import uuid
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, require_organization_admin
from app.models.user import User
from app.models.export_job import ExportJob
from app.schemas.organization_export import ExportRequest, ExportResponse
from app.services.export_generator import generate_export
from app.services.export_generator import generate_export
from app.audit.service import record_event
from app.middleware.rate_limiter import api_rate_limit

router = APIRouter()

@router.post("/exports", response_model=ExportResponse, dependencies=[Depends(api_rate_limit)])
async def request_export(
    request: ExportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User not part of a parent organization")
        
    job = ExportJob(
        parent_org_id=current_user.parent_organization_id,
        requested_by=current_user.id,
        report_type=request.report_type,
        format=request.format,
        filters={
            "date_range": request.date_range,
            "custom_start_date": request.custom_start_date,
            "custom_end_date": request.custom_end_date,
            "branch_ids": [str(b) for b in request.branch_ids] if request.branch_ids else None,
            "queue_names": request.queue_names
        }
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    await record_event(
        event_type="ORG_EXPORT_TRIGGERED",
        user_id=current_user.id,
        parent_org_id=current_user.parent_organization_id,
        details={"job_id": str(job.id), "report_type": request.report_type, "format": request.format}
    )
    
    # Run export generation in background
    background_tasks.add_task(generate_export, job.id, db)
    
    return job

@router.get("/exports", response_model=List[ExportResponse])
async def list_exports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    if not current_user.parent_organization_id:
        raise HTTPException(status_code=400, detail="User not part of a parent organization")
        
    res = await db.execute(
        select(ExportJob)
        .where(ExportJob.parent_org_id == current_user.parent_organization_id)
        .order_by(ExportJob.created_at.desc())
    )
    return res.scalars().all()

@router.get("/exports/{job_id}/download", dependencies=[Depends(api_rate_limit)])
async def download_export(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_organization_admin()),
):
    job = await db.get(ExportJob, job_id)
    if not job or job.parent_org_id != current_user.parent_organization_id:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.status != "completed" or not job.file_path:
        raise HTTPException(status_code=400, detail="File is not ready for download")
        
    if not os.path.exists(job.file_path):
        raise HTTPException(status_code=404, detail="File missing on server")
        
    filename = os.path.basename(job.file_path)
    return FileResponse(
        path=job.file_path,
        filename=filename,
        media_type="application/octet-stream"
    )
