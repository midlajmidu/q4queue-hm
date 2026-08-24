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
        "language": "en_US",
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
        "language": "en_US",
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
        "language": "en_US",
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
        "language": "en_US",
        "description": "Sent when a customer's service is completed",
        "body_text": (
            "Your visit has been completed successfully.\n\n"
            "🎫 Ticket Number: {{1}}\n"
            "📋 Queue: {{2}}\n\n"
            "Thank you for choosing us."
        ),
        "variables": {
            "1": "Ticket Number",
            "2": "Queue Name",
        },
        "status": WhatsAppTemplateStatus.approved,
    },
    {
        "template_name": "token_skipped_v1",
        "event_type": "queue_skipped_v3",
        "category": "UTILITY",
        "language": "en_US",
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
        "language": "en_US",
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
        "language": "en_US",
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


APPROVED_TEMPLATE_NAMES = {tpl["template_name"] for tpl in DEFAULT_TEMPLATES}

EVENT_TO_TEMPLATE_NAME = {
    "queue_joined_v4": "ticket_confirmed_v1",
    "queue_nearby_5_v3": "queue_update_5_v1",
    "queue_nearby_3_v3": "queue_update_3_v1",
    "queue_called_v3": "token_called_v1",
    "queue_completed_v3": "service_completed_v1",
    "queue_skipped_v3": "token_skipped_v1",
    "queue_removed_v3": "ticket_deleted_v1",
    "queue_recalled_v2": "token_recalled_v1",
}


# ── Template CRUD ─────────────────────────────────────────────────────────────

async def seed_default_templates(db: AsyncSession) -> None:
    """Seed default templates and delete all deprecated legacy templates."""
    # 1. Delete all non-approved / deprecated templates
    await db.execute(
        delete(WhatsAppTemplate).where(
            WhatsAppTemplate.template_name.not_in(APPROVED_TEMPLATE_NAMES)
        )
    )

    # 2. Get existing approved template names
    existing_result = await db.execute(
        select(WhatsAppTemplate.template_name)
    )
    existing_names = {row[0] for row in existing_result.fetchall()}

    # 3. Add any missing default templates
    added = 0
    for tpl in DEFAULT_TEMPLATES:
        if tpl["template_name"] not in existing_names:
            template = WhatsAppTemplate(**tpl)
            db.add(template)
            added += 1

    await db.commit()
    logger.info("✓ WhatsApp templates synchronized (8 official templates active, %d added)", added)


async def list_templates(db: AsyncSession) -> list[WhatsAppTemplate]:
    result = await db.execute(
        select(WhatsAppTemplate)
        .where(WhatsAppTemplate.template_name.in_(APPROVED_TEMPLATE_NAMES))
        .order_by(WhatsAppTemplate.template_name)
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
    """Fetch the official approved template mapped to a specific queue event."""
    target_template_name = EVENT_TO_TEMPLATE_NAME.get(event_type)
    if target_template_name:
        result = await db.execute(
            select(WhatsAppTemplate).where(
                WhatsAppTemplate.template_name == target_template_name,
                WhatsAppTemplate.status == WhatsAppTemplateStatus.approved,
            )
        )
        found = result.scalar_one_or_none()
        if found:
            return found

    # Fallback lookup by event_type within approved template names
    result = await db.execute(
        select(WhatsAppTemplate).where(
            WhatsAppTemplate.event_type == event_type,
            WhatsAppTemplate.template_name.in_(APPROVED_TEMPLATE_NAMES),
            WhatsAppTemplate.status == WhatsAppTemplateStatus.approved,
        )
    )
    return result.scalars().first()


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
    
    # Try deleting from Meta if possible
    try:
        await delete_template_from_meta(db, template.template_name)
    except Exception as exc:
        logger.warning("Could not delete template %s from Meta: %s", template.template_name, exc)

    await db.delete(template)
    await db.commit()
    return True


async def delete_template_from_meta(db: AsyncSession, template_name: str) -> dict:
    """Delete a single template from Meta WABA."""
    from app.whatsapp.config_service import get_global_config_dict
    import httpx

    cfg = await get_global_config_dict()
    waba_id = cfg.get("waba_id")
    access_token = cfg.get("access_token")
    api_version = cfg.get("api_version") or "v21.0"

    if not waba_id or not access_token:
        return {"success": False, "message": "Meta credentials missing in Global WhatsApp Configuration."}

    url = f"https://graph.facebook.com/{api_version}/{waba_id}/message_templates"
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.delete(url, headers=headers, params={"name": template_name})
        if resp.status_code in (200, 204):
            return {"success": True, "message": f"Template {template_name} deleted from Meta WABA."}
        return {"success": False, "message": f"Meta error ({resp.status_code}): {resp.text}"}


async def purge_deprecated_templates_from_meta(db: AsyncSession) -> dict:
    """
    1. Removes all deprecated/non-approved templates from local PostgreSQL database.
    2. Queries Meta WABA (via WhatsApp Cloud API) for all templates.
    3. Deletes all templates from Meta WABA whose names are NOT in APPROVED_TEMPLATE_NAMES.
    """
    from app.whatsapp.config_service import get_global_config_dict
    import httpx

    # 1. Purge from local DB
    await seed_default_templates(db)
    
    # 2. Get global Meta API credentials
    cfg = await get_global_config_dict()
    waba_id = cfg.get("waba_id")
    access_token = cfg.get("access_token")
    api_version = cfg.get("api_version") or "v21.0"

    if not waba_id or not access_token:
        return {
            "success": True,
            "message": "Local templates database cleaned (8 official templates active). Meta API credentials not configured yet.",
            "meta_connected": False,
            "purged_from_meta": [],
            "active_approved": list(APPROVED_TEMPLATE_NAMES),
        }

    meta_purged = []
    meta_active = []
    errors = []

    try:
        url = f"https://graph.facebook.com/{api_version}/{waba_id}/message_templates"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers, params={"limit": 100})
            if resp.status_code != 200:
                return {
                    "success": False,
                    "message": f"Meta Graph API error ({resp.status_code}): {resp.text}",
                    "meta_connected": False,
                    "purged_from_meta": [],
                    "active_approved": list(APPROVED_TEMPLATE_NAMES),
                }
            
            data = resp.json()
            meta_templates = data.get("data", [])
            
            for tpl in meta_templates:
                name = tpl.get("name")
                if not name:
                    continue
                if name not in APPROVED_TEMPLATE_NAMES:
                    # Send delete request to Meta
                    del_resp = await client.delete(
                        url,
                        headers=headers,
                        params={"name": name}
                    )
                    if del_resp.status_code in (200, 204):
                        meta_purged.append(name)
                        logger.info("Deleted deprecated template from Meta WABA: %s", name)
                    else:
                        errors.append(f"Failed to delete {name} from Meta: {del_resp.text}")
                else:
                    meta_active.append(name)

        return {
            "success": True,
            "message": f"Purged {len(meta_purged)} legacy templates from Meta WABA. {len(meta_active)} official templates active.",
            "meta_connected": True,
            "purged_from_meta": meta_purged,
            "active_approved": list(APPROVED_TEMPLATE_NAMES),
            "errors": errors,
        }
    except Exception as exc:
        logger.error("Error purging templates from Meta: %s", exc)
        return {
            "success": False,
            "message": f"Exception connecting to Meta API: {str(exc)}",
            "meta_connected": False,
            "purged_from_meta": meta_purged,
            "active_approved": list(APPROVED_TEMPLATE_NAMES),
        }


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
