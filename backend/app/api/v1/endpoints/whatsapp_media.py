import uuid
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.deps import get_db
from app.models.token import Token
from app.models.organization import Organization
from app.utils.ticket_generator import generate_ticket_image

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/ticket/{token_id}.png", response_class=StreamingResponse)
async def get_whatsapp_ticket_image(
    token_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Generate and stream a dynamic PNG ticket image for a given token.
    This endpoint is strictly for WhatsApp servers to download the image.
    """
    from app.models.queue import Queue
    
    stmt = select(Token).where(Token.id == token_id)
    result = await db.execute(stmt)
    token = result.scalar_one_or_none()
    
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    org_stmt = select(Organization).where(Organization.id == token.org_id)
    org_result = await db.execute(org_stmt)
    org = org_result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    queue_stmt = select(Queue).where(Queue.id == token.queue_id)
    queue_result = await db.execute(queue_stmt)
    queue = queue_result.scalar_one_or_none()
    
    try:
        # Prefix the token string
        prefix = queue.prefix if queue and queue.prefix else ""
        token_number_str = f"{prefix}{token.token_number}" if prefix else f"{token.token_number}"
        
        # Calculate people ahead
        stmt = select(func.count()).where(
            Token.queue_id == token.queue_id,
            Token.status == 'waiting',
            Token.token_number < token.token_number
        )
        people_ahead = await db.scalar(stmt)
        
        # Date and Time from token creation (Convert from UTC to IST)
        import pytz
        created_dt = token.created_at
        if created_dt.tzinfo is None:
            created_dt = pytz.utc.localize(created_dt)
        ist_dt = created_dt.astimezone(pytz.timezone('Asia/Kolkata'))
        
        date_str = ist_dt.strftime("%d %b %Y")  # e.g., 12 Jul 2026
        time_str = ist_dt.strftime("%I:%M %p")  # e.g., 10:35 AM

        # Generate image
        img_buffer = generate_ticket_image(
            token_number=token_number_str,
            branch_name=org.name,
            queue_name=queue.name if queue else "General Queue",
            date_str=date_str,
            time_str=time_str,
            people_ahead=str(people_ahead or 0)
        )
        return StreamingResponse(img_buffer, media_type="image/png")
    except Exception as e:
        logger.error(f"Error generating ticket image: {e}")
        raise HTTPException(status_code=500, detail="Error generating ticket image")
