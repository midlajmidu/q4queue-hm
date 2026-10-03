"""
tests/unit/test_ai_overview_service.py
Deterministic unit tests for AI Queue Overview narrative synthesis and edge cases.
"""
from app.services.ai_overview_service import synthesize_ai_narrative


def test_ai_overview_closed_state():
    result = synthesize_ai_narrative(
        people_ahead=5,
        est_wait_minutes=20,
        hist_avg=4.0,
        live_avg=4.0,
        day_name="Friday",
        active_counters=2,
        is_closed=True,
    )
    assert result["is_active"] is False
    assert result["badge_type"] == "closed"
    assert result["estimated_min_minutes"] is None
    assert result["estimated_max_minutes"] is None
    assert "closed" in result["trend_title"].lower()


def test_ai_overview_paused_state():
    result = synthesize_ai_narrative(
        people_ahead=3,
        est_wait_minutes=15,
        hist_avg=3.5,
        live_avg=3.5,
        day_name="Friday",
        active_counters=0,
        is_paused=True,
    )
    assert result["is_paused"] is True
    assert result["badge_type"] == "paused"
    assert result["estimated_min_minutes"] is None
    assert result["estimated_max_minutes"] is None
    assert "pause" in result["trend_title"].lower() or "hold" in result["trend_title"].lower()


def test_ai_overview_zero_active_counters_handled():
    # If active_counters is 0, it must enter paused/standby state, never crash or force 1
    result = synthesize_ai_narrative(
        people_ahead=4,
        est_wait_minutes=None,
        hist_avg=5.0,
        live_avg=5.0,
        day_name="Monday",
        active_counters=0,
        is_paused=False,
    )
    assert result["is_paused"] is True
    assert result["badge_type"] == "paused"
    assert result["estimated_min_minutes"] is None


def test_ai_overview_next_in_line():
    result = synthesize_ai_narrative(
        people_ahead=0,
        est_wait_minutes=1,
        hist_avg=4.0,
        live_avg=4.0,
        day_name="Saturday",
        active_counters=2,
        is_paused=False,
        is_closed=False,
    )
    assert result["badge_type"] == "almost_turn"
    assert result["estimated_min_minutes"] == 1
    assert result["estimated_max_minutes"] == 3
    assert "next in line" in result["trend_title"].lower()


def test_ai_overview_fast_pace():
    # Historical 6 mins, Live 3 mins -> 2.0x faster
    result = synthesize_ai_narrative(
        people_ahead=3,
        est_wait_minutes=5,
        hist_avg=6.0,
        live_avg=3.0,
        day_name="Wednesday",
        active_counters=2,
        is_paused=False,
        is_closed=False,
    )
    assert result["badge_type"] == "fast"
    assert result["pace_ratio"] >= 1.2
    assert "faster" in result["trend_title"].lower()


def test_ai_overview_slow_rush_pace():
    # Historical 3 mins, Live 6 mins -> 0.5x pace
    result = synthesize_ai_narrative(
        people_ahead=5,
        est_wait_minutes=25,
        hist_avg=3.0,
        live_avg=6.0,
        day_name="Sunday",
        active_counters=1,
        is_paused=False,
        is_closed=False,
    )
    assert result["badge_type"] == "slow"
    assert result["pace_ratio"] <= 0.8
    assert "rush" in result["trend_title"].lower() or "heavier" in result["trend_title"].lower()


def test_ai_overview_dine_in_party():
    result = synthesize_ai_narrative(
        people_ahead=2,
        est_wait_minutes=10,
        hist_avg=4.0,
        live_avg=4.0,
        day_name="Friday",
        active_counters=2,
        pax_count=4,
        is_dine_mode=True,
    )
    assert "party of 4" in result["summary_message"].lower()
