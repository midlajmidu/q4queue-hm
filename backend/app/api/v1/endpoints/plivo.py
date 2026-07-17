from fastapi import APIRouter, Depends, Form, Request, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.core.config import get_settings
from app.core.deps import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.models.call_log import CallLog

router = APIRouter()

@router.get("/webrtc/token")
async def get_webrtc_token(current_user: User = Depends(get_current_user)):
    """
    Returns the Plivo SIP Endpoint credentials for the WebRTC browser SDK.
    Only authenticated users (dashboard admins/staff) can request this.
    """
    settings = get_settings()
    
    if not settings.PLIVO_WEBRTC_USERNAME or not settings.PLIVO_WEBRTC_PASSWORD:
        raise HTTPException(status_code=500, detail="Plivo WebRTC credentials are not configured on the server.")
        
    return {
        "username": settings.PLIVO_WEBRTC_USERNAME,
        "password": settings.PLIVO_WEBRTC_PASSWORD
    }

@router.post("/webrtc/forward")
async def webrtc_forward(request: Request):
    """
    Plivo Answer URL for WebRTC Outbound Application.
    """
    settings = get_settings()
    form_data = await request.form()
    
    to_number = form_data.get("To")
    if not to_number:
        return Response(content="<Response><Hangup/></Response>", media_type="text/xml")
        
    to_number = to_number.replace(" ", "+")
    caller_id = settings.PLIVO_SOURCE_PHONE or "+918035017361"

    # Extract custom headers passed from frontend Plivo SDK
    # Plivo sends SIP headers prefixed with 'X-PH-' exactly as they are defined.
    org_id = form_data.get("X-PH-OrgId", "")
    queue_id = form_data.get("X-PH-QueueId", "")
    session_id = form_data.get("X-PH-SessionId", "")
    token_id = form_data.get("X-PH-TokenId", "")

    # Build action URL for hangup webhook
    base_url = str(request.base_url).rstrip("/")
    action_url = f"{base_url}/api/v1/plivo/webrtc/hangup?org_id={org_id}&queue_id={queue_id}&session_id={session_id}&token_id={token_id}"
    
    # In XML, ampersands must be escaped as &amp;
    action_url_xml = action_url.replace("&", "&amp;")

    xml_response = f"""<Response>
    <Dial callerId="{caller_id}" action="{action_url_xml}" timeout="30">
        <Number>{to_number}</Number>
    </Dial>
</Response>"""

    return Response(content=xml_response, media_type="text/xml")


@router.post("/webrtc/hangup")
async def webrtc_hangup(
    request: Request,
    org_id: str = "",
    queue_id: str = "",
    session_id: str = "",
    token_id: str = "",
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook called by Plivo when the <Dial> action ends.
    Saves the exact duration of the call into the database.
    """
    form_data = await request.form()
    
    # Plivo provides DialBLegDuration for the connected duration (in seconds)
    duration_str = form_data.get("DialBLegDuration", form_data.get("Duration", "0"))
    try:
        duration_seconds = int(duration_str)
    except ValueError:
        duration_seconds = 0
        
    to_number = form_data.get("To", "").replace(" ", "+")
    
    try:
        q_id = uuid.UUID(queue_id) if queue_id else None
        
        # Parse org_id but don't strictly require it to be a valid UUID yet
        o_id = None
        try:
            if org_id and org_id != "00000000-0000-0000-0000-000000000000":
                o_id = uuid.UUID(org_id)
        except ValueError:
            pass

        # Robustness: Always fetch the actual org_id from the queue if we have the queue_id.
        # This prevents IntegrityErrors if the frontend accidentally sends queue_id in place of org_id.
        if q_id:
            from app.models.queue import Queue
            from sqlalchemy import select
            result = await db.execute(select(Queue).where(Queue.id == q_id))
            queue = result.scalar_one_or_none()
            if queue:
                o_id = queue.org_id
                
        if not o_id:
            print(f"Warning: Plivo webhook could not determine valid organization_id (org_id={org_id}, queue_id={queue_id}). Skipping log.")
            return Response(content="ok")

        call_log = CallLog(
            organization_id=o_id,
            queue_id=q_id,
            session_id=uuid.UUID(session_id) if session_id else None,
            token_id=uuid.UUID(token_id) if token_id else None,
            customer_phone=to_number or "Unknown",
            duration_seconds=duration_seconds
        )
        db.add(call_log)
        await db.commit()

        # Notify the frontend that the call has ended (so it can stop ringing/close modal)
        try:
            from app.websocket.connection_manager import manager
            await manager.broadcast_to_org(str(o_id), {
                "type": "CALL_HUNG_UP",
                "queue_id": str(q_id) if q_id else None,
                "token_id": token_id if token_id else None,
                "customer_phone": to_number or "Unknown",
                "duration": duration_seconds
            })
        except Exception as ws_err:
            print(f"Failed to broadcast CALL_HUNG_UP event: {ws_err}")

    except Exception as e:
        print(f"Error logging call from Plivo webhook: {e}")
        
    return Response(content="ok")
