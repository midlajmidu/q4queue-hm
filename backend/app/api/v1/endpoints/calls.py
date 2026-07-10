import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from datetime import datetime

from app.db.deps import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.call_log import CallLog
from app.schemas.call_log import CallLogCreate, CallLogRead

router = APIRouter()

@router.post("/log", response_model=CallLogRead)
async def log_call(
    call_in: CallLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Log a completed WebRTC call.
    """
    call_log = CallLog(
        organization_id=call_in.organization_id,
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
    return call_log

@router.get("/logs", response_model=List[CallLogRead])
async def get_call_logs(
    queue_id: Optional[uuid.UUID] = None,
    session_id: Optional[uuid.UUID] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get call logs for an organization.
    """
    # Infer organization from current_user
    org_id = current_user.org_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User does not belong to any organization")
    
    query = select(CallLog).where(CallLog.organization_id == org_id)
    
    if queue_id:
        query = query.where(CallLog.queue_id == queue_id)
    
    if session_id:
        query = query.where(CallLog.session_id == session_id)
        
    query = query.order_by(desc(CallLog.created_at)).limit(limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return logs
