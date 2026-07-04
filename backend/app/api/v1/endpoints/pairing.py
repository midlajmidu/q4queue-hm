import json
import logging
import random
import string
import uuid
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.redis.client import get_redis
from app.core.deps import get_current_active_user
from app.db.deps import get_db
from app.models.user import User
from app.models.queue import Queue

logger = logging.getLogger(__name__)
router = APIRouter()

class ConnectPairingRequest(BaseModel):
    pair_code: str
    queue_id: uuid.UUID


@router.post("/generate", response_model=Dict[str, Any])
async def generate_pairing_code() -> Dict[str, Any]:
    """
    Generate a new 6-character pairing code for the TV display.
    Stored in Redis with a 300 second (5 min) TTL.
    """
    redis = get_redis()
    
    # Generate a unique 6-character uppercase alphanumeric code
    for _ in range(10): # try up to 10 times to avoid collisions
        code = "".join(random.choices(string.ascii_uppercase, k=6))
        redis_key = f"pairing:{code}"
        
        # Check if code already exists
        exists = await redis.exists(redis_key)
        if not exists:
            # Store with 300s TTL
            payload = json.dumps({"status": "waiting"})
            await redis.setex(redis_key, 300, payload)
            logger.info("Generated pairing code | code=%s", code)
            return {"code": code}
            
    raise HTTPException(status_code=500, detail="Could not generate unique pairing code")


@router.post("/connect", response_model=Dict[str, Any])
async def connect_pairing_code(
    req: ConnectPairingRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Called by the Staff Dashboard to connect a pairing code to a queue.
    """
    # 1. Validate the queue ownership
    queue = await db.scalar(select(Queue).where(Queue.id == req.queue_id))
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    if queue.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to pair displays for this organization")

    redis = get_redis()
    code = req.pair_code.strip().upper()
    redis_key = f"pairing:{code}"
    
    # 2. Try to atomically delete the key. If it returns 0, it means it was invalid, expired, or claimed by someone else.
    deleted = await redis.delete(redis_key)
    if not deleted:
        raise HTTPException(status_code=400, detail="Invalid, expired, or already used pairing code")
        
    # 3. Publish the redirect action to the TV's waiting channel
    pubsub_channel = f"pairing_channel:{code}"
    redirect_payload = {
        "action": "redirect",
        "queue_id": str(req.queue_id)
    }
    
    await redis.publish(pubsub_channel, json.dumps(redirect_payload))
    logger.info("Pairing code connected successfully | code=%s queue_id=%s user_id=%s", code, req.queue_id, current_user.id)
    
    return {"status": "success", "message": "Display connected successfully"}

