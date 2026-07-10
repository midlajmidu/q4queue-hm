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
        "template_name": "ticket_confirmed_v1",
        "event_type": "queue_joined_v4",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a customer joins a queue",
        "body_text": (
            "Greetings, {{1}}!\n\n"
            "🎟️ Your queue ticket has been confirmed.\n\n"
            "🎫 Ticket Number: {{2}}\n"
            "👥 People Ahead: {{3}}\n\n"
            "Track your queue:\n{{4}}\n\n"
            "View Live Display:\n{{5}}\n\n"
            "🏢 Branch: {{6}}\n"
            "📋 Queue: {{7}}\n\n"
            "We'll keep you updated as your turn gets closer."
        ),
        "variables": {
            "1": "Customer Name",
            "2": "Ticket Number",
            "3": "People Ahead",
            "4": "Queue Tracking URL",
            "5": "Live Display URL",
            "6": "Branch Name",
            "7": "Queue Name",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "queue_update_5_v1",
        "event_type": "queue_nearby_5_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Reminder sent when position reaches 5",
        "body_text": (
            "Your turn is getting closer.\n\n"
            "🎫 Ticket Number: {{1}}\n"
            "👥 Only 5 people are ahead of you.\n\n"
            "Please be ready.\n\n"
            "Track your queue:\n{{2}}"
        ),
        "variables": {
            "1": "Ticket Number",
            "2": "Queue Tracking URL",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "queue_update_3_v1",
        "event_type": "queue_nearby_3_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Reminder sent when position reaches 3",
        "body_text": (
            "Your turn is almost here! Only 3 people are ahead of you.\n\n"
            "🎫 Ticket Number: {{1}}\n"
            "📋 Queue: {{2}}\n"
            "👥 People Ahead: 3\n\n"
            "Please head towards the service area and be ready."
        ),
        "variables": {
            "1": "Ticket Number",
            "2": "Queue Name",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "token_called_v1",
        "event_type": "queue_called_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a customer's token is called to be served",
        "body_text": (
            "Please proceed to {{3}}.\n\n"
            "🎫 Ticket Number: {{1}}\n"
            "📋 Queue: {{2}}\n\n"
            "Our staff is ready to assist you."
        ),
        "variables": {
            "1": "Ticket Number",
            "2": "Queue Name",
            "3": "Destination",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "service_completed_v1",
        "event_type": "queue_completed_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a customer's service is completed",
        "body_text": (
            "Your visit has been completed successfully.\n\n"
            "🎫 Ticket Number: {{1}}\n"
            "📋 Queue: {{2}}\n\n"
            "Thank you for choosing {{3}}."
        ),
        "variables": {
            "1": "Ticket Number",
            "2": "Queue Name",
            "3": "Business Name",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "token_skipped_v1",
        "event_type": "queue_skipped_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a customer's token is skipped",
        "body_text": (
            "Your ticket was skipped at {{3}}.\n\n"
            "🎫 Ticket Number: {{1}}\n"
            "📋 Queue: {{2}}\n\n"
            "Please contact our staff if you are still available."
        ),
        "variables": {
            "1": "Ticket Number",
            "2": "Queue Name",
            "3": "Destination",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "ticket_deleted_v1",
        "event_type": "queue_removed_v3",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a customer is removed from the queue",
        "body_text": (
            "Your queue ticket has been cancelled.\n\n"
            "🎫 Ticket Number: {{1}}\n"
            "📋 Queue: {{2}}\n\n"
            "If this was unexpected, please contact our staff."
        ),
        "variables": {
            "1": "Ticket Number",
            "2": "Queue Name",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "token_recalled_v1",
        "event_type": "queue_recalled_v2",
        "category": "UTILITY",
        "language": "en",
        "description": "Sent when a skipped customer is re-called by staff",
        "body_text": (
            "Please proceed to {{3}}.\n\n"
            "Your ticket has been recalled.\n\n"
            "🎫 Ticket Number: {{1}}\n"
            "📋 Queue: {{2}}\n\n"
            "Our staff is waiting to assist you."
        ),
        "variables": {
            "1": "Ticket Number",
            "2": "Queue Name",
            "3": "Destination",
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
