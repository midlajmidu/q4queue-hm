"""
tz_helpers.py — Per-branch timezone utilities.

All backend endpoints and services must use these helpers instead of
datetime.now(timezone.utc) or hardcoded "Asia/Kolkata" strings.
"""
from __future__ import annotations

import uuid
from datetime import datetime, date, time as dt_time
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
