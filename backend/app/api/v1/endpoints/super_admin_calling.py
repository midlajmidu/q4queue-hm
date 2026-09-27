import logging
import math
import uuid
from typing import List, Optional
from datetime import datetime, date, time
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.core.deps import get_current_super_admin
from app.models.user import User
from app.models.organization import Organization
from app.models.system_setting import SystemSetting
from app.models.call_log import CallLog
from app.services.call_log_service import calculate_billable_minutes
from app.schemas.call_log import (
    BranchCallingConfig,
    CallingConfigRead,
    CallingConfigUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_system_settings(db: AsyncSession) -> dict[str, str]:
    """Safely fetch global system settings, auto-creating table if not yet migrated."""
    try:
        sys_stmt = select(SystemSetting).where(
            SystemSetting.key.in_(["global_call_rate_per_minute", "calling_currency"])
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
                SystemSetting.key.in_(["global_call_rate_per_minute", "calling_currency"])
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


@router.get("/calling-config", response_model=CallingConfigRead)
async def get_calling_config(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
):
    """
    Get global calling price configuration, per-branch rate overrides, and total calling usage & pricing.
    Supports filtering by start_date and end_date.
    """
    try:
        settings = await _get_system_settings(db)

        global_rate = 1.50
        if "global_call_rate_per_minute" in settings:
            try:
                global_rate = float(settings["global_call_rate_per_minute"])
            except ValueError:
                pass

        currency = settings.get("calling_currency", "₹")

        # Fetch all branches/organizations
        org_stmt = select(Organization).order_by(Organization.name)
        org_res = await db.execute(org_stmt)
        organizations = org_res.scalars().all()

        # Fetch call logs with optional date range filtering (cast to Date to avoid tz mismatch)
        call_query = select(CallLog)
        if start_date:
            call_query = call_query.where(cast(CallLog.created_at, Date) >= start_date)
        if end_date:
            call_query = call_query.where(cast(CallLog.created_at, Date) <= end_date)

        call_res = await db.execute(call_query)
        all_logs = call_res.scalars().all()

        # Group call logs by organization_id
        org_logs_map = {}
        for log in all_logs:
            org_id = log.organization_id
            if org_id not in org_logs_map:
                org_logs_map[org_id] = []
            org_logs_map[org_id].append(log)

        platform_total_calls = 0
        platform_total_duration = 0
        platform_total_billable_mins = 0
        platform_total_amount = 0.0

        branches: List[BranchCallingConfig] = []
        for org in organizations:
            effective = org.call_rate_per_minute if org.call_rate_per_minute is not None else global_rate
            b_currency = org.calling_currency or currency

            logs = org_logs_map.get(org.id, [])
            b_calls = len(logs)
            b_duration = sum((l.duration_seconds or 0) for l in logs)
            b_billable_mins = sum(calculate_billable_minutes(l.duration_seconds or 0) for l in logs)
            b_amount = round(b_billable_mins * effective, 2)

            platform_total_calls += b_calls
            platform_total_duration += b_duration
            platform_total_billable_mins += b_billable_mins
            platform_total_amount += b_amount

            branches.append(
                BranchCallingConfig(
                    id=org.id,
                    name=org.name,
                    slug=org.slug,
                    call_rate_per_minute=org.call_rate_per_minute,
                    effective_rate=effective,
                    calling_currency=b_currency,
                    total_calls=b_calls,
                    total_duration_seconds=b_duration,
                    total_billable_minutes=b_billable_mins,
                    total_amount=b_amount,
                )
            )

        return CallingConfigRead(
            global_rate_per_minute=global_rate,
            currency=currency,
            total_calls=platform_total_calls,
            total_duration_seconds=platform_total_duration,
            total_billable_minutes=platform_total_billable_mins,
            total_amount=round(platform_total_amount, 2),
            branches=branches,
        )
    except Exception as exc:
        logger.exception("Error in get_calling_config: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load calling configuration: {str(exc)}",
        )


@router.put("/calling-config", response_model=CallingConfigRead)
async def update_calling_config(
    payload: CallingConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
):
    """
    Update global calling rate per minute, currency, and optional branch overrides.
    """
    if payload.global_rate_per_minute < 0:
        raise HTTPException(status_code=400, detail="Calling rate per minute cannot be negative")

    await _ensure_system_settings_table()

    # Update or insert global rate
    try:
        sys_rate = await db.execute(select(SystemSetting).where(SystemSetting.key == "global_call_rate_per_minute"))
        setting_obj = sys_rate.scalar_one_or_none()
        if setting_obj:
            setting_obj.value = str(payload.global_rate_per_minute)
        else:
            db.add(
                SystemSetting(
                    key="global_call_rate_per_minute",
                    value=str(payload.global_rate_per_minute),
                    description="Global default voice call rate per minute in INR",
                )
            )

        # Update or insert currency
        sys_curr = await db.execute(select(SystemSetting).where(SystemSetting.key == "calling_currency"))
        curr_obj = sys_curr.scalar_one_or_none()
        if curr_obj:
            curr_obj.value = payload.currency
        else:
            db.add(
                SystemSetting(
                    key="calling_currency",
                    value=payload.currency,
                    description="Global currency symbol for voice call billing",
                )
            )

        # Update branch overrides if provided
        if payload.branch_overrides:
            for org_id_str, override_rate in payload.branch_overrides.items():
                try:
                    org_uuid = uuid.UUID(org_id_str)
                    org_stmt = select(Organization).where(Organization.id == org_uuid)
                    org_res = await db.execute(org_stmt)
                    org = org_res.scalar_one_or_none()
                    if org:
                        org.call_rate_per_minute = override_rate
                        if payload.currency:
                            org.calling_currency = payload.currency
                except ValueError:
                    continue

        await db.commit()
    except Exception as exc:
        logger.exception("Error updating calling config: %s", exc)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save calling configuration: {str(exc)}",
        )

    return await get_calling_config(db=db, current_user=current_user)
