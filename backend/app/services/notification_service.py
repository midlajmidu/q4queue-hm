"""
app/services/notification_service.py
Unified notification dispatcher — single entry point for all queue notifications.

Design:
  - All queue events call NotificationService.send()
  - Currently dispatches to WhatsApp only (Email/SMS/Push pluggable later)
  - Fire-and-forget: never raises, never blocks the main request
  - Checks org-level enable/disable before sending
  - Validates E.164 phone format before dispatching
"""
import logging
import uuid
from typing import Optional
from datetime import datetime, timezone

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.token import Token

from app.whatsapp.config_service import get_org_notification_config
from app.whatsapp.message_service import send_whatsapp_message
from app.audit.service import record_event

logger = logging.getLogger(__name__)


# ── Event → Template Variable Builders ────────────────────────────────────────
# Each function returns the list of template variables for the event.
# Variable order MUST match the template placeholders.

def build_template_variables(
    customer_name: str,
    queue_name: str,
    organization_name: str,
    token_number: str,
    current_position: str,
    tracking_url: str,
    org_display_url: str,
) -> list[str]:
    # Replace empty values with a single space
    c_name = customer_name or " "
    q_name = queue_name or " "
    o_name = organization_name or " "
    t_num = token_number or " "
    pos = str(current_position) if current_position else "0"
    
    # URL strings
    t_url = tracking_url if tracking_url else " "
    o_url = org_display_url if org_display_url else " "

    # 1: Customer Name, 2: Queue Name, 3: Org Name, 4: Token Number, 5: Position, 6: Org Display URL, 7: Tracking URL
    return [c_name, q_name, o_name, t_num, pos, o_url, t_url]


# ── Main Dispatcher ───────────────────────────────────────────────────────────

