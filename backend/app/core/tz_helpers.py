"""
tz_helpers.py — Per-branch timezone utilities.

All backend endpoints and services must use these helpers instead of
datetime.now(timezone.utc) or hardcoded "Asia/Kolkata" strings.
"""
from __future__ import annotations

import uuid
from datetime import datetime, date, time as dt_time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

FALLBACK_TZ = "Asia/Kolkata"


def safe_zoneinfo(tz_name: str) -> ZoneInfo:
    """Return a ZoneInfo for tz_name, falling back to Asia/Kolkata on any error."""
    try:
        return ZoneInfo(tz_name)
    except (ZoneInfoNotFoundError, KeyError, Exception):
        return ZoneInfo(FALLBACK_TZ)


async def get_org_timezone(db: AsyncSession, org_id: uuid.UUID) -> str:
    """
    Fetch the timezone string for an Organization (branch).
    Returns FALLBACK_TZ if org not found or timezone not set.
    """
    from app.models.organization import Organization
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if org and org.timezone:
        return org.timezone
    return FALLBACK_TZ


def to_org_local(dt: datetime | None, tz_name: str) -> str:
    """
    Convert a UTC-aware datetime to org-local formatted string for CSV/Excel output.
    Returns empty string for None.

    Example: 2024-07-25 03:30:00+00:00 → "2024-07-25 09:00:00"  (for IST)
    """
    if dt is None:
        return ""
    if dt.tzinfo is None:
        # Treat naive datetimes as UTC
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    local = dt.astimezone(safe_zoneinfo(tz_name))
    return local.strftime("%Y-%m-%d %H:%M:%S")


def to_org_local_date(dt: datetime | None, tz_name: str) -> str:
    """Return only the date portion of to_org_local, e.g. '2024-07-25'."""
    full = to_org_local(dt, tz_name)
    return full.split(" ")[0] if full else ""


def to_org_local_time(dt: datetime | None, tz_name: str) -> str:
    """Return the time portion (HH:MM:SS) of to_org_local, e.g. '14:30:00'."""
    full = to_org_local(dt, tz_name)
    return full.split(" ")[1] if full and " " in full else ""


def local_today(tz_name: str) -> date:
    """Return today's date in the org's local timezone."""
    return datetime.now(safe_zoneinfo(tz_name)).date()


def is_within_operational_hours(current_hm: str, open_time: str | None, close_time: str | None) -> bool:
    """Return True if current_hm (HH:MM) is within the operating window."""
    open_t = open_time.strip() if open_time and open_time.strip() else None
    close_t = close_time.strip() if close_time and close_time.strip() else None

    if not open_t and not close_t:
        return True

    start = open_t if open_t else "00:00"
    end = close_t if close_t else "23:59"

    if start <= end:
        return start <= current_hm <= end
    # Overnight schedule e.g., 21:00 to 03:00 next day
    return current_hm >= start or current_hm <= end


def queue_business_date(
    local_now: datetime,
    open_time: str | None,
    close_time: str | None,
) -> date:
    """Return the session date for normal and overnight operating windows."""
    if open_time and close_time and open_time > close_time:
        current_hm = local_now.strftime("%H:%M")
        if current_hm <= close_time:
            return local_now.date() - timedelta(days=1)
    return local_now.date()


def tz_date_clause(col, tz_name: str):
    """
    Wrap a UTC timestamp column with func.timezone + func.date so that
    date comparisons are done in the org's local timezone (PostgreSQL only).

    Usage:
        tz_date_clause(Token.created_at, "Asia/Kolkata") == today
    """
    from sqlalchemy import func
    return func.date(func.timezone(tz_name, col))


def tz_hour_clause(col, tz_name: str):
    """
    Extract the local hour from a UTC timestamp column (PostgreSQL only).
    Used for peak-hour charts.
    """
    from sqlalchemy import func
    return func.extract("hour", func.timezone(tz_name, col))
