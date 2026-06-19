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


async def get_global_config_dict() -> dict:
    """
    Return the current effective global config as a plain dict.
    Env vars take precedence over DB values for credentials.
    Used by message_service to get API credentials without a DB session.
    """
    async with AsyncSessionLocal() as db:
        config = await get_global_config(db)

    # Merge: env vars override DB values for actual credentials
    return {
        "access_token": settings.WHATSAPP_ACCESS_TOKEN or (config.access_token if config else ""),
        "phone_number_id": settings.WHATSAPP_PHONE_NUMBER_ID or (config.phone_number_id if config else ""),
        "waba_id": settings.WHATSAPP_WABA_ID or (config.waba_id if config else ""),
        "app_id": config.app_id if config else "",
        "app_secret": config.app_secret if config else "",
        "api_version": settings.WHATSAPP_API_VERSION,
        "webhook_verify_token": settings.WHATSAPP_VERIFY_TOKEN,
        "status": config.status if config else WhatsAppConfigStatus.disconnected,
        "is_enabled": config.is_enabled if config else False,
        "payment_active": config.payment_active if config else False,
        "business_verified": config.business_verified if config else False,
        "webhook_active": config.webhook_active if config else False,
        "connected_at": config.connected_at.isoformat() if (config and config.connected_at) else None,
    }


async def is_whatsapp_globally_enabled() -> bool:
    """Quick check: is WhatsApp configured and enabled globally?"""
    cfg = await get_global_config_dict()
    return bool(cfg["access_token"] and cfg["phone_number_id"]) and cfg["is_enabled"]


# ── Per-Org Config (Org Admin) ───────────────────────────────────────────────

async def get_org_config(db: AsyncSession, org_id: uuid.UUID) -> Optional[WhatsAppConfig]:
    """Return the per-org WhatsApp config row."""
    result = await db.execute(
        select(WhatsAppConfig).where(WhatsAppConfig.org_id == org_id)
    )
    return result.scalar_one_or_none()


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
    if not settings.whatsapp_configured:
        return {
            "global_enabled": False,
            "is_enabled": False,
            "notify_queue_joined": False,
            "notify_position_5": False,
            "notify_position_3": False,
            "notify_called": False,
            "notify_completed": False,
        }

    async with AsyncSessionLocal() as db:
        global_cfg = await get_global_config(db)
        global_enabled = bool(global_cfg and global_cfg.is_enabled)
        
        org_cfg = await get_org_config(db, org_id)
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
            }
        
        return {
            "global_enabled": global_enabled,
            "is_enabled": org_cfg.is_enabled,
            "notify_queue_joined": org_cfg.notify_queue_joined,
            "notify_position_5": org_cfg.notify_position_5,
            "notify_position_3": org_cfg.notify_position_3,
            "notify_called": org_cfg.notify_called,
            "notify_completed": org_cfg.notify_completed,
        }
