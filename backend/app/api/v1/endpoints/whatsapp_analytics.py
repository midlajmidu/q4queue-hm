"""
app/api/v1/endpoints/whatsapp_analytics.py
Backend analytics APIs for WhatsApp (Org-level and Super Admin level).
"""
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.deps import require_branch_admin, get_current_super_admin
from app.db.deps import get_db
from app.models.user import User
from app.whatsapp import config_service, analytics_service
from app.audit.service import record_event

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Org Admin: Granular Settings ──────────────────────────────────────────────

class NotificationSettingsUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    notify_queue_joined: Optional[bool] = None
    notify_position_5: Optional[bool] = None
    notify_position_3: Optional[bool] = None
    notify_called: Optional[bool] = None
    notify_completed: Optional[bool] = None
    notify_skipped: Optional[bool] = None
    notify_recalled: Optional[bool] = None
    notify_removed: Optional[bool] = None

@router.patch("/settings", summary="Update Org WhatsApp Settings")
async def update_org_settings(
    body: NotificationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
) -> dict:
    if current_user.org_id is None:
        raise HTTPException(status_code=403, detail="No organization context")
    
    cfg = await config_service.get_org_config(db, current_user.org_id)
    if cfg is None:
        from app.whatsapp.models import WhatsAppConfig
        cfg = WhatsAppConfig(org_id=current_user.org_id)
        db.add(cfg)
    
    if body.is_enabled is not None:
        cfg.is_enabled = body.is_enabled
    if body.notify_queue_joined is not None:
        cfg.notify_queue_joined = body.notify_queue_joined
    if body.notify_position_5 is not None:
        cfg.notify_position_5 = body.notify_position_5
    if body.notify_position_3 is not None:
        cfg.notify_position_3 = body.notify_position_3
    if body.notify_called is not None:
        cfg.notify_called = body.notify_called
    if body.notify_completed is not None:
        cfg.notify_completed = body.notify_completed
    if body.notify_skipped is not None:
        cfg.notify_skipped = body.notify_skipped
    if body.notify_recalled is not None:
        cfg.notify_recalled = body.notify_recalled
    if body.notify_removed is not None:
        cfg.notify_removed = body.notify_removed
        
    await db.commit()
    await db.refresh(cfg)
    
    await record_event(
        event_type="whatsapp.org_settings_updated",
        org_id=current_user.org_id,
        user_id=current_user.id,
        details=body.model_dump(exclude_unset=True),
    )
    
    return await config_service.get_org_notification_config(current_user.org_id)

@router.get("/settings", summary="Get Org WhatsApp Settings")
async def get_org_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
) -> dict:
    if current_user.org_id is None:
        raise HTTPException(status_code=403, detail="No organization context")
    return await config_service.get_org_notification_config(current_user.org_id)


# ── Org Admin: Dashboard Analytics ────────────────────────────────────────────

@router.get("/overview", summary="Organization Overview Stats")
async def get_analytics_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    queue_id: Optional[uuid.UUID] = Query(None, description="Filter by Queue ID"),
    session_id: Optional[uuid.UUID] = Query(None, description="Filter by Session ID"),
) -> dict:
    """High level metrics (total sent, delivered, read, success rate)."""
    if current_user.org_id is None:
        raise HTTPException(status_code=403, detail="No organization context")
    return await analytics_service.get_org_stats(
        db, current_user.org_id, start_date=start_date, end_date=end_date, queue_id=queue_id, session_id=session_id
    )


@router.get("/events", summary="Analytics Grouped by Event")
async def get_analytics_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    queue_id: Optional[uuid.UUID] = Query(None, description="Filter by Queue ID"),
    session_id: Optional[uuid.UUID] = Query(None, description="Filter by Session ID"),
) -> list:
    """Return counts grouped by event_type."""
    if current_user.org_id is None:
        raise HTTPException(status_code=403, detail="No organization context")
    return await analytics_service.get_stats_by_event(
        db, current_user.org_id, start_date=start_date, end_date=end_date, queue_id=queue_id, session_id=session_id
    )





@router.get("/history", summary="WhatsApp Detailed History")
async def get_analytics_history(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    customer_phone: Optional[str] = Query(None),
    customer_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    queue_id: Optional[uuid.UUID] = Query(None),
    session_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
) -> dict:
    """Paginated detailed message log with advanced filtering."""
    if current_user.org_id is None:
        raise HTTPException(status_code=403, detail="No organization context")
    
    messages, total = await analytics_service.get_org_messages(
        db, current_user.org_id, limit=limit, offset=offset,
        start_date=start_date, end_date=end_date, 
        customer_phone=customer_phone, customer_name=customer_name,
        status=status, event_type=event_type, 
        queue_id=queue_id, session_id=session_id
    )
    
    return {
        "items": [
            {
                "id": str(m.id),
                "customer_phone": m.customer_phone,
                "customer_name": m.customer_name,
                "event_type": m.event_type,
                "template_name": m.template_name,
                "template_variables": m.template_variables,
                "rendered_body": m.rendered_body,
                "status": m.status,
                "meta_message_id": m.meta_message_id,
                "queue_id": str(m.queue_id) if m.queue_id else None,
                "session_id": str(m.session_id) if m.session_id else None,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
                "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
                "read_at": m.read_at.isoformat() if m.read_at else None,
                "failed_at": m.failed_at.isoformat() if m.failed_at else None,
                "error_code": m.error_code,
                "error_message": m.error_message,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }
