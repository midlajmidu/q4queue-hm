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
    Does NOT add country code — that's the caller's responsibility.
    """
    cleaned = (
        phone.strip()
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )
    # If it doesn't start with +, don't add one — we can't guess country code
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
            rendered_body = variables[0] if variables else "Test notification"
            template_name = "test_notification_v2"
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

        # Get credentials
        cfg = await get_global_config_dict()
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
            
            # Inject Header for ticket_confirmed_v1 (Image)
            if template_name == "ticket_confirmed_v1":
                components.append({
                    "type": "header",
                    "parameters": [
                        {
                            "type": "image",
                            "image": {
                                # TODO: Replace with actual dynamic ticket image generator URL
                                "link": "https://www.w3.org/html/logo/downloads/HTML5_Logo_512.png"
                            }
                        }
                    ]
                })

            if variables:
                components.append({
                    "type": "body",
                    "parameters": [{"type": "text", "text": str(v)} for v in variables]
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
                "WhatsApp sent | event=%s phone=%s meta_id=%s",
                event_type, phone_normalized, meta_message_id,
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
                "WhatsApp send failed | event=%s phone=%s status=%d err=%s",
                event_type, phone_normalized, response.status_code, error_msg,
            )

    except Exception as exc:
        logger.error(
            "WhatsApp send exception | event=%s phone=%s err=%s",
            event_type, phone, exc,
        )
