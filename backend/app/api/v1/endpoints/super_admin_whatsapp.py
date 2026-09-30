"""
app/api/v1/endpoints/super_admin_whatsapp.py
Super Admin endpoint for platform-wide and branch-wise WhatsApp usage & pricing analytics.
"""
import logging
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_super_admin
from app.db.deps import get_db
from app.models.organization import Organization
from app.models.parent_organization import ParentOrganization
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.schemas.whatsapp_usage import (
    BranchWhatsAppUsage,
    WhatsAppRateUpdate,
    WhatsAppUsageResponse,
)
from app.whatsapp.models import WhatsAppConfig, WhatsAppMessage

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_system_settings(db: AsyncSession) -> dict[str, str]:
    """Safely fetch global system settings, auto-creating table if not yet migrated."""
    try:
        sys_stmt = select(SystemSetting).where(
            SystemSetting.key.in_(["global_whatsapp_rate_per_message", "whatsapp_currency"])
        )
        sys_res = await db.execute(sys_stmt)
        return {s.key: s.value for s in sys_res.scalars().all()}
    except Exception as exc:
        logger.warning("Querying system_settings failed, attempting to auto-create table: %s", exc)
        await db.rollback()
        try:
            from app.db.session import engine as _eng
            async with _eng.begin() as conn:
                await conn.run_sync(lambda sync_conn: SystemSetting.__table__.create(sync_conn, checkfirst=True))
            sys_stmt = select(SystemSetting).where(
                SystemSetting.key.in_(["global_whatsapp_rate_per_message", "whatsapp_currency"])
            )
            sys_res = await db.execute(sys_stmt)
            return {s.key: s.value for s in sys_res.scalars().all()}
        except Exception as inner_exc:
            logger.error("Failed to auto-create or query system_settings: %s", inner_exc)
            await db.rollback()
            return {}


async def _ensure_system_settings_table() -> None:
    """Ensure system_settings table exists before writes."""
    try:
        from app.db.session import engine as _eng
        async with _eng.begin() as conn:
            await conn.run_sync(lambda sync_conn: SystemSetting.__table__.create(sync_conn, checkfirst=True))
    except Exception as exc:
        logger.warning("Could not auto-create system_settings table: %s", exc)


