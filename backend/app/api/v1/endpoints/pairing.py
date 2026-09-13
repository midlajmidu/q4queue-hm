import json
import logging
import secrets
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
from app.middleware.rate_limiter import api_rate_limit, join_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter()

class ConnectPairingRequest(BaseModel):
    pair_code: str
    queue_id: uuid.UUID


@router.post(
    "/generate",
    response_model=Dict[str, Any],
    dependencies=[Depends(join_rate_limit)],
)
async def generate_pairing_code() -> Dict[str, Any]:
    """
    Generate a new 6-character pairing code for the TV display.
    Stored in Redis with a 300 second (5 min) TTL.
    """
    redis = get_redis()
    
    # Generate a unique 6-character uppercase alphanumeric code
    for _ in range(10): # try up to 10 times to avoid collisions
        code = "".join(secrets.choice(string.ascii_uppercase) for _ in range(6))
        redis_key = f"pairing:{code}"
        payload = json.dumps({"status": "waiting"})
        if await redis.set(redis_key, payload, ex=300, nx=True):
            logger.info("Generated one-time display pairing code")
            return {"code": code}
            
    raise HTTPException(status_code=500, detail="Could not generate unique pairing code")


@router.post(
    "/connect",
    response_model=Dict[str, Any],
    dependencies=[Depends(api_rate_limit)],
)
async def connect_pairing_code(
    req: ConnectPairingRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Called by the Staff Dashboard to connect a pairing code to a queue.
    """
    # 1. Validate the queue ownership
    queue = await db.scalar(
        select(Queue).where(
            Queue.id == req.queue_id,
            Queue.org_id == current_user.org_id,
            Queue.is_deleted == False,
        )
    )
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")

    redis = get_redis()
    code = req.pair_code.strip().upper()
    if len(code) != 6 or any(ch not in string.ascii_uppercase for ch in code):
        raise HTTPException(status_code=400, detail="Invalid pairing code")
    redis_key = f"pairing:{code}"
    
    # 2. Try to atomically delete the key. If it returns 0, it means it was invalid, expired, or claimed by someone else.
    claimed = await redis.getdel(redis_key)
    if not claimed:
        raise HTTPException(status_code=400, detail="Invalid, expired, or already used pairing code")
        
    # 3. Publish the redirect action to the TV's waiting channel
    pubsub_channel = f"pairing_channel:{code}"
    redirect_payload = {
        "action": "redirect",
        "queue_id": str(req.queue_id)
    }
    
    await redis.publish(pubsub_channel, json.dumps(redirect_payload))
    logger.info("Pairing code connected successfully | queue_id=%s user_id=%s", req.queue_id, current_user.id)
    
    return {"status": "success", "message": "Display connected successfully"}
