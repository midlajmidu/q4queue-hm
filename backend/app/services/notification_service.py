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
      queue_nearby_5_v2
      queue_nearby_3_v2
      queue_called_v2
      queue_skipped_v2
      queue_recalled_v2
      queue_removed_v2
      queue_completed_v2
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
        if event_type == "queue_nearby_5_v2" and not cfg.get("notify_position_5", True):
            return
        if event_type == "queue_nearby_3_v2" and not cfg.get("notify_position_3", True):
            return
        if event_type in ("queue_called_v2", "queue_called_v3") and not cfg.get("notify_called", True):
            return
        if event_type == "queue_completed_v2" and not cfg.get("notify_completed", True):
            return
        if event_type == "queue_skipped_v2" and not cfg.get("notify_skipped", True):
            return
        if event_type == "queue_recalled_v2" and not cfg.get("notify_recalled", True):
            return
        if event_type == "queue_removed_v2" and not cfg.get("notify_removed", True):
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

        if event_type in ("queue_joined_v4", "queue_called_v3"):
            # These templates bypass the opt-in and 24-hour window checks
            # Use env-configured frontend URL or fallback
            from app.core.config import get_settings
            settings = get_settings()
            frontend_url = getattr(settings, "FRONTEND_URL", "https://amoebaq.com").rstrip("/")
            track_url = f"{frontend_url}/track/{tracking_id}" if tracking_id else ""
            display_url = f"{frontend_url}/d/{queue_id}"
            
            org_name_to_use = organization_name if organization_name else queue_name
            c_name = customer_name or "Customer"
            
            if event_type == "queue_joined_v4":
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
                # queue_called_v3 variables: Name, Org Name, Token, Position, Tracking URL, Display URL
                variables = [
                    {"type": "text", "text": c_name},
                    {"type": "text", "text": org_name_to_use},
                    {"type": "text", "text": token_str},
                    {"type": "text", "text": str(position) if position else "0"},
                    {"type": "text", "text": track_url},
                    {"type": "text", "text": display_url}
                ]
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
                    
                    from app.whatsapp.message_service import log_skipped_whatsapp_message
                    import asyncio
                    
                    if getattr(db_token, "entry_type", "qr") == "manual":
                        reason = "Manual entry (staff joined). Customer has not scanned the QR to opt-in."
                    elif not db_token.whatsapp_alerts_active:
                        reason = "Customer has not clicked 'Get Live Updates' on WhatsApp."
                    else:
                        reason = "The 24-hour WhatsApp service window has expired."
                    
                    asyncio.create_task(
                        log_skipped_whatsapp_message(
                            org_id=org_id,
                            phone=customer_phone,
                            event_type=event_type,
                            reason=reason,
                            queue_id=queue_id,
                            token_id=token_id,
                            customer_name=customer_name,
                            session_id=session_id,
                        )
                    )
                    return

            # Since only queue_joined_v4 is a Meta-approved template, all subsequent events are raw text
            is_raw_text = True
            
            c_name = customer_name or "Customer"
            o_name = organization_name or queue_name or "the business"
            
            # Use env-configured frontend URL or fallback
            from app.core.config import get_settings
            settings = get_settings()
            frontend_url = getattr(settings, "FRONTEND_URL", "https://amoebaq.com").rstrip("/")
            track_url = f"{frontend_url}/track/{tracking_id}" if tracking_id else ""
            display_url = f"{frontend_url}/d/{queue_id}"
            
            # Build variables for all template-based non-join events
            # Format: 1: Name, 2: Org Name, 3: Token, 4: Position, 5: Tracking URL, 6: Display URL
            if not is_raw_text:
                variables = [
                    c_name,
                    o_name,
                    token_str,
                    str(position) if position else "0",
                    track_url,
                    display_url
                ]

            if event_type == "queue_nearby_5_v2":
                raw_body = (
                    "⏳ *Queue Update*\n\n"
                    f"Hi *{c_name}*, there are currently 5 customers remaining ahead of you at *{o_name}*. "
                    "We will notify you again when your turn is closer.\n\n"
                    f"📱 Track Live: {track_url}\n"
                    "_Powered by Q4Queue_"
                )
            elif event_type == "queue_approaching_v2" or event_type == "queue_nearby_3_v2":
                raw_body = (
                    f"⏳ *Almost Your Turn, {c_name}!*\n\n"
                    f"Only *3 customers ahead* of you at *{o_name}*. "
                    "Please start making your way to the counter.\n\n"
                    f"🎫 Your Token: #{token_str}\n"
                    f"📱 Track Live: {track_url}\n"
                    "_Powered by Q4Queue_"
                )
            elif event_type == "queue_called_v2":
                line_info = f"➡️ *Please go to Service Lane {assigned_line}*\n\n" if assigned_line else ""
                raw_body = (
                    "🔔 *It's Your Turn!*\n\n"
                    f"Please proceed to the counter immediately, *{c_name}*! The staff at *{o_name}* is ready to serve you now.\n\n"
                    f"🎫 *Your Token Number:* #{token_str}\n\n"
                    f"{line_info}"
                    "_Powered by Q4Queue_"
                )
            elif event_type == "queue_completed_v2":
                raw_body = (
                    "✅ *Session Completed*\n\n"
                    f"Thank you for visiting *{o_name}*, *{c_name}*! Your service is now complete. "
                    "We hope you had a smooth experience using our virtual queuing system.\n\n"
                    "_Powered by Q4Queue_"
                )
            elif event_type == "queue_skipped_v2":
                raw_body = (
                    "⚠️ *Token Skipped*\n\n"
                    f"Hi *{c_name}*, you were called to the counter at *{o_name}* but did not appear, so your token #{token_str} was skipped.\n\n"
                    f"📱 Check Status: {track_url}\n"
                    "_Powered by Q4Queue_"
                )
            elif event_type == "queue_removed_v2":
                raw_body = (
                    "❌ *Removed from Queue*\n\n"
                    f"Hi *{c_name}*, your token #{token_str} has been removed from the queue at *{o_name}*.\n\n"
                    f"📱 Check Status: {track_url}\n"
                    "_Powered by Q4Queue_"
                )
            elif event_type == "queue_recalled_v2":
                line_info = f"➡️ *Please go to Service Lane {assigned_line}*\n\n" if assigned_line else ""
                raw_body = (
                    "🔄 *Token Recalled!*\n\n"
                    f"Hi *{c_name}*, good news! Your skipped token #{token_str} has been recalled to the counter at *{o_name}*.\n"
                    "Please proceed to the counter immediately.\n\n"
                    f"{line_info}"
                    f"📱 Check Status: {track_url}\n"
                    "_Powered by Q4Queue_"
                )
            elif is_raw_text:
                logger.warning("Unknown event type for raw message: %s", event_type)
                return

        # 3.5 Rate limit via Redis
        if event_type not in ("queue_called_v2", "queue_called_v3", "queue_joined_v4"):
            try:
                redis_client = get_redis()
                rl_key = f"wa_throttle:{token_id}"
                # Set key if not exists (NX) with 15 sec expiry (EX)
                acquired = await redis_client.set(rl_key, "1", ex=15, nx=True)
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
