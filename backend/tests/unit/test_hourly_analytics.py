"""Unit tests for timezone-aware hourly distribution query and datetime extraction."""
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import select, func
from sqlalchemy.dialects import postgresql
from app.models.token import Token


def test_timezone_aware_hour_extraction():
    """Verify that UTC timestamps convert accurately to local hours (Asia/Kolkata UTC+5:30)."""
    # 06:15:00 UTC should be 11:45:00 IST -> Hour 11
    utc_dt = datetime(2026, 9, 30, 6, 15, 0, tzinfo=timezone.utc)
    kolkata_dt = utc_dt.astimezone(ZoneInfo("Asia/Kolkata"))
    assert kolkata_dt.hour == 11

    # 19:30:00 UTC should be 01:00:00 IST the next day -> Hour 1
    utc_evening = datetime(2026, 9, 30, 19, 30, 0, tzinfo=timezone.utc)
    kolkata_next_day = utc_evening.astimezone(ZoneInfo("Asia/Kolkata"))
    assert kolkata_next_day.hour == 1


def test_hourly_query_compilation():
    """Verify that timezone-aware hourly grouping compiles with valid PostgreSQL SQL."""
    test_org_id = uuid.uuid4()
    query = (
        select(
            func.extract("hour", func.timezone("Asia/Kolkata", Token.created_at)).label("hr"),
            func.count(Token.id).label("count"),
        )
        .where(Token.org_id == test_org_id)
        .group_by("hr")
        .order_by("hr")
    )

    compiled_sql = str(query.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    assert "EXTRACT(hour FROM timezone('Asia/Kolkata'" in compiled_sql
    assert "GROUP BY hr" in compiled_sql
    assert "ORDER BY hr" in compiled_sql
