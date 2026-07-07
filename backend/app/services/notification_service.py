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
from app.redis.client import get_redis

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
    display_url: str,
    tracking_url: str,
) -> list[str]:
    return [
        customer_name or "",
        queue_name or "",
        organization_name or "",
        token_number or "",
        str(current_position) if current_position else "0",
        display_url or "",
        tracking_url or ""
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
    assigned_line: Optional[int] = None,
) -> None:
    """
    Dispatch a WhatsApp notification for a queue event.
    Fire-and-forget — call with BackgroundTasks.add_task().

    event_type values (v4):
      queue_joined_v4
      queue_nearby_5_v3
      queue_nearby_3_v3
      queue_called_v3
      queue_skipped_v3
      queue_recalled_v2
      queue_removed_v3
      queue_completed_v3
      test_notification_v2
    """
    try:
        # -- DASHBOARD NOTIFICATIONS (Internal) --
        # All internal queue event notifications (joined, skipped, removed, called, completed) 
        # have been disabled to keep the notification tray exclusively for high wait time alerts.
        pass

        # 1. Check org has WhatsApp enabled and the specific event is enabled
        cfg = await get_org_notification_config(org_id)
        if not (cfg["global_enabled"] and cfg["is_enabled"]):
            logger.debug(
                "WhatsApp disabled for org %s, skipping event=%s", org_id, event_type
            )
            return

        # Check granular toggles based on event type
        if event_type == "queue_joined_v4" and not cfg.get("notify_queue_joined", True):
            return
        if event_type == "queue_nearby_5_v3" and not cfg.get("notify_position_5", True):
            return
        if event_type == "queue_nearby_3_v3" and not cfg.get("notify_position_3", True):
            return
        if event_type in ("queue_called_v2", "queue_called_v3") and not cfg.get("notify_called", True):
            return
        if event_type == "queue_completed_v3" and not cfg.get("notify_completed", True):
            return
        if event_type == "queue_skipped_v3" and not cfg.get("notify_skipped", True):
            return
        if event_type == "queue_recalled_v2" and not cfg.get("notify_recalled", True):
            return
        if event_type == "queue_removed_v3" and not cfg.get("notify_removed", True):
            return



        # 2. Validate phone
        phone = customer_phone.strip()
        if not phone.startswith("+"):
            logger.warning(
                "NotificationService: phone not E.164 for token=%s, skipping", token_id
            )
            return

        # 3. Fetch missing organization name if needed
        if not organization_name:
            from app.models.organization import Organization
            async with AsyncSessionLocal() as db:
                org_res = await db.execute(select(Organization).where(Organization.id == org_id))
                org = org_res.scalar_one_or_none()
                if org and org.name:
                    organization_name = org.name

        # 4. Handle Hybrid Logic
        token_str = f"{token_prefix}-{token_number}"
        is_raw_text = False
        raw_body = None
        variables = []

        # Upgrade any v2 events emitted by the system to v3
        if event_type == "queue_called_v2": event_type = "queue_called_v3"
        elif event_type == "queue_skipped_v2": event_type = "queue_skipped_v3"

        org_name_to_use = organization_name if organization_name else queue_name
        c_name = customer_name or "Customer"

        if event_type == "queue_joined_v4":
            # joined template still bypasses and uses original variables
            from app.core.config import get_settings
            settings = get_settings()
            frontend_url = getattr(settings, "FRONTEND_URL", "https://amoebaq.com").rstrip("/")
            track_url = f"{frontend_url}/track/{tracking_id}" if tracking_id else ""
            display_url = f"{frontend_url}/d/{queue_id}"
            
            variables = build_template_variables(
                customer_name=c_name,
                queue_name=queue_name,
                organization_name=org_name_to_use,
                token_number=token_str,
                current_position=str(position),
                tracking_url=track_url,
                display_url=display_url,
            )
        else:
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
                
                if db_token.whatsapp_alerts_active and db_token.whatsapp_window_expires_at and db_token.whatsapp_window_expires_at >= now:
                    # User opted in -> cheaper service conversation
                    is_raw_text = True
                else:
                    # User did NOT opt in -> approved Meta template (utility conversation)
                    is_raw_text = False

            # Build standard variables
            base_vars = [
                c_name,
                queue_name or org_name_to_use,
                org_name_to_use,
                token_str
            ]

            if event_type in ("queue_called_v3", "queue_recalled_v2"):
                dest = f"Service Lane {assigned_line}" if assigned_line else "the counter"
                variables = base_vars + [dest]
                if is_raw_text:
                    action = "ready to serve you now" if event_type == "queue_called_v3" else "calling you again"
                    header = "It's Your Turn!" if event_type == "queue_called_v3" else "Token Recalled!"
                    raw_body = (
                        f"*{header}*\n\n"
                        f"Please proceed to {dest} immediately, {c_name}! The staff at {org_name_to_use} ({queue_name or org_name_to_use}) is {action}.\n\n"
                        f"🎫 *Your Queue Ticket:* {token_str}\n\n"
                        "Thank you.\n\n"
                        "_Powered by Q4Queue_"
                    )
            elif event_type in ("queue_nearby_5_v3", "queue_nearby_3_v3"):
                pos_str = str(position) if position else "0"
                
                serving_token_str = "-"
                try:
                    from sqlalchemy import desc
                    async with AsyncSessionLocal() as db_session:
                        serving_res = await db_session.execute(
                            select(Token).where(
                                Token.queue_id == queue_id,
                                Token.status == "serving"
                            ).order_by(desc(Token.served_at)).limit(1)
                        )
                        serving_token = serving_res.scalar_one_or_none()
                        if serving_token:
                            serving_token_str = f"{serving_token.token_prefix}-{serving_token.token_number}"
                except Exception as e:
                    logger.warning("Could not fetch serving token: %s", e)

                variables = base_vars + [pos_str, serving_token_str]
                if is_raw_text:
                    header = "Queue Update" if event_type == "queue_nearby_5_v3" else "Almost Your Turn!"
                    prefix = "Almost your turn" if event_type == "queue_nearby_5_v3" else "Get ready"
                    suffix = "Please start heading towards the counter!" if event_type == "queue_nearby_5_v3" else "Please be ready — you will be called very soon!"
                    raw_body = (
                        f"*{header}*\n\n"
                        f"{prefix}, {c_name}! Only {pos_str} people remaining before you at {org_name_to_use} ({queue_name or org_name_to_use}).\n\n"
                        f"🎫 *Your Queue Ticket:* {token_str}\n"
                        f"🔢 *Current Serving Token:* {serving_token_str}\n\n"
                        f"{suffix}\n\n"
                        "_Powered by Q4Queue_"
                    )
            elif event_type == "queue_completed_v3":
                variables = base_vars
                if is_raw_text:
                    raw_body = (
                        "👉 *Service Completed*\n\n"
                        f"Thank you, {c_name}! Your service at {org_name_to_use} ({queue_name or org_name_to_use}) has been completed.\n\n"
                        f"🎫 *Your Queue Ticket:* {token_str}\n\n"
                        "We hope you had a great experience. Have a wonderful day!\n\n"
                        "_Powered by Q4Queue_"
                    )
            elif event_type == "queue_skipped_v3":
                variables = base_vars
                if is_raw_text:
                    raw_body = (
                        "⚠️ *Token Skipped*\n\n"
                        f"You have been skipped, {c_name}. Your ticket was called at {org_name_to_use} ({queue_name or org_name_to_use}) but you were marked unavailable.\n\n"
                        f"🎫 *Your Queue Ticket:* {token_str}\n\n"
                        "If you are still here, please speak to our staff immediately.\n\n"
                        "_Powered by Q4Queue_"
                    )
            elif event_type == "queue_removed_v3":
                variables = base_vars
                if is_raw_text:
                    raw_body = (
                        "❌ *Removed from Queue*\n\n"
                        f"Removed from queue, {c_name}. You have been removed from the queue at {org_name_to_use} ({queue_name or org_name_to_use}).\n\n"
                        f"🎫 *Your Queue Ticket:* {token_str}\n\n"
                        "If this was a mistake, please scan the venue QR code again to rejoin.\n\n"
                        "_Powered by Q4Queue_"
                    )
            elif is_raw_text:
                logger.warning("Unknown event type for raw message: %s", event_type)
                return

        # 3.5 Rate limit via Redis
        try:
            redis_client = get_redis()
            
            # Determine throttle expiry based on event_type
            if event_type in ("queue_joined_v4", "queue_called_v3", "queue_skipped_v3", "queue_recalled_v2"):
                expiry = 3  # 3 seconds for critical events (prevents UI double-clicks)
            else:
                expiry = 15 # 15 seconds for others (like nearby)
            
            # Use event-specific key so a 15s 'nearby' lock doesn't block a critical 'called' event
            rl_key = f"wa_throttle:{token_id}:{event_type}"
            
            # Set key if not exists (NX)
            acquired = await redis_client.set(rl_key, "1", ex=expiry, nx=True)
            if not acquired:
                logger.info("WhatsApp throttled for token %s (event=%s)", token_id, event_type)
                return
        except Exception as e:
            logger.warning("Redis rate limit check failed, proceeding anyway: %s", e)

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
