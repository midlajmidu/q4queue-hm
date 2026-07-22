import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.call_log import CallLog
from app.schemas.call_log import (
    CallLogCreate,
    CallLogRead,
    CallLogsOverviewResponse,
    PaginatedCallLogsResponse,
)
from app.services import call_log_service

router = APIRouter()

@router.post("/save", response_model=CallLogRead)
async def log_call(
    call_in: CallLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Log a completed WebRTC call.
    """
    org_id = call_in.organization_id or current_user.org_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization")

    call_log = CallLog(
        organization_id=org_id,
        queue_id=call_in.queue_id,
        session_id=call_in.session_id,
        token_id=call_in.token_id,
        customer_name=call_in.customer_name,
        customer_phone=call_in.customer_phone,
        duration_seconds=call_in.duration_seconds,
        called_by_id=current_user.id
    )
    
    db.add(call_log)
    await db.commit()
    await db.refresh(call_log)

    called_by_name = None
    if current_user:
        name_parts = [p for p in [current_user.first_name, current_user.last_name] if p]
        called_by_name = " ".join(name_parts) if name_parts else current_user.email

    return CallLogRead(
        id=call_log.id,
        organization_id=call_log.organization_id,
        queue_id=call_log.queue_id,
        session_id=call_log.session_id,
        token_id=call_log.token_id,
        customer_name=call_log.customer_name,
        customer_phone=call_log.customer_phone,
        duration_seconds=call_log.duration_seconds,
        billable_minutes=call_log_service.calculate_billable_minutes(call_log.duration_seconds),
        called_by_id=call_log.called_by_id,
        called_by_name=called_by_name,
        created_at=call_log.created_at,
    )

@router.get("/logs", response_model=PaginatedCallLogsResponse)
async def get_call_logs(
    queue_id: Optional[uuid.UUID] = None,
    staff_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get paginated call logs history for an organization.
    """
    org_id = current_user.org_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization")
    
    return await call_log_service.get_call_logs_paginated(
        db,
        org_id=org_id,
        page=page,
        limit=limit,
        queue_id=queue_id,
        staff_id=staff_id,
        search=search,
    )

@router.get("/overview", response_model=CallLogsOverviewResponse)
async def get_call_logs_overview(
    queue_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get call metrics & billable minutes overview for an organization.
    """
    org_id = current_user.org_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization")

    return await call_log_service.get_call_logs_overview(
        db,
        org_id=org_id,
        queue_id=queue_id,
    )