@router.get("/whatsapp-usage", response_model=WhatsAppUsageResponse)
async def get_whatsapp_usage(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    parent_org_id: Optional[uuid.UUID] = Query(None, description="Filter by Parent Organization ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> WhatsAppUsageResponse:
    """
    Get platform-wide and branch-wise WhatsApp usage & pricing analytics.
    Supports filtering by start_date, end_date, and parent_org_id.
    """
    try:
        settings = await _get_system_settings(db)

        global_rate = 0.12
        if "global_whatsapp_rate_per_message" in settings:
            try:
                global_rate = float(settings["global_whatsapp_rate_per_message"])
            except ValueError:
                pass

        currency = settings.get("whatsapp_currency", "₹")

        # Fetch branches with their parent organization
        org_query = select(Organization).order_by(Organization.name)
        if parent_org_id and isinstance(parent_org_id, uuid.UUID):
            org_query = org_query.where(Organization.parent_organization_id == parent_org_id)

        org_res = await db.execute(org_query)
        organizations = org_res.scalars().all()

        # Fetch parent org names in bulk for fast mapping
        parent_org_map: dict[uuid.UUID, tuple[str, str]] = {}
        parent_org_ids = [org.parent_organization_id for org in organizations if org.parent_organization_id]
        if parent_org_ids:
            p_stmt = select(ParentOrganization).where(ParentOrganization.id.in_(parent_org_ids))
            p_res = await db.execute(p_stmt)
            for p in p_res.scalars().all():
                parent_org_map[p.id] = (p.name, p.slug)

        # Fetch WhatsApp configs for branches to retrieve delivery_mode
        cfg_map: dict[uuid.UUID, str] = {}
        org_ids = [org.id for org in organizations]
        if org_ids:
            cfg_stmt = select(WhatsAppConfig.org_id, WhatsAppConfig.delivery_mode).where(WhatsAppConfig.org_id.in_(org_ids))
            cfg_res = await db.execute(cfg_stmt)
            for c_org_id, c_del_mode in cfg_res.all():
                cfg_map[c_org_id] = c_del_mode or "button_reply_only"

        # Build message statistics query grouped by organization_id
        # Note on billing:
        # - Method 1 (button_reply_only): 1st template message is billable; follow-up messages sent after button reply are free session text (₹0.00).
        # - Method 2 (always_send): All event messages outside user session are sent as paid Meta templates and are billable.
        from sqlalchemy import and_, or_
        is_free_session = or_(
            WhatsAppMessage.message_type == "session",
            WhatsAppMessage.template_name.is_(None)
        )
        is_billable_template = and_(
            WhatsAppMessage.message_type != "session",
            WhatsAppMessage.template_name.isnot(None)
        )

        msg_query = (
            select(
                WhatsAppMessage.organization_id,
                func.count(WhatsAppMessage.id).label("total_count"),
                func.count(WhatsAppMessage.id).filter(WhatsAppMessage.status.in_(["delivered", "read"])).label("delivered_count"),
                func.count(WhatsAppMessage.id).filter(WhatsAppMessage.status.in_(["delivered", "read"]), is_billable_template).label("billable_count"),
                func.count(WhatsAppMessage.id).filter(WhatsAppMessage.status.in_(["delivered", "read"]), is_free_session).label("free_session_count"),
                func.count(WhatsAppMessage.id).filter(WhatsAppMessage.status == "read").label("read_count"),
                func.count(WhatsAppMessage.id).filter(WhatsAppMessage.status == "failed").label("failed_count"),
                func.max(WhatsAppMessage.created_at).label("last_sent_at"),
            )
            .group_by(WhatsAppMessage.organization_id)
        )

        if start_date and isinstance(start_date, date):
            msg_query = msg_query.where(cast(WhatsAppMessage.created_at, Date) >= start_date)
        if end_date and isinstance(end_date, date):
            msg_query = msg_query.where(cast(WhatsAppMessage.created_at, Date) <= end_date)

        msg_res = await db.execute(msg_query)
        msg_stats = {row.organization_id: row for row in msg_res.all()}

        platform_total_messages = 0
        platform_total_delivered = 0
        platform_total_billable = 0
        platform_total_free_session = 0
        platform_total_read = 0
        platform_total_failed = 0
        platform_total_amount = 0.0
        active_branches_count = 0

        branch_items: list[BranchWhatsAppUsage] = []
        for org in organizations:
            row = msg_stats.get(org.id)
            total_cnt = row.total_count if row else 0
            deliv_cnt = row.delivered_count if row else 0
            billable_cnt = row.billable_count if row else 0
            free_cnt = row.free_session_count if row else 0
            read_cnt = row.read_count if row else 0
            failed_cnt = row.failed_count if row else 0
            last_sent = row.last_sent_at if row else None

            # Cost calculation: ONLY billable Meta template messages cost money! Free session messages are ₹0.00
            b_amount = round(billable_cnt * global_rate, 2)

            if total_cnt > 0:
                active_branches_count += 1

            platform_total_messages += total_cnt
            platform_total_delivered += deliv_cnt
            platform_total_billable += billable_cnt
            platform_total_free_session += free_cnt
            platform_total_read += read_cnt
            platform_total_failed += failed_cnt
            platform_total_amount += b_amount

            p_info = parent_org_map.get(org.parent_organization_id) if org.parent_organization_id else None
            del_mode = cfg_map.get(org.id, "button_reply_only")

            branch_items.append(
                BranchWhatsAppUsage(
                    id=org.id,
                    name=org.name,
                    slug=org.slug,
                    parent_org_name=p_info[0] if p_info else None,
                    parent_org_slug=p_info[1] if p_info else None,
                    delivery_mode=del_mode,
                    effective_rate=global_rate,
                    currency=currency,
                    total_messages=total_cnt,
                    delivered_messages=deliv_cnt,
                    billable_messages=billable_cnt,
                    free_session_messages=free_cnt,
                    read_messages=read_cnt,
                    failed_messages=failed_cnt,
                    total_amount=b_amount,
                    last_sent_at=last_sent,
                )
            )

        # Sort branches by total messages descending, then name
        branch_items.sort(key=lambda b: (b.total_messages, b.total_amount), reverse=True)

        return WhatsAppUsageResponse(
            global_rate_per_message=global_rate,
            currency=currency,
            total_messages=platform_total_messages,
            total_delivered=platform_total_delivered,
            total_billable=platform_total_billable,
            total_free_session=platform_total_free_session,
            total_read=platform_total_read,
            total_failed=platform_total_failed,
            total_amount=round(platform_total_amount, 2),
            active_branches_count=active_branches_count,
            branches=branch_items,
        )
    except Exception as exc:
        logger.exception("Error in get_whatsapp_usage: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load WhatsApp usage & pricing: {str(exc)}",
        )


@router.put("/whatsapp-rate", response_model=WhatsAppUsageResponse)
async def update_whatsapp_rate(
    payload: WhatsAppRateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> WhatsAppUsageResponse:
    """Update global WhatsApp rate per message and currency."""
    await _ensure_system_settings_table()
    try:
        # Rate setting
        sys_rate = await db.execute(
            select(SystemSetting).where(SystemSetting.key == "global_whatsapp_rate_per_message")
        )
        rate_obj = sys_rate.scalar_one_or_none()
        if rate_obj:
            rate_obj.value = str(payload.global_rate_per_message)
        else:
            db.add(
                SystemSetting(
                    key="global_whatsapp_rate_per_message",
                    value=str(payload.global_rate_per_message),
                    description="Global WhatsApp rate per delivered message",
                )
            )

        # Currency setting
        sys_curr = await db.execute(
            select(SystemSetting).where(SystemSetting.key == "whatsapp_currency")
        )
        curr_obj = sys_curr.scalar_one_or_none()
        if curr_obj:
            curr_obj.value = payload.currency
        else:
            db.add(
                SystemSetting(
                    key="whatsapp_currency",
                    value=payload.currency,
                    description="Global currency for WhatsApp message billing",
                )
            )

        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.exception("Error updating WhatsApp rate: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save WhatsApp rate configuration: {str(exc)}",
        )

    return await get_whatsapp_usage(db=db, current_user=current_user)