async def notify_queue_event(
    *,
    event_type: str,
    org_id: uuid.UUID,
    token_id: Optional[uuid.UUID] = None,
    queue_id: Optional[uuid.UUID] = None,
    customer_name: str,
    customer_phone: str,
    token_number: int,
    token_prefix: str = "",
    queue_name: str = "",
    position: int = 0,
    tracking_id: Optional[str] = None,
    organization_name: str = "",
    session_id: Optional[uuid.UUID] = None,
) -> None:
    """
    Dispatch a WhatsApp notification for a queue event.
    Fire-and-forget — call with BackgroundTasks.add_task().

    event_type values (v2):
      queue_joined_v2
      queue_nearby_3_v2
      queue_called_v2
      queue_skipped_v2
      queue_removed_v2
      queue_completed_v2
      test_notification_v2
    """
    try:
        # 1. Check org has WhatsApp enabled and the specific event is enabled
        cfg = await get_org_notification_config(org_id)
        if not (cfg["global_enabled"] and cfg["is_enabled"]):
            logger.debug(
                "WhatsApp disabled for org %s, skipping event=%s", org_id, event_type
            )
            return

        # Check granular toggles based on event type
        if event_type == "queue_joined_v2" and not cfg.get("notify_queue_joined", True):
            return
        if event_type == "queue_nearby_3_v2" and not cfg.get("notify_position_3", True):
            return
        if event_type == "queue_called_v2" and not cfg.get("notify_called", True):
            return
        if event_type == "queue_completed_v2" and not cfg.get("notify_completed", True):
            return
        # skipped and removed don't have toggles yet, we just allow them if globally enabled

        # 2. Validate phone
        phone = customer_phone.strip()
        if not phone.startswith("+"):
            logger.warning(
                "NotificationService: phone not E.164 for token=%s, skipping", token_id
            )
            return

        # 3. Handle Hybrid Logic
        token_str = f"{token_prefix}-{token_number}"
        is_raw_text = False
        raw_body = None
        variables = []

        if event_type == "queue_joined_v2":
            # Primary Welcome Template (Template 1)
            # Need to get org_display_id (which could be the org_id or slug). Here we'll just use org_id as slug placeholder.
            org_display_id = str(org_id)
            
            # Use env-configured frontend URL or fallback
            from app.core.config import get_settings
            settings = get_settings()
            frontend_url = getattr(settings, "FRONTEND_URL", "https://q4q.in").rstrip("/")
            track_url = f"{frontend_url}/track/{tracking_id}" if tracking_id else " "
            display_url = f"{frontend_url}/d/{org_display_id}"
            
            variables = build_template_variables(
                customer_name=customer_name,
                queue_name=queue_name,
                organization_name=organization_name,
                token_number=token_str,
                current_position=str(position),
                tracking_url=track_url,
                org_display_url=display_url,
            )
        else:
            # Events B, C, D, E require whatsapp_alerts_active check
            if not token_id:
                logger.warning("No token_id provided for non-join event %s, skipping", event_type)
                return

            now = datetime.now(timezone.utc)
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Token).where(Token.id == token_id))
                db_token = result.scalar_one_or_none()

                if not db_token:
                    logger.warning("Token %s not found in DB for event %s, skipping", token_id, event_type)
                    return
                
                if not db_token.whatsapp_alerts_active or not db_token.whatsapp_window_expires_at or db_token.whatsapp_window_expires_at < now:
                    logger.info("Token %s WhatsApp alerts inactive or window expired, skipping message for event %s", token_id, event_type)
                    return

            is_raw_text = True
            c_name = customer_name or "Customer"
            o_name = organization_name or "the business"
            
            # Use env-configured frontend URL or fallback
            from app.core.config import get_settings
            settings = get_settings()
            frontend_url = getattr(settings, "FRONTEND_URL", "https://q4q.in").rstrip("/")
            track_url = f"{frontend_url}/track/{tracking_id}" if tracking_id else ""

            if event_type == "queue_approaching_v2":
                raw_body = (
                    "⏳ *Your Turn is Near!*\n\n"
                    f"Hi *{c_name}*, quick update! There are now only 3 customers remaining ahead of you at *{o_name}*. "
                    "Please start heading toward the counter.\n\n"
                    f"📱 Track Live: {track_url}\n"
                    "_Powered by Q4Queue_"
                )
            elif event_type == "queue_called_v2":
                raw_body = (
                    "🔔 *It's Your Turn!*\n\n"
                    f"Please proceed to the counter immediately, *{c_name}*! The staff at *{o_name}* is ready to serve you now.\n\n"
                    f"🎫 *Your Token Number:* #{token_str}\n"
                    "_Powered by Q4Queue_"
                )
            elif event_type == "queue_skipped_v2":
                raw_body = (
                    "⚠️ *You Have Been Skipped*\n\n"
                    f"Hello *{c_name}*, your token was called at *{o_name}* but you were marked unavailable, so your turn has been skipped. "
                    "If you are still here, please speak to our staff immediately.\n\n"
                    f"📱 Check Status: {track_url}\n"
                    "_Powered by Q4Queue_"
                )
            elif event_type == "queue_removed_v2":
                raw_body = (
                    "❌ *Removed From Queue*\n\n"
                    f"Hello *{c_name}*, you have been removed from the queue at *{o_name}*. "
                    "If this was a mistake, please scan the venue QR code again to rejoin.\n\n"
                    "_Powered by Q4Queue_"
                )
            elif event_type == "queue_completed_v2":
                raw_body = (
                    "✅ *Session Completed*\n\n"
                    f"Thank you for visiting *{o_name}*, *{c_name}*! Your service is now complete. "
                    "We hope you had a smooth experience using our virtual queuing system.\n\n"
                    f"⭐ Rate Your Experience: {track_url}\n"
                    "_Powered by Q4Queue_"
                )
            else:
                logger.warning("Unknown event type for raw message: %s", event_type)
                return

        # 4. Send
        await send_whatsapp_message(
            phone=phone,
            event_type=event_type,
            variables=variables,
            org_id=org_id,
            token_id=token_id,
            queue_id=queue_id,
            customer_name=customer_name,
            session_id=session_id,
            is_raw_text=is_raw_text,
            raw_body=raw_body,
        )

        # 5. Audit Log
        try:
            await record_event(
                event_type=f"notification.{event_type}",
                org_id=org_id,
                user_id=None,
                resource_type="token",
                resource_id=str(token_id) if token_id else None,
                details={"phone": phone, "variables": variables, "is_raw_text": is_raw_text},
            )
        except Exception as audit_exc:
            logger.error("Failed to record audit log for notification | %s", audit_exc)

    except Exception as exc:
        logger.error(
            "NotificationService error | event=%s org=%s err=%s",
            event_type, org_id, exc,
        )
