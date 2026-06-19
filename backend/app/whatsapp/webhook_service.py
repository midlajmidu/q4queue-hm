"""
app/whatsapp/webhook_service.py
Processes incoming Meta WhatsApp webhook events.

Meta sends two types of events:
  1. messages  → incoming customer message (we don't use these yet)
  2. statuses  → delivery status updates (sent / delivered / read / failed)

Design:
  - Verification: GET with challenge response
  - Processing: POST with event payload, updates DB records
  - Raw payload always stored in whatsapp_webhook_logs
  - Never raises — logs errors and returns gracefully
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.whatsapp.models import (
    WhatsAppMessage,
    WhatsAppWebhookLog,
    WhatsAppDeliveryStatus,
)
from app.db.session import AsyncSessionLocal
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Webhook Verification ──────────────────────────────────────────────────────

def verify_webhook(mode: str, token: str, challenge: str) -> tuple[bool, str]:
    """
    Verify Meta's webhook subscription challenge.
    Returns (success, challenge_or_error).
    """
    if mode != "subscribe":
        return False, "Invalid mode"

    expected_token = settings.WHATSAPP_VERIFY_TOKEN
    if token != expected_token:
        logger.warning("Webhook verification failed: token mismatch")
        return False, "Token mismatch"

    logger.info("WhatsApp webhook verified successfully")
    return True, challenge


# ── Status Mapping ────────────────────────────────────────────────────────────

_STATUS_MAP = {
    "sent": WhatsAppDeliveryStatus.sent,
    "delivered": WhatsAppDeliveryStatus.delivered,
    "read": WhatsAppDeliveryStatus.read,
    "failed": WhatsAppDeliveryStatus.failed,
}


# ── Webhook Processing ────────────────────────────────────────────────────────

async def process_webhook(payload: dict) -> None:
    """
    Process a Meta WhatsApp webhook payload.
    Stores raw payload, then updates message delivery statuses.
    Fire-and-forget — never raises.
    """
    try:
        await _process_webhook_internal(payload)
    except Exception as exc:
        logger.error("Webhook processing error: %s", exc)


async def _process_webhook_internal(payload: dict) -> None:
    now = datetime.now(timezone.utc)

    # Extract all status events from the nested payload structure
    entries = payload.get("entry", [])
    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})

            # ── Delivery Status Updates ───────────────────────────
            statuses = value.get("statuses", [])
            for status_obj in statuses:
                meta_message_id = status_obj.get("id")
                raw_status = status_obj.get("status", "")
                phone = status_obj.get("recipient_id", "")
                timestamp_str = status_obj.get("timestamp")

                event_type = f"status.{raw_status}"
                delivery_status = _STATUS_MAP.get(raw_status)

                # Store raw webhook log
                await _store_webhook_log(
                    meta_message_id=meta_message_id,
                    event_type=event_type,
                    payload=status_obj,
                    phone=phone,
                )

                if not delivery_status or not meta_message_id:
                    continue

                # Compute timestamp
                try:
                    ts = datetime.fromtimestamp(int(timestamp_str), tz=timezone.utc) if timestamp_str else now
                except Exception:
                    ts = now

                # Prepare error details
                errors = status_obj.get("errors", [])
                error_code = str(errors[0].get("code", "")) if errors else None
                error_desc = errors[0].get("title", "Unknown error") if errors else None

                # Update message record
                await _update_message_by_meta_id(
                    meta_message_id=meta_message_id,
                    status=delivery_status,
                    timestamp=ts,
                    error_info=status_obj.get("errors", []),
                )

            # ── Incoming Messages (log only for now) ──────────────
            messages = value.get("messages", [])
            for msg_obj in messages:
                meta_message_id = msg_obj.get("id")
                phone = msg_obj.get("from", "")
                await _store_webhook_log(
                    meta_message_id=meta_message_id,
                    event_type="incoming_message",
                    payload=msg_obj,
                    phone=phone,
                )
                logger.info("WhatsApp incoming message from %s (not processed)", phone)


async def _store_webhook_log(
    *,
    meta_message_id: str | None,
    event_type: str,
    payload: dict,
    phone: str | None = None,
) -> None:
    """Store raw webhook payload in the log table."""
    try:
        async with AsyncSessionLocal() as db:
            log = WhatsAppWebhookLog(
                meta_message_id=meta_message_id,
                event_type=event_type,
                payload=payload,
                phone=phone,
                processed=True,
            )
            db.add(log)
            await db.commit()
    except Exception as exc:
        logger.error("Failed to store webhook log: %s", exc)


async def _update_message_by_meta_id(
    *,
    meta_message_id: str,
    status: WhatsAppDeliveryStatus,
    timestamp: datetime,
    error_info: list,
) -> None:
    """Update whatsapp_messages row by Meta's message ID."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(WhatsAppMessage).where(
                    WhatsAppMessage.meta_message_id == meta_message_id
                )
            )
            msg = result.scalar_one_or_none()
            if msg is None:
                logger.debug(
                    "Webhook: no message found for meta_id=%s", meta_message_id
                )
                return

            msg.status = status

            if status == WhatsAppDeliveryStatus.delivered:
                msg.delivered_at = timestamp
            elif status == WhatsAppDeliveryStatus.read:
                msg.read_at = timestamp
            elif status == WhatsAppDeliveryStatus.failed:
                msg.failed_at = timestamp
                if error_info:
                    err = error_info[0]
                    msg.error_code = str(err.get("code", ""))
                    msg.error_message = err.get("title", "Unknown error")

            await db.commit()
            logger.info(
                "WhatsApp delivery update | meta_id=%s status=%s",
                meta_message_id, status,
            )
    except Exception as exc:
        logger.error(
            "Failed to update message status | meta_id=%s err=%s",
            meta_message_id, exc,
        )
