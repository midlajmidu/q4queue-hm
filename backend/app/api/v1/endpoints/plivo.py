from fastapi import APIRouter, Depends, Form, Request, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from datetime import datetime, timezone, timedelta
import uuid

from app.core.config import get_settings
from app.core.deps import get_current_active_user
from app.db.deps import get_db
from app.models.user import User
from app.models.call_log import CallLog
from app.models.queue import Queue
from app.models.session import Session
from app.models.organization import Organization
from app.models.token import Token

router = APIRouter()

def normalize_phone_number(phone: str) -> str:
    """
    Normalizes local and international phone numbers into standard E.164 (+<country_code><digits>).
    Specifically defaults 10-digit numbers starting with 6-9 to India (+91).
    """
    if not phone:
        return ""
    clean = "".join(c for c in phone if c.isdigit() or c == "+")
    if clean.startswith("+"):
        return clean
    if clean.startswith("00"):
        return "+" + clean[2:]
    # 10-digit Indian mobile number
    if len(clean) == 10 and clean[0] in "6789":
        return "+91" + clean
    # 11-digit number starting with 0
    if len(clean) == 11 and clean.startswith("0") and clean[1] in "6789":
        return "+91" + clean[1:]
    # 12-digit number starting with 91
    if len(clean) == 12 and clean.startswith("91"):
        return "+" + clean
    return "+" + clean if clean else ""


def _get_public_base_url(request: Request) -> str:
    """
    Returns the publicly reachable base URL for Plivo callbacks.
    Prioritizes PUBLIC_API_URL if configured, otherwise inspects reverse-proxy headers.
    Always ensures HTTPS for public domains (like amoebaq.com) to avoid 301 redirect drops.
    """
    settings = get_settings()
    if hasattr(settings, "PUBLIC_API_URL") and settings.PUBLIC_API_URL and "your-ngrok" not in settings.PUBLIC_API_URL and "localhost" not in settings.PUBLIC_API_URL:
        base = settings.PUBLIC_API_URL.rstrip("/")
        if "amoebaq.com" in base and base.startswith("http://"):
            base = base.replace("http://", "https://", 1)
        return base

    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if host:
        if "amoebaq.com" in host or (proto == "http" and "localhost" not in host and "127.0.0.1" not in host):
            proto = "https"
        return f"{proto}://{host}"

    base = str(request.base_url).rstrip("/")
    if "amoebaq.com" in base and base.startswith("http://"):
        base = base.replace("http://", "https://", 1)
    return base


