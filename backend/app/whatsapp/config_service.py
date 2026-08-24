"""
app/whatsapp/config_service.py
Manages WhatsApp configuration — global Meta credentials and per-org toggles.

Global row:  org_id IS NULL  → stores Meta API keys
Per-org row: org_id IS NOT NULL → stores is_enabled flag only
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.whatsapp.models import WhatsAppConfig, WhatsAppConfigStatus
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Global Config (Super Admin) ───────────────────────────────────────────────

async def get_global_config(db: AsyncSession) -> Optional[WhatsAppConfig]:
    """Return the single global WhatsApp config row (org_id IS NULL)."""
    result = await db.execute(
        select(WhatsAppConfig).where(WhatsAppConfig.org_id.is_(None))
    )
    return result.scalar_one_or_none()


async def upsert_global_config(db: AsyncSession, data: dict) -> WhatsAppConfig:
    """
    Create or update the global WhatsApp config row.
    Merges env-var credentials with DB-stored values.
    """
    config = await get_global_config(db)
    if config is None:
        config = WhatsAppConfig(org_id=None)
        db.add(config)

    for key, value in data.items():
        if hasattr(config, key):
            setattr(config, key, value)

    # Auto-compute connection status
    has_token = bool(config.access_token or settings.WHATSAPP_ACCESS_TOKEN)
    has_phone = bool(config.phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID)
    has_waba = bool(config.waba_id or settings.WHATSAPP_WABA_ID)

    if has_token and has_phone and has_waba:
        config.status = WhatsAppConfigStatus.connected
        if config.connected_at is None:
            config.connected_at = datetime.now(timezone.utc)
    else:
        config.status = WhatsAppConfigStatus.disconnected

    await db.commit()
    await db.refresh(config)
    return config


async def get_global_config_dict(org_id: Optional[uuid.UUID] = None) -> dict:
    """
    Return the current effective WhatsApp config as a plain dict.
    If org_id is provided, checks for organization-level overrides (e.g. custom phone_number_id)
    before falling back to the global Meta configuration.
    """
    async with AsyncSessionLocal() as db:
        global_config = await get_global_config(db)
        org_config = await get_org_config(db, org_id) if org_id else None

    # Global base values
    access_token = (org_config.access_token if (org_config and org_config.access_token) else (global_config.access_token if global_config and global_config.access_token else settings.WHATSAPP_ACCESS_TOKEN)) or ""
    phone_number_id = (org_config.phone_number_id if (org_config and org_config.phone_number_id) else (global_config.phone_number_id if global_config and global_config.phone_number_id else settings.WHATSAPP_PHONE_NUMBER_ID)) or ""
    waba_id = (org_config.waba_id if (org_config and org_config.waba_id) else (global_config.waba_id if global_config and global_config.waba_id else settings.WHATSAPP_WABA_ID)) or ""
    app_id = (org_config.app_id if (org_config and org_config.app_id) else (global_config.app_id if global_config else "")) or ""
    app_secret = (org_config.app_secret if (org_config and org_config.app_secret) else (global_config.app_secret if global_config else "")) or ""
    business_id = (org_config.business_id if (org_config and org_config.business_id) else (global_config.business_id if global_config else "")) or ""
    webhook_url = (global_config.webhook_url if global_config else "") or ""
    webhook_verify_token = (org_config.webhook_verify_token if (org_config and org_config.webhook_verify_token) else (global_config.webhook_verify_token if global_config and global_config.webhook_verify_token else settings.WHATSAPP_VERIFY_TOKEN)) or "qrq-whatsapp-webhook-secret"

    is_enabled = org_config.is_enabled if org_config else (global_config.is_enabled if global_config else False)

    return {
        "access_token": access_token,
        "phone_number_id": phone_number_id,
        "waba_id": waba_id,
        "app_id": app_id,
        "app_secret": app_secret,
        "business_id": business_id,
        "webhook_url": webhook_url,
        "webhook_verify_token": webhook_verify_token,
        "api_version": settings.WHATSAPP_API_VERSION or "v21.0",
        "status": global_config.status if global_config else WhatsAppConfigStatus.disconnected,
        "is_enabled": is_enabled,
        "payment_active": global_config.payment_active if global_config else False,
        "business_verified": global_config.business_verified if global_config else False,
        "webhook_active": global_config.webhook_active if global_config else False,
        "connected_at": global_config.connected_at.isoformat() if (global_config and global_config.connected_at) else None,
        "is_custom_phone": bool(org_config and org_config.phone_number_id),
    }


async def is_whatsapp_globally_enabled() -> bool:
    """Quick check: is WhatsApp configured and enabled globally?"""
    cfg = await get_global_config_dict()
    return bool(cfg["access_token"] and cfg["phone_number_id"]) and cfg["is_enabled"]


# ── Per-Org Config (Super Admin & Org Admin) ──────────────────────────────────

async def get_org_config(db: AsyncSession, org_id: uuid.UUID) -> Optional[WhatsAppConfig]:
    """Return the per-org WhatsApp config row."""
    result = await db.execute(
        select(WhatsAppConfig).where(WhatsAppConfig.org_id == org_id)
    )
    return result.scalar_one_or_none()


async def list_admin_organizations_whatsapp(db: AsyncSession) -> list[dict]:
    """
    List all organizations/branches with their current WhatsApp routing configuration.
    Supports default, custom_phone, and custom_full modes.
    """
    from app.models.organization import Organization
    from app.models.parent_organization import ParentOrganization

    global_cfg = await get_global_config(db)
    global_phone = (global_cfg.phone_number_id if global_cfg else "") or settings.WHATSAPP_PHONE_NUMBER_ID or ""
    global_waba = (global_cfg.waba_id if global_cfg else "") or settings.WHATSAPP_WABA_ID or ""
    global_token = (global_cfg.access_token if global_cfg else "") or settings.WHATSAPP_ACCESS_TOKEN or ""
    global_verify = (global_cfg.webhook_verify_token if global_cfg and global_cfg.webhook_verify_token else settings.WHATSAPP_VERIFY_TOKEN) or "qrq-whatsapp-webhook-secret"

    orgs_res = await db.execute(
        select(Organization).order_by(Organization.name.asc())
    )
    orgs = orgs_res.scalars().all()

    cfgs_res = await db.execute(
        select(WhatsAppConfig).where(WhatsAppConfig.org_id.is_not(None))
    )
    cfgs_by_org = {str(c.org_id): c for c in cfgs_res.scalars().all()}

    parent_ids = [o.parent_organization_id for o in orgs if o.parent_organization_id]
    parents_by_id = {}
    if parent_ids:
        p_res = await db.execute(
            select(ParentOrganization).where(ParentOrganization.id.in_(parent_ids))
        )
        parents_by_id = {p.id: p.name for p in p_res.scalars().all()}

    results = []
    for o in orgs:
        c = cfgs_by_org.get(str(o.id))
        
        has_full_custom = bool(c and (c.access_token or c.waba_id))
        has_custom_phone = bool(c and c.phone_number_id and not has_full_custom)

        mode = "custom_full" if has_full_custom else ("custom_phone" if has_custom_phone else "default")

        results.append({
            "org_id": str(o.id),
            "name": o.name,
            "slug": o.slug,
            "parent_org_name": parents_by_id.get(o.parent_organization_id) if o.parent_organization_id else None,
            "is_active": o.is_active,
            "is_enabled": c.is_enabled if c else True,
            "mode": mode,
            "phone_number_id": (c.phone_number_id if c else "") or "",
            "waba_id": (c.waba_id if c else "") or "",
            "access_token": (c.access_token if c else "") or "",
            "webhook_verify_token": (c.webhook_verify_token if c else "") or "",
            "app_id": (c.app_id if c else "") or "",
            "app_secret": (c.app_secret if c else "") or "",
            "effective_phone_number_id": (c.phone_number_id if (c and c.phone_number_id) else global_phone) or "",
            "effective_waba_id": (c.waba_id if (c and c.waba_id) else global_waba) or "",
            "has_custom_token": bool(c and c.access_token),
            "global_phone_number_id": global_phone,
            "global_waba_id": global_waba,
        })
    return results


async def update_admin_org_whatsapp(db: AsyncSession, org_id: uuid.UUID, data: dict) -> dict:
    """Update an organization's WhatsApp configuration (default, custom_phone, or custom_full)."""
    config = await get_org_config(db, org_id)
    if not config:
        config = WhatsAppConfig(org_id=org_id)
        db.add(config)

    if "is_enabled" in data and data["is_enabled"] is not None:
        config.is_enabled = bool(data["is_enabled"])

    mode = data.get("mode")

    if mode == "default":
        # Clear all custom overrides -> inherit 100% from global config
        config.phone_number_id = None
        config.waba_id = None
        config.access_token = None
        config.webhook_verify_token = None
        config.app_id = None
        config.app_secret = None
        config.business_id = None
    elif mode == "custom_phone":
        # Custom phone number ID under shared global WABA & Access Token
        phone_id = (data.get("phone_number_id") or "").strip()
        config.phone_number_id = phone_id if phone_id else None
        config.waba_id = None
        config.access_token = None
        config.webhook_verify_token = None
        config.app_id = None
        config.app_secret = None
    elif mode == "custom_full":
        # Full dedicated Meta Account / WABA
        phone_id = (data.get("phone_number_id") or "").strip()
        waba_id = (data.get("waba_id") or "").strip()
        token = (data.get("access_token") or "").strip()
        verify_token = (data.get("webhook_verify_token") or "").strip()
        app_id = (data.get("app_id") or "").strip()
        app_secret = (data.get("app_secret") or "").strip()

        config.phone_number_id = phone_id if phone_id else None
        config.waba_id = waba_id if waba_id else None
        if token:  # Only update access token if provided non-empty
            config.access_token = token
        config.webhook_verify_token = verify_token if verify_token else None
        config.app_id = app_id if app_id else None
        config.app_secret = app_secret if app_secret else None
    else:
        # Fallback field-by-field if mode not explicitly passed
        if "phone_number_id" in data:
            val = (data["phone_number_id"] or "").strip()
            config.phone_number_id = val if val else None
        if "waba_id" in data:
            val = (data["waba_id"] or "").strip()
            config.waba_id = val if val else None
        if "access_token" in data and data["access_token"]:
            config.access_token = data["access_token"].strip()
        if "webhook_verify_token" in data:
            val = (data["webhook_verify_token"] or "").strip()
            config.webhook_verify_token = val if val else None

    await db.commit()
    await db.refresh(config)

    global_cfg = await get_global_config(db)
    global_phone = (global_cfg.phone_number_id if global_cfg else "") or settings.WHATSAPP_PHONE_NUMBER_ID or ""
    global_waba = (global_cfg.waba_id if global_cfg else "") or settings.WHATSAPP_WABA_ID or ""

    resolved_mode = "custom_full" if (config.access_token or config.waba_id) else ("custom_phone" if config.phone_number_id else "default")

    return {
        "org_id": str(org_id),
        "is_enabled": config.is_enabled,
        "mode": resolved_mode,
        "phone_number_id": config.phone_number_id or "",
        "waba_id": config.waba_id or "",
        "effective_phone_number_id": config.phone_number_id or global_phone,
        "effective_waba_id": config.waba_id or global_waba,
    }


