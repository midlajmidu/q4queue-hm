"""
app/api/v1/endpoints/analytics.py
Analytics and dashboard overview endpoints.
"""
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.db.deps import get_db
from app.models.user import User
from app.services.analytics_service import get_overview_metrics

router = APIRouter()

@router.get("/overview", summary="Get Overview Metrics")
async def get_overview(
    session_id: Optional[uuid.UUID] = Query(None, description="Filter by Session ID"),
    queue_id: Optional[uuid.UUID] = Query(None, description="Filter by Queue ID"),
    search: Optional[str] = Query(None, description="Search by name, phone, or token number"),
    status: Optional[str] = Query(None, description="Filter by token status"),
    start_date: Optional[str] = Query(None, description="Start date (ISO 8601)"),
    end_date: Optional[str] = Query(None, description="End date (ISO 8601)"),
    recent_limit: int = Query(5, description="Number of recent activities to show"),
    recent_offset: int = Query(0, description="Offset for recent activities"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Fetch dashboard metrics (total visits, times, charts) filtered by org and optionally session/queue/search/status/date."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        return await get_overview_metrics(
            db,
            org_id=current_user.org_id,
            session_id=session_id,
            queue_id=queue_id,
            search=search,
            status=status,
            start_date=start_date,
            end_date=end_date,
            recent_limit=recent_limit,
            recent_offset=recent_offset,
        )
    except Exception as exc:
        logger.error("get_overview failed: %s", exc, exc_info=True)
        return {
            "status_counts": {"total": 0, "served": 0, "cancelled": 0, "waiting": 0, "invited": 0},
            "timings": {"avg_waiting_time": "00:00:00", "max_waiting_time": "00:00:00", "avg_served_time": "00:00:00", "max_served_time": "00:00:00"},
            "charts": {"hourly": [], "monthly": []},
            "daily_timings": [],
            "staff_performance": [],
            "recent_activity": [],
            "longest_waiting_queue": None,
            "longest_waiting_session": None,
        }

@router.get("/history", summary="Get Detailed History")
async def get_history(
    session_id: Optional[uuid.UUID] = Query(None, description="Filter by Session ID"),
    queue_id: Optional[uuid.UUID] = Query(None, description="Filter by Queue ID"),
    search: Optional[str] = Query(None, description="Search by name, phone, or token number"),
    status: Optional[str] = Query(None, description="Filter by token status"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Fetch detailed token history with pagination and filters."""
    import logging
    logger = logging.getLogger(__name__)
    from app.services.analytics_service import get_history_details
    try:
        return await get_history_details(
            db,
            org_id=current_user.org_id,
            session_id=session_id,
            queue_id=queue_id,
            search=search,
            status=status,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        logger.error("get_history failed: %s", exc, exc_info=True)
        return {"items": [], "total": 0, "limit": limit, "offset": offset}

@router.get("/export", summary="Export CSV Report")
async def export_analytics_csv(
    queue_id: Optional[uuid.UUID] = Query(None, description="Filter by Queue ID"),
    session_id: Optional[uuid.UUID] = Query(None, description="Filter by Session ID"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by token status"),
    start_date: Optional[str] = Query(None, description="Start date (ISO 8601)"),
    end_date: Optional[str] = Query(None, description="End date (ISO 8601)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Download a CSV report of all queue interactions within a date range."""
    from fastapi.responses import Response
    from app.services.analytics_service import get_analytics_csv_data
    
    csv_data = await get_analytics_csv_data(
        db,
        org_id=current_user.org_id,
        queue_id=queue_id,
        session_id=session_id,
        search=search,
        status=status,
        start_date=start_date,
        end_date=end_date,
    )
    
    filename = f"queue_interactions_{start_date or 'all'}_to_{end_date or 'all'}.csv"
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
