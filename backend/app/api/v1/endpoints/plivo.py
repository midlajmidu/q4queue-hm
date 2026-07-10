from fastapi import APIRouter, Depends, Form, Request, HTTPException
from fastapi.responses import Response
from app.core.config import get_settings
from app.core.deps import get_current_user
from app.models.user import User

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
    When the browser initiates a call to a customer's phone number,
    Plivo intercepts it and hits this webhook with form data including 'To'.
    We must return a <Response><Dial callerId="..."> <Number>{To}</Number> </Dial></Response> XML.
    """
    settings = get_settings()
    form_data = await request.form()
    
    # Plivo sends the destination number in the 'To' field
    to_number = form_data.get("To")
    
    if not to_number:
        # Fallback if somehow not provided
        xml_response = "<Response><Hangup/></Response>"
    else:
        # FastAPI's request.form() might decode a raw '+' as a space if it wasn't URL-encoded.
        to_number = to_number.replace(" ", "+")
        
        caller_id = settings.PLIVO_SOURCE_PHONE or "+918035017361"
        xml_response = f"""<Response>
    <Dial callerId="{caller_id}">
        <Number>{to_number}</Number>
    </Dial>
</Response>"""

    return Response(content=xml_response, media_type="text/xml")