async def set_org_enabled(
    db: AsyncSession, org_id: uuid.UUID, is_enabled: bool
) -> WhatsAppConfig:
    """Enable or disable WhatsApp notifications for a specific org."""
    config = await get_org_config(db, org_id)
    if config is None:
        config = WhatsAppConfig(org_id=org_id, is_enabled=is_enabled)
        db.add(config)
    else:
        config.is_enabled = is_enabled

    await db.commit()
    await db.refresh(config)
    return config


async def is_org_whatsapp_enabled(org_id: uuid.UUID) -> bool:
    """
    Return True only if:
    1. Global WhatsApp is configured (Meta credentials present)
    2. Global is_enabled is True
    3. This org's is_enabled is True
    """
    cfg = await get_org_notification_config(org_id)
    return cfg["global_enabled"] and cfg["is_enabled"]


async def get_org_notification_config(org_id: uuid.UUID) -> dict:
    """Return all notification toggles for an org."""
    async with AsyncSessionLocal() as db:
        global_cfg = await get_global_config(db)
        org_cfg = await get_org_config(db, org_id)
        
        has_credentials = bool(
            (org_cfg.access_token if org_cfg and org_cfg.access_token else (global_cfg.access_token if global_cfg else "")) or settings.WHATSAPP_ACCESS_TOKEN
        ) and bool(
            (org_cfg.phone_number_id if org_cfg and org_cfg.phone_number_id else (global_cfg.phone_number_id if global_cfg else "")) or settings.WHATSAPP_PHONE_NUMBER_ID
        )
        
        global_enabled = bool(global_cfg and global_cfg.is_enabled and has_credentials)
        if not has_credentials:
            return {
                "global_enabled": False,
                "is_enabled": False,
                "notify_queue_joined": False,
                "notify_position_5": False,
                "notify_position_3": False,
                "notify_called": False,
                "notify_completed": False,
                "notify_skipped": False,
                "notify_recalled": False,
                "notify_removed": False,
            }

        if not org_cfg:
            # Opt-out model: default all to True
            return {
                "global_enabled": global_enabled,
                "is_enabled": True,
                "notify_queue_joined": True,
                "notify_position_5": True,
                "notify_position_3": True,
                "notify_called": True,
                "notify_completed": True,
                "notify_skipped": True,
                "notify_recalled": True,
                "notify_removed": True,
            }
        
        return {
            "global_enabled": global_enabled,
            "is_enabled": org_cfg.is_enabled,
            "notify_queue_joined": org_cfg.notify_queue_joined,
            "notify_position_5": org_cfg.notify_position_5,
            "notify_position_3": org_cfg.notify_position_3,
            "notify_called": org_cfg.notify_called,
            "notify_completed": org_cfg.notify_completed,
            "notify_skipped": org_cfg.notify_skipped,
            "notify_recalled": org_cfg.notify_recalled,
            "notify_removed": org_cfg.notify_removed,
        }
