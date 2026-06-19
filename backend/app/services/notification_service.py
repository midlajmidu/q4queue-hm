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

from app.whatsapp.config_service import get_org_notification_config
from app.whatsapp.message_service import send_whatsapp_message
from app.audit.service import record_event

logger = logging.getLogger(__name__)


# ── Event → Template Variable Builders ────────────────────────────────────────
# Each function returns the list of template variables for the event.
# Variable order MUST match the template placeholders.

def build_template_variables(
    customer_name: str,
    organization_name: str,
    token_number: str,
    current_position: str,
    tracking_url: str,
    display_url: str,
) -> list[str]:
    return [
        customer_name or "",
        organization_name or "",
        token_number or "",
        str(current_position) if current_position else "0",
        tracking_url or "",
        display_url or ""
    ]


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
      queue_nearby_5_v2
      queue_nearby_3_v2
      queue_called_v2
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
        if event_type == "queue_nearby_5_v2" and not cfg.get("notify_position_5", True):
            return
        if event_type == "queue_nearby_3_v2" and not cfg.get("notify_position_3", True):
            return
        if event_type == "queue_called_v2" and not cfg.get("notify_called", True):
            return
        if event_type == "queue_completed_v2" and not cfg.get("notify_completed", True):
            return

        # 2. Validate phone
        phone = customer_phone.strip()
        if not phone.startswith("+"):
            logger.warning(
                "NotificationService: phone not E.164 for token=%s, skipping", token_id
            )
            return

        # 3. Build base URL for tracking link
        from app.core.config import get_settings
        settings = get_settings()
        # Use env-configured frontend URL or fallback
        frontend_url = getattr(settings, "FRONTEND_URL", "")
        tracking_url = (
            f"{frontend_url}/track/{tracking_id}"
            if tracking_id and frontend_url
            else f"/track/{tracking_id}" if tracking_id else ""
        )

        # Use frontend URL or fallback to empty
        display_url = frontend_url if frontend_url else ""
        
        # 4. Build standard template variables
        full_token_number = f"{token_prefix}-{token_number}"
        org_name_to_use = organization_name if organization_name else queue_name
        
        variables = build_template_variables(
            customer_name=customer_name,
            organization_name=org_name_to_use,
            token_number=full_token_number,
            current_position=str(position),
            tracking_url=tracking_url,
            display_url=display_url
        )

        # 5. Send
        await send_whatsapp_message(
            phone=phone,
            event_type=event_type,
            variables=variables,
            org_id=org_id,
            token_id=token_id,
            queue_id=queue_id,
            customer_name=customer_name,
            session_id=session_id,
        )

        # 6. Audit Log
        try:
            await record_event(
                event_type=f"notification.{event_type}",
                org_id=org_id,
                user_id=None,
                resource_type="token",
                resource_id=str(token_id) if token_id else None,
                details={"phone": phone, "variables": variables},
            )
        except Exception as audit_exc:
            logger.error("Failed to record audit log for notification | %s", audit_exc)

    except Exception as exc:
        logger.error(
            "NotificationService error | event=%s org=%s err=%s",
            event_type, org_id, exc,
        )
