"""
app/whatsapp/template_service.py
Manages WhatsApp message templates stored in DB.
Super Admin can create/edit/delete templates via the UI.
"""
import logging
import uuid
from typing import Optional

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.whatsapp.models import WhatsAppTemplate, WhatsAppTemplateStatus
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

DEFAULT_TEMPLATES = [
    {
        "template_name": "queue_joined_v4",
        "event_type": "queue_joined_v4",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a customer joins a queue (via QR or manual entry)",
        "body_text": (
            "Hello {{1}}, you're in the {{2}} queue at {{3}}.\n\n"
            "🎫 Your Ticket: {{4}}\n"
            "👥 Current Position: {{5}}\n\n"
            "📺 Display: {{6}}\n\n"
            "📱 Tracking: {{7}}\n\n"
            "Tap below to receive live queue updates directly in WhatsApp.\n\n"
            "Powered by Q4Queue"
        ),
        "variables": {
            "1": "Customer Name",
            "2": "Queue Name",
            "3": "Organization Name",
            "4": "Token Number",
            "5": "Current Position",
            "6": "Display URL",
            "7": "Tracking URL",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "queue_nearby_5_v3",
        "event_type": "queue_nearby_5_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Reminder sent when customer's position reaches 5",
        "body_text": (
            "Almost your turn, {{1}}! Only {{5}} people remaining before you at {{3}} ({{2}}).\n\n"
            "🎫 *Your Queue Ticket:* {{4}}\n"
            "🔢 *Current Serving Token:* {{6}}\n\n"
            "Please start heading towards the counter!"
        ),
        "variables": {
            "1": "Customer Name",
            "2": "Queue Name",
            "3": "Organization Name",
            "4": "Token Number",
            "5": "Current Position",
            "6": "Current Serving Token",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "queue_nearby_3_v3",
        "event_type": "queue_nearby_3_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Reminder sent when customer's position reaches 3",
        "body_text": (
            "Get ready, {{1}}! Only {{5}} people remaining before you at {{3}} ({{2}}).\n\n"
            "🎫 *Your Queue Ticket:* {{4}}\n"
            "🔢 *Current Serving Token:* {{6}}\n\n"
            "Please be ready — you will be called very soon!"
        ),
        "variables": {
            "1": "Customer Name",
            "2": "Queue Name",
            "3": "Organization Name",
            "4": "Token Number",
            "5": "Current Position",
            "6": "Current Serving Token",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "queue_called_v3",
        "event_type": "queue_called_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a customer's token is called to be served",
        "body_text": (
            "Please proceed to {{5}} immediately, {{1}}! The staff at {{3}} ({{2}}) is ready to serve you now.\n\n"
            "🎫 *Your Queue Ticket:* {{4}}\n\n"
            "Thank you."
        ),
        "variables": {
            "1": "Customer Name",
            "2": "Queue Name",
            "3": "Organization Name",
            "4": "Token Number",
            "5": "Counter or Service Lane",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "queue_completed_v3",
        "event_type": "queue_completed_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a customer's service is completed",
        "body_text": (
            "Thank you, {{1}}! Your service at {{3}} ({{2}}) has been completed.\n\n"
            "🎫 *Your Queue Ticket:* {{4}}\n\n"
            "We hope you had a great experience. Have a wonderful day!"
        ),
        "variables": {
            "1": "Customer Name",
            "2": "Queue Name",
            "3": "Organization Name",
            "4": "Token Number",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "test_notification_v2",
        "event_type": "test_notification_v2",
        "category": "UTILITY",
        "language": "en",
        "description": "Test notification template",
        "body_text": (
            "🧪 Test Notification for {{1}}\n\n"
            "Organization: *{{2}}*\n"
            "Token: {{3}}\n"
            "Position: {{4}}\n\n"
            "Tracking URL: {{5}}\n"
            "Display URL: {{6}}\n\n"
            "This is a system test."
        ),
        "variables": {
            "1": "Customer Name",
            "2": "Organization Name",
            "3": "Token Number",
            "4": "Current Position",
            "5": "Tracking URL",
            "6": "Display URL",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "queue_skipped_v3",
        "event_type": "queue_skipped_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a customer's token is skipped",
        "body_text": (
            "You have been skipped, {{1}}. Your ticket was called at {{3}} ({{2}}) but you were marked unavailable.\n\n"
            "🎫 *Your Queue Ticket:* {{4}}\n\n"
            "If you are still here, please speak to our staff immediately."
        ),
        "variables": {
            "1": "Customer Name",
            "2": "Queue Name",
            "3": "Organization Name",
            "4": "Token Number",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "queue_removed_v3",
        "event_type": "queue_removed_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a customer is removed from the queue",
        "body_text": (
            "Removed from queue, {{1}}. You have been removed from the queue at {{3}} ({{2}}).\n\n"
            "🎫 *Your Queue Ticket:* {{4}}\n\n"
            "If this was a mistake, please scan the venue QR code again to rejoin."
        ),
        "variables": {
            "1": "Customer Name",
            "2": "Queue Name",
            "3": "Organization Name",
            "4": "Token Number",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "queue_recalled_v3",
        "event_type": "queue_recalled_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a skipped customer is re-called by staff",
        "body_text": (
            "You have been recalled, {{1}}! The staff at {{3}} ({{2}}) is calling you again. Please proceed to {{5}} immediately.\n\n"
            "🎫 *Your Queue Ticket:* {{4}}\n\n"
            "Thank you."
        ),
        "variables": {
            "1": "Customer Name",
            "2": "Queue Name",
            "3": "Organization Name",
            "4": "Token Number",
            "5": "Counter or Service Lane",
        },
        "status": WhatsAppTemplateStatus.approved,
    }
]


# ── Template CRUD ─────────────────────────────────────────────────────────────

async def seed_default_templates(db: AsyncSession) -> None:
    """Seed default templates that don't yet exist. Called at startup.
    Uses per-template upsert so new templates are added without wiping existing ones.
    """
    # Get all existing template names
    existing_result = await db.execute(
        select(WhatsAppTemplate.template_name)
    )
    existing_names = {row[0] for row in existing_result.fetchall()}

    added = 0
    for tpl in DEFAULT_TEMPLATES:
        if tpl["template_name"] not in existing_names:
            template = WhatsAppTemplate(**tpl)
            db.add(template)
            added += 1

    if added:
        await db.commit()
        logger.info("✓ WhatsApp templates seeded (%d new templates added)", added)
    else:
        logger.debug("WhatsApp templates: no new templates to seed")


async def list_templates(db: AsyncSession) -> list[WhatsAppTemplate]:
    result = await db.execute(
        select(WhatsAppTemplate).order_by(WhatsAppTemplate.template_name)
    )
    return list(result.scalars().all())


async def get_template_by_name(
    db: AsyncSession, template_name: str
) -> Optional[WhatsAppTemplate]:
    result = await db.execute(
        select(WhatsAppTemplate).where(WhatsAppTemplate.template_name == template_name)
    )
    return result.scalar_one_or_none()


async def get_template_by_event(
    db: AsyncSession, event_type: str
) -> Optional[WhatsAppTemplate]:
    """Fetch the template mapped to a specific queue event."""
    result = await db.execute(
        select(WhatsAppTemplate).where(
            WhatsAppTemplate.event_type == event_type,
            WhatsAppTemplate.status == WhatsAppTemplateStatus.approved,
        )
    )
    return result.scalar_one_or_none()


async def get_template_by_id(
    db: AsyncSession, template_id: uuid.UUID
) -> Optional[WhatsAppTemplate]:
    result = await db.execute(
        select(WhatsAppTemplate).where(WhatsAppTemplate.id == template_id)
    )
    return result.scalar_one_or_none()


async def create_template(db: AsyncSession, data: dict) -> WhatsAppTemplate:
    template = WhatsAppTemplate(**data)
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


async def update_template(
    db: AsyncSession, template_id: uuid.UUID, data: dict
) -> Optional[WhatsAppTemplate]:
    template = await get_template_by_id(db, template_id)
    if template is None:
        return None
    for key, value in data.items():
        if hasattr(template, key):
            setattr(template, key, value)
    await db.commit()
    await db.refresh(template)
    return template


async def delete_template(
    db: AsyncSession, template_id: uuid.UUID
) -> bool:
    template = await get_template_by_id(db, template_id)
    if template is None:
        return False
    await db.delete(template)
    await db.commit()
    return True


# ── Template Rendering ────────────────────────────────────────────────────────

def render_template(body_text: str, variables: list[str]) -> str:
    """
    Replace {{1}}, {{2}}, ... placeholders with actual values.
    variables is a 0-indexed list: variables[0] → {{1}}, etc.
    """
    result = body_text
    for i, value in enumerate(variables, start=1):
        result = result.replace(f"{{{{{i}}}}}", str(value))
    return result


async def get_rendered_template(
    event_type: str, variables: list[str]
) -> tuple[Optional[WhatsAppTemplate], Optional[str], Optional[str]]:
    """
    Return (template, rendered_body, error) for an event type.
    Returns (None, None, error_msg) if template not found/approved.
    """
    async with AsyncSessionLocal() as db:
        template = await get_template_by_event(db, event_type)

    if template is None:
        return None, None, f"No approved template for event '{event_type}'"

    rendered = render_template(template.body_text, variables)
    return template, rendered, None