@router.get("/webrtc/token")
async def get_webrtc_token(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
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
    Executed when Leg A (browser) initiates an outbound call.
    Dials Leg B (customer) with action and callback URLs.
    """
    settings = get_settings()
    form_data = await request.form()
    
    raw_to_number = form_data.get("To")
    if not raw_to_number:
        return Response(content="<Response><Hangup/></Response>", media_type="text/xml")
        
    to_number = normalize_phone_number(raw_to_number)
    caller_id = settings.PLIVO_SOURCE_PHONE or "+918035017361"

    # Extract custom headers passed from frontend Plivo SDK case-insensitively (handling SIP-H- prefix)
    def _extract_header(targets):
        for k, v in form_data.items():
            clean = str(k).lower().replace("-", "").replace("_", "")
            for target in targets:
                if clean == target or clean.endswith(target):
                    val = str(v).strip()
                    if val and val != "00000000-0000-0000-0000-000000000000":
                        return val
        return ""

    org_id = _extract_header(["orgid", "xphorgid"]) or request.query_params.get("org_id", "")
    queue_id = _extract_header(["queueid", "xphqueueid"]) or request.query_params.get("queue_id", "")
    session_id = _extract_header(["sessionid", "xphsessionid"]) or request.query_params.get("session_id", "")
    token_id = _extract_header(["tokenid", "xphtokenid"]) or request.query_params.get("token_id", "")

    base_url = _get_public_base_url(request)
    if "amoebaq.com" in base_url and base_url.startswith("http://"):
        base_url = base_url.replace("http://", "https://", 1)

    action_url = f"{base_url}/api/v1/plivo/webrtc/hangup?org_id={org_id}&queue_id={queue_id}&session_id={session_id}&token_id={token_id}"
    action_url_xml = action_url.replace("&", "&amp;")

    callback_url = f"{base_url}/api/v1/plivo/webrtc/dial-callback?org_id={org_id}&queue_id={queue_id}&session_id={session_id}&token_id={token_id}"
    callback_url_xml = callback_url.replace("&", "&amp;")

    xml_response = f"""<Response>
    <Dial callerId="{caller_id}" action="{action_url_xml}" callbackUrl="{callback_url_xml}" callbackMethod="POST" timeout="30">
        <Number>{to_number}</Number>
    </Dial>
</Response>"""

    return Response(content=xml_response, media_type="text/xml")


@router.post("/webrtc/dial-callback")
async def webrtc_dial_callback(
    request: Request,
    org_id: str = "",
    queue_id: str = "",
    session_id: str = "",
    token_id: str = "",
    db: AsyncSession = Depends(get_db)
):
    """
    Asynchronous event callback from Plivo for dialed Leg B.
    Notifies frontend via WebSocket when the callee has actually answered the call.
    """
    form_data = await request.form()
    event = form_data.get("Event", "").lower()
    dial_status = form_data.get("DialStatus", "").lower()
    dial_action = form_data.get("DialAction", "").lower()
    to_number = form_data.get("To", "").replace(" ", "+")

    o_id = None
    if org_id and org_id != "00000000-0000-0000-0000-000000000000":
        try:
            o_id = uuid.UUID(org_id)
        except ValueError:
            pass

    if not o_id and queue_id:
        try:
            result = await db.execute(select(Queue).where(Queue.id == uuid.UUID(queue_id)))
            queue = result.scalar_one_or_none()
            if queue:
                o_id = queue.org_id
        except Exception:
            pass

    is_answered = (
        dial_status in ["answered", "answer"]
        or dial_action in ["answer", "answered", "connected"]
        or event in ["dialanswer", "dial_answer", "answer"]
    )
    if is_answered:
        if o_id:
            try:
                from app.websocket.connection_manager import manager
                await manager.broadcast_to_org(str(o_id), {
                    "type": "CALL_ANSWERED_BY_CALLEE",
                    "queue_id": queue_id or None,
                    "token_id": token_id or None,
                    "customer_phone": to_number or "Unknown",
                })
            except Exception as ws_err:
                print(f"Failed to broadcast CALL_ANSWERED_BY_CALLEE event: {ws_err}")

    return Response(content="ok")


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
    Authoritatively saves true Leg B talk duration and callee outcome status into the database.
    Reconciles with any optimistic frontend log record.
    """
    form_data = await request.form()
    
    # Plivo provides DialBLegDuration for the actual connected duration of Leg B (customer)
    b_leg_str = form_data.get("DialBLegDuration") or "0"
    try:
        dial_b_leg_duration = int(float(b_leg_str))
    except (ValueError, TypeError):
        dial_b_leg_duration = 0

    # Total duration of Leg A
    a_leg_str = form_data.get("DialALegDuration") or form_data.get("Duration") or "0"
    try:
        dial_a_leg_duration = int(float(a_leg_str))
    except (ValueError, TypeError):
        dial_a_leg_duration = 0

    ring_duration_seconds = max(0, dial_a_leg_duration - dial_b_leg_duration)

    dial_status_raw = form_data.get("DialStatus", "").lower().strip()
    STATUS_MAP = {
        "completed": "completed",
        "answer": "completed",
        "no-answer": "no_answer",
        "busy": "busy",
        "failed": "failed",
        "cancel": "cancelled",
        "timeout": "no_answer",
    }

    if dial_b_leg_duration > 0:
        call_status = "completed"
        duration_seconds = dial_b_leg_duration
    else:
        duration_seconds = 0
        call_status = STATUS_MAP.get(dial_status_raw, "no_answer")
        
    to_number = form_data.get("To", "").replace(" ", "+")
    
    try:
        def _extract_hangup_param(targets):
            for k, v in form_data.items():
                clean = str(k).lower().replace("-", "").replace("_", "")
                for target in targets:
                    if clean == target or clean.endswith(target):
                        val = str(v).strip()
                        if val and val != "00000000-0000-0000-0000-000000000000":
                            return val
            return ""

        if not org_id or org_id == "00000000-0000-0000-0000-000000000000":
            org_id = _extract_hangup_param(["orgid", "xphorgid"]) or request.query_params.get("org_id", "")
        if not queue_id:
            queue_id = _extract_hangup_param(["queueid", "xphqueueid"]) or request.query_params.get("queue_id", "")
        if not token_id:
            token_id = _extract_hangup_param(["tokenid", "xphtokenid"]) or request.query_params.get("token_id", "")
        if not session_id:
            session_id = _extract_hangup_param(["sessionid", "xphsessionid"]) or request.query_params.get("session_id", "")

        q_id = uuid.UUID(queue_id) if queue_id else None
        
        o_id = None
        try:
            if org_id and org_id != "00000000-0000-0000-0000-000000000000":
                o_id = uuid.UUID(org_id)
        except ValueError:
            pass

        if token_id and not o_id:
            try:
                tok_res = await db.execute(select(Token).where(Token.id == uuid.UUID(token_id)))
                tok = tok_res.scalar_one_or_none()
                if tok and tok.org_id:
                    o_id = tok.org_id
                    if not q_id and tok.queue_id:
                        q_id = tok.queue_id
            except Exception:
                pass

        if q_id and not o_id:
            result = await db.execute(select(Queue).where(Queue.id == q_id))
            queue = result.scalar_one_or_none()
            if queue:
                o_id = queue.org_id
                
        # Fallback: resolve organization strictly from customer token history if phone number is known
        if not o_id and to_number:
            digits_tail = "".join(filter(str.isdigit, to_number))[-10:] if len(to_number) >= 10 else to_number
            if digits_tail:
                t_res = await db.execute(
                    select(Token.org_id, Token.queue_id).where(
                        Token.customer_phone.like(f"%{digits_tail}")
                    ).order_by(desc(Token.created_at)).limit(1)
                )
                t_row = t_res.first()
                if t_row and t_row[0]:
                    o_id = t_row[0]
                    if not q_id and t_row[1]:
                        q_id = t_row[1]

        if not o_id:
            print(f"Warning: Plivo webhook could not determine valid organization_id for to_number={to_number}. Skipping log to preserve tenant isolation.")
            return Response(content="ok")

        # Reconcile: Search for an existing recent CallLog created in last 3 minutes
        recent_cutoff = datetime.now(timezone.utc) - timedelta(minutes=3)
        raw_to = (to_number or "").strip()
        to_variants = list(set([raw_to, raw_to.lstrip("+"), f"+{raw_to.lstrip('+')}"]))
        conditions = [
            CallLog.organization_id == o_id,
            CallLog.customer_phone.in_(to_variants),
            CallLog.created_at >= recent_cutoff,
        ]
        if token_id:
            try:
                conditions.append(CallLog.token_id == uuid.UUID(token_id))
            except ValueError:
                pass

        res = await db.execute(
            select(CallLog).where(and_(*conditions)).order_by(desc(CallLog.created_at)).limit(1)
        )
        existing_log = res.scalar_one_or_none()

        if existing_log:
            # Only update duration if incoming duration > 0, or if existing_log has 0 duration
            if duration_seconds > 0:
                existing_log.duration_seconds = max(existing_log.duration_seconds or 0, duration_seconds)
            if ring_duration_seconds > 0:
                existing_log.ring_duration_seconds = max(existing_log.ring_duration_seconds or 0, ring_duration_seconds)

            # Never overwrite a completed status with 0s/no_answer
            if (existing_log.duration_seconds or 0) > 0:
                existing_log.call_status = "completed"
            elif call_status and call_status != "completed":
                existing_log.call_status = call_status

            await db.commit()
            print(f"Reconciled CallLog {existing_log.id}: status={existing_log.call_status}, duration={existing_log.duration_seconds}s, ring={existing_log.ring_duration_seconds}s")
        else:
            # Verify foreign keys before insertion
            valid_qid = None
            if q_id:
                q_chk = await db.execute(select(Queue.id).where(Queue.id == q_id))
                if q_chk.scalar_one_or_none():
                    valid_qid = q_id

            valid_sid = None
            if session_id:
                try:
                    p_sid = uuid.UUID(session_id)
                    s_chk = await db.execute(select(Session.id).where(Session.id == p_sid))
                    if s_chk.scalar_one_or_none():
                        valid_sid = p_sid
                except Exception:
                    pass

            valid_tid = None
            if token_id:
                try:
                    p_tid = uuid.UUID(token_id)
                    t_chk = await db.execute(select(Token.id).where(Token.id == p_tid))
                    if t_chk.scalar_one_or_none():
                        valid_tid = p_tid
                except Exception:
                    pass

            resolved_status = call_status
            if duration_seconds > 0:
                resolved_status = "completed"
            elif resolved_status == "completed":
                resolved_status = "no_answer"

            normalized_to = f"+{raw_to.lstrip('+')}" if raw_to else "Unknown"

            call_log = CallLog(
                organization_id=o_id,
                queue_id=valid_qid,
                session_id=valid_sid,
                token_id=valid_tid,
                customer_phone=normalized_to,
                duration_seconds=duration_seconds,
                call_status=resolved_status,
                ring_duration_seconds=ring_duration_seconds,
            )
            db.add(call_log)
            try:
                await db.commit()
            except Exception as e:
                await db.rollback()
                print(f"Integrity check failed in Plivo webhook: {e}. Retrying without optional foreign keys.")
                call_log = CallLog(
                    organization_id=o_id,
                    queue_id=None,
                    session_id=None,
                    token_id=None,
                    customer_phone=normalized_to,
                    duration_seconds=duration_seconds,
                    call_status=resolved_status,
                    ring_duration_seconds=ring_duration_seconds,
                )
                db.add(call_log)
                await db.commit()
            print(f"Created new CallLog from Plivo webhook: status={resolved_status}, duration={duration_seconds}s, ring={ring_duration_seconds}s")

        # Notify the frontend that the call has ended
        try:
            from app.websocket.connection_manager import manager
            await manager.broadcast_to_org(str(o_id), {
                "type": "CALL_HUNG_UP",
                "queue_id": str(q_id) if q_id else None,
                "token_id": token_id if token_id else None,
                "customer_phone": to_number or "Unknown",
                "duration": duration_seconds,
                "call_status": call_status,
            })
        except Exception as ws_err:
            print(f"Failed to broadcast CALL_HUNG_UP event: {ws_err}")

    except Exception as e:
        print(f"Error logging call from Plivo webhook: {e}")
    return Response(content="ok")
