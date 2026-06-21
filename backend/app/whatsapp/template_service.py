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
        "template_name": "q4q_welcome_hybrid_v2",
        "event_type": "queue_joined_v2",
        "body_text": (
            "Hello *{{1}}*, you're in the *{{2}}* queue at *{{3}}*.\n\n"
            "🎫 Your Ticket: *{{4}}*\n"
            "👥 Current Position: *{{5}}*\n\n"
            "📺 Display: *{{6}}*\n\n"
            "📱 Tracking: *{{7}}*\n\n"
            "Tap below to receive live queue updates directly in WhatsApp."
        ),
        "variables": {
            "1": "Customer Name",
            "2": "Queue Name",
            "3": "Organisation Name",
            "4": "Token Number",
            "5": "Current Queue Position",
            "6": "Organisation Display URL",
            "7": "Personal Queue Tracking URL",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
]


# ── Template CRUD ─────────────────────────────────────────────────────────────

async def seed_default_templates(db: AsyncSession) -> None:
    """Seed default templates if none exist. Called at startup."""
    count_result = await db.execute(select(WhatsAppTemplate))
    existing = count_result.scalars().all()
    if existing:
        return

    for tpl in DEFAULT_TEMPLATES:
        template = WhatsAppTemplate(**tpl)
        db.add(template)

    await db.commit()
    logger.info("✓ WhatsApp default templates seeded (%d templates)", len(DEFAULT_TEMPLATES))


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
