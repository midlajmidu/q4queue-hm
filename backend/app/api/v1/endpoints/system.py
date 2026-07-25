from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import List

from app.db.deps import get_db
from app.models.system_announcement import SystemAnnouncement

router = APIRouter()

class SystemAnnouncementDetail(BaseModel):
    id: str
    message: str
    type: str
    created_at: str

@router.get(
    "/system-announcements/active",
    response_model=List[SystemAnnouncementDetail],
    summary="Get active system announcements",
)
async def get_active_announcements(
    db: AsyncSession = Depends(get_db),
) -> List[SystemAnnouncementDetail]:
    result = await db.execute(
        select(SystemAnnouncement)
        .where(SystemAnnouncement.is_active == True)
        .order_by(desc(SystemAnnouncement.created_at))
    )
    rows = result.scalars().all()
    
    return [
        SystemAnnouncementDetail(
            id=str(row.id),
            message=row.message,
            type=row.type,
            created_at=row.created_at.isoformat()
        )
        for row in rows
    ]

@router.get(
    "/time",
    summary="Get current server time",
    description="Returns the current server Unix timestamp to synchronize TOTP generation.",
)
async def get_system_time():
    import time
    return {"server_time": int(time.time())}
