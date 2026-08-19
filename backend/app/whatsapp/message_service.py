"""
app/whatsapp/message_service.py
Sends WhatsApp messages via Meta Cloud API.

Design:
  - All sends are fire-and-forget (never raise, always log)
  - Every message is stored in whatsapp_messages table
  - Delivery status is updated via webhook events
  - Uses httpx async client (already in requirements)
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.whatsapp.models import WhatsAppMessage, WhatsAppDeliveryStatus
from app.whatsapp.template_service import get_rendered_template, render_template, get_template_by_name
from app.whatsapp.config_service import get_global_config_dict
from app.db.session import AsyncSessionLocal
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Meta Cloud API base URL
META_API_BASE = "https://graph.facebook.com"


def _normalize_phone(phone: str) -> str:
    """
    Normalize phone to E.164 format for WhatsApp.
    Strips spaces, dashes, parentheses.
    Defaults 10-digit Indian numbers to +91.
    """
    cleaned = (
        phone.strip()
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )
    if not cleaned.startswith("+"):
        if len(cleaned) == 10 and cleaned.isdigit():
            cleaned = "+91" + cleaned
        elif len(cleaned) == 12 and cleaned.startswith("91") and cleaned.isdigit():
            cleaned = "+" + cleaned
    return cleaned


async def _store_message(
    *,
    org_id: uuid.UUID,
    queue_id: Optional[uuid.UUID],
    token_id: Optional[uuid.UUID],
    phone: str,
    customer_name: Optional[str],
    event_type: str,
    template_name: Optional[str],
    template_variables: Optional[list],
    rendered_body: Optional[str],
    session_id: Optional[uuid.UUID] = None,
) -> WhatsAppMessage:
    """Insert a new WhatsApp message row (status=pending)."""
    async with AsyncSessionLocal() as db:
        msg = WhatsAppMessage(
            organization_id=org_id,
            queue_id=queue_id,
            session_id=session_id,
            customer_id=None,
            token_id=token_id,
            customer_phone=phone,
            customer_name=customer_name,
            event_type=event_type,
            template_name=template_name,
            template_variables={"vars": template_variables} if template_variables else None,
            rendered_body=rendered_body,
            status=WhatsAppDeliveryStatus.pending,
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg


async def log_skipped_whatsapp_message(
    *,
    org_id: uuid.UUID,
    phone: str,
    event_type: str,
    reason: str,
    queue_id: Optional[uuid.UUID] = None,
    token_id: Optional[uuid.UUID] = None,
    customer_name: Optional[str] = None,
    session_id: Optional[uuid.UUID] = None,
) -> None:
    """Log a message that was intentionally skipped (e.g., no opt-in)."""
    async with AsyncSessionLocal() as db:
        msg = WhatsAppMessage(
            organization_id=org_id,
            queue_id=queue_id,
            session_id=session_id,
            customer_id=None,
            token_id=token_id,
            customer_phone=_normalize_phone(phone),
            customer_name=customer_name,
            event_type=event_type,
            template_name="skipped",
            status=WhatsAppDeliveryStatus.skipped,
            error_code="OPT_IN_REQUIRED",
            error_message=reason,
            failed_at=datetime.now(timezone.utc),
        )
        db.add(msg)
        await db.commit()


async def _update_message_status(
    message_id: uuid.UUID,
    *,
    status: WhatsAppDeliveryStatus,
    meta_message_id: Optional[str] = None,
    error_code: Optional[str] = None,
    error_message: Optional[str] = None,
) -> None:
    """Update delivery status of a stored message."""
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(
            select(WhatsAppMessage).where(WhatsAppMessage.id == message_id)
        )
        msg = result.scalar_one_or_none()
        if msg is None:
            return
        msg.status = status
        if meta_message_id:
            msg.meta_message_id = meta_message_id
        if status == WhatsAppDeliveryStatus.sent:
            msg.sent_at = now
        elif status == WhatsAppDeliveryStatus.failed:
            msg.failed_at = now
            msg.error_code = error_code
            msg.error_message = error_message
        await db.commit()


async def _upload_ticket_image_to_meta(
    *,
    access_token: str,
    phone_number_id: str,
    api_version: str,
    token_number: str,
    branch_name: str,
    queue_name: str,
    people_ahead: str,
) -> Optional[str]:
    """Dynamically generate a personalized ticket image on top of bakery template and upload to Meta."""
    try:
        from app.utils.ticket_generator import generate_ticket_image
        import pytz
        from datetime import datetime
        
        ist_dt = datetime.now(pytz.timezone("Asia/Kolkata"))
        date_str = ist_dt.strftime("%d %b %Y")
        time_str = ist_dt.strftime("%I:%M %p")
        
        img_buffer = generate_ticket_image(
            token_number=token_number,
            branch_name=branch_name,
            queue_name=queue_name,
            date_str=date_str,
            time_str=time_str,
            people_ahead=people_ahead,
        )
        img_bytes = img_buffer.getvalue()
        
        url = f"{META_API_BASE}/{api_version}/{phone_number_id}/media"
        headers = {"Authorization": f"Bearer {access_token}"}
        files = {
            "file": (f"ticket_{token_number}.png", img_bytes, "image/png")
        }
        data = {
            "messaging_product": "whatsapp",
            "type": "image/png"
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, headers=headers, files=files, data=data)
            if resp.status_code == 200:
                media_id = resp.json().get("id")
                logger.info("Dynamic ticket image uploaded to Meta | media_id=%s token=%s", media_id, token_number)
                return media_id
            else:
                logger.warning("Failed to upload dynamic ticket image to Meta: %s", resp.text)
    except Exception as exc:
        logger.error("Error generating/uploading dynamic ticket image: %s", exc)
    return None


async def send_whatsapp_message(
    *,
    phone: str,
    event_type: str,
    variables: list[str],
    org_id: uuid.UUID,
    token_id: Optional[uuid.UUID] = None,
    queue_id: Optional[uuid.UUID] = None,
    customer_name: Optional[str] = None,
    session_id: Optional[uuid.UUID] = None,
    is_raw_text: bool = False,
    raw_body: Optional[str] = None,
) -> None:
    """
    Main entry point for sending a WhatsApp message.
    - Fire-and-forget: never raises.
    - Stores record in DB before sending.
    - Updates status after Meta API response.
    """
    try:
        phone_normalized = _normalize_phone(phone)
        if not phone_normalized.startswith("+"):
            logger.warning(
                "WhatsApp: phone not in E.164 format, skipping | phone=%s", phone
            )
            return

        template_name = None
        template_language = "en"
        rendered_body = None
        
        if is_raw_text and raw_body:
            rendered_body = raw_body
        elif event_type == "test":
            template_name = "ticket_confirmed_v1"
            template_language = "en"
            custom_msg = variables[0] if variables else "Test notification"
            variables = [
                "Super Admin",
                "TEST-01",
                "0",
                "https://q4queue.com",
                "https://q4queue.com",
                "QRQ Testing",
                custom_msg or "General Queue"
            ]
            rendered_body = f"Test WhatsApp notification delivered to {phone_normalized}"
        else:
            # Get template
            template_obj, rendered_body, err = await get_rendered_template(event_type, variables)
            if err or not template_obj:
                logger.warning("WhatsApp template error | event=%s err=%s", event_type, err)
                template_name = f"fallback_{event_type}"
                rendered_body = f"Event: {event_type} | Variables: {variables}"
            else:
                template_name = template_obj.template_name
                template_language = template_obj.language

        # Store message record (status=pending)
        msg = await _store_message(
            org_id=org_id,
            queue_id=queue_id,
            token_id=token_id,
            phone=phone_normalized,
            customer_name=customer_name,
            event_type=event_type,
            template_name=template_name,
            template_variables=variables,
            rendered_body=rendered_body,
            session_id=session_id,
        )

        # Get credentials (resolving per-org custom phone_number_id if configured, else global default)
        cfg = await get_global_config_dict(org_id=org_id)
        access_token = cfg["access_token"]
        phone_number_id = cfg["phone_number_id"]
        api_version = cfg["api_version"]

        if not access_token or not phone_number_id:
            logger.info(
                "WhatsApp: credentials not configured, message stored as pending | msg_id=%s",
                msg.id,
            )
            return

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone_normalized.lstrip("+"),
        }
        
        if is_raw_text and raw_body:
            payload["type"] = "text"
            payload["text"] = {
                "preview_url": True,
                "body": raw_body
            }
        else:
            components = []
            
            # Inject Header for ticket_confirmed_v1 (Dynamic Personalized Ticket Image)
            if template_name == "ticket_confirmed_v1":
                token_num = variables[1] if len(variables) > 1 else "A-1"
                people_ahead_val = variables[2] if len(variables) > 2 else "0"
                branch_name_val = variables[5] if len(variables) > 5 else "Main Branch"
                queue_name_val = variables[6] if len(variables) > 6 else "General Queue"
                
                # Upload dynamic personalized ticket image
                media_id = await _upload_ticket_image_to_meta(
                    access_token=access_token,
                    phone_number_id=phone_number_id,
                    api_version=api_version,
                    token_number=token_num,
                    branch_name=branch_name_val,
                    queue_name=queue_name_val,
                    people_ahead=people_ahead_val,
                )
                
                # Fallback to permanent media ID if dynamic upload failed
                media_id = media_id or "1574195920759459"
                
                components.append({
                    "type": "header",
                    "parameters": [
                        {
                            "type": "image",
                            "image": {
                                "id": media_id
                            }
                        }
                    ]
                })

            if variables:
                components.append({
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": str(v).strip() if str(v).strip() else "—"}
                        for v in variables
                    ]
                })

            payload["type"] = "template"
            payload["template"] = {
                "name": template_name,
                "language": {"code": template_language},
            }
            if components:
                payload["template"]["components"] = components

        url = f"{META_API_BASE}/{api_version}/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)

        if response.status_code == 200:
            data = response.json()
            meta_message_id = (
                data.get("messages", [{}])[0].get("id")
                if data.get("messages")
                else None
            )
            await _update_message_status(
                msg.id,
                status=WhatsAppDeliveryStatus.sent,
                meta_message_id=meta_message_id,
            )
            logger.info(
                "WhatsApp sent | template=%s phone=%s meta_id=%s",
                template_name, phone_normalized, meta_message_id,
            )
        else:
            error_data = response.json()
            error_msg = str(error_data.get("error", response.text))
            error_code = str(error_data.get("error", {}).get("code", ""))
            await _update_message_status(
                msg.id,
                status=WhatsAppDeliveryStatus.failed,
                error_code=error_code,
                error_message=error_msg,
            )
            logger.warning(
                "WhatsApp send failed | template=%s phone=%s status=%d err=%s",
                template_name, phone_normalized, response.status_code, error_msg,
            )

    except Exception as exc:
        logger.error(
            "WhatsApp send exception | template=%s phone=%s err=%s",
            template_name, phone, exc,
        )
