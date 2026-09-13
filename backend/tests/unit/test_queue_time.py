"""Deterministic tests for queue operating-window boundary rules."""
from datetime import datetime, date
from zoneinfo import ZoneInfo

from app.core.tz_helpers import queue_business_date
from app.models.queue import Queue
from app.services.token_service import _validate_service_line


def _local(value: str) -> datetime:
    return datetime.fromisoformat(value).replace(tzinfo=ZoneInfo("Asia/Kolkata"))


def test_normal_window_uses_calendar_date():
    now = _local("2026-09-13T10:30:00")
    assert queue_business_date(now, "09:00", "18:00") == date(2026, 9, 13)


def test_overnight_window_before_close_uses_opening_date():
    now = _local("2026-09-13T01:30:00")
    assert queue_business_date(now, "22:00", "02:00") == date(2026, 9, 12)


def test_overnight_window_after_close_uses_calendar_date():
    now = _local("2026-09-13T03:00:00")
    assert queue_business_date(now, "22:00", "02:00") == date(2026, 9, 13)


def test_service_line_must_be_within_configured_range():
    queue = Queue(name="Test", org_id=None, service_lines=3)
    _validate_service_line(queue, 1, required=True)
    _validate_service_line(queue, 3, required=True)

    for invalid in (0, 4):
        try:
            _validate_service_line(queue, invalid, required=True)
        except ValueError:
            pass
        else:
            raise AssertionError(f"line {invalid} should have been rejected")
