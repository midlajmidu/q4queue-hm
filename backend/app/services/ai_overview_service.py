"""
app/services/ai_overview_service.py
Branch-specific Data-Driven AI Queue Overview Service.

Calculates intelligent wait-time estimates and natural language overviews by:
1. Comparing with historical baseline for this branch (Organization) across the past
   4 weeks on the exact same day-of-week (e.g. Fridays) and same hour window.
2. Calibrating with live throughput over the last 45 minutes today.
3. Accounting for actual active serving counters/staff without forcing 0 to 1.
4. Handling paused and zero-service states explicitly.
5. Caching results in Redis with short TTL to maintain low latency and light DB load.
"""
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from zoneinfo import ZoneInfo

from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.token import Token, TokenStatus
from app.models.queue import Queue
from app.models.session import Session as SessionModel
from app.models.organization import Organization
from app.redis.client import get_redis

logger = logging.getLogger(__name__)

DEFAULT_SERVICE_MINUTES = 4.0
CACHE_TTL_SECONDS = 60


async def get_branch_timezone(db: AsyncSession, org_id: uuid.UUID) -> str:
    """Fetch the branch's configured timezone (defaults to UTC)."""
    result = await db.execute(
        select(Organization.timezone).where(Organization.id == org_id)
    )
    tz = result.scalar_one_or_none()
    return tz if tz else "UTC"


async def get_historical_baseline(
    db: AsyncSession,
    org_id: uuid.UUID,
    queue_id: uuid.UUID,
    local_now: datetime,
    tz_str: str,
) -> Tuple[Optional[float], int]:
    """
    Query completed tokens over the past 4 weeks for the exact same
    day of the week (ISO DOW: 1=Mon, 7=Sun) and within a +/- 1 hour window.
    
    Uses existing index: ix_tokens_org_queue_created_at
    """
    target_dow = local_now.isoweekday()
    target_hour = local_now.hour
    past_cutoff = local_now - timedelta(days=28)

    local_created = func.timezone(tz_str, Token.created_at)

    query = (
        select(
            func.avg(func.extract("epoch", Token.completed_at - Token.served_at) / 60.0).label("avg_mins"),
            func.count(Token.id).label("count_tokens"),
        )
        .where(
            and_(
                Token.org_id == org_id,
                Token.queue_id == queue_id,
                Token.status == TokenStatus.done,
                Token.completed_at.isnot(None),
                Token.served_at.isnot(None),
                Token.completed_at > Token.served_at,
                func.extract("epoch", Token.completed_at - Token.served_at) <= 3600,
                Token.created_at >= past_cutoff,
                func.extract("isodow", local_created) == target_dow,
                func.abs(func.extract("hour", local_created) - target_hour) <= 1,
            )
        )
    )

    result = await db.execute(query)
    row = result.first()
    if row and row.avg_mins is not None and row.count_tokens > 0:
        return float(row.avg_mins), int(row.count_tokens)
    return None, 0


async def get_live_performance_and_counters(
    db: AsyncSession,
    queue_id: uuid.UUID,
    session_id: Optional[uuid.UUID],
    local_now: datetime,
) -> Tuple[Optional[float], int, int]:
    """
    Evaluates:
    1. Average completed service time over the last 45 minutes.
    2. Actual active serving counters:
       - Distinct lines/staff currently in TokenStatus.serving for this session.
       - Plus distinct lines/staff that completed service within the last 15 minutes.
       If none exist, active_counters is genuinely 0 (never forced to 1).
    """
    recent_45m = local_now - timedelta(minutes=45)
    recent_15m = local_now - timedelta(minutes=15)

    # 1. Throughput average in last 45 minutes
    avg_query = (
        select(
            func.avg(func.extract("epoch", Token.completed_at - Token.served_at) / 60.0).label("avg_mins"),
            func.count(Token.id).label("count_tokens"),
        )
        .where(
            and_(
                Token.queue_id == queue_id,
                Token.status == TokenStatus.done,
                Token.completed_at.isnot(None),
                Token.served_at.isnot(None),
                Token.completed_at > Token.served_at,
                func.extract("epoch", Token.completed_at - Token.served_at) <= 3600,
                Token.completed_at >= recent_45m,
            )
        )
    )
    avg_res = await db.execute(avg_query)
    avg_row = avg_res.first()
    live_avg = float(avg_row.avg_mins) if (avg_row and avg_row.avg_mins is not None) else None
    live_count = int(avg_row.count_tokens) if (avg_row and avg_row.count_tokens) else 0

    # 2. Currently serving lines in active session
    active_lines = set()
    if session_id:
        serving_query = (
            select(Token.assigned_line, Token.served_by_id)
            .where(
                and_(
                    Token.queue_id == queue_id,
                    Token.session_id == session_id,
                    Token.status == TokenStatus.serving,
                )
            )
        )
        serving_res = await db.execute(serving_query)
        for row in serving_res.all():
            line_key = row.assigned_line if row.assigned_line is not None else row.served_by_id
            if line_key is not None:
                active_lines.add(str(line_key))
            else:
                active_lines.add("default_serving")

    # 3. Staff active in the last 15 minutes
    recent_active_query = (
        select(Token.assigned_line, Token.served_by_id)
        .where(
            and_(
                Token.queue_id == queue_id,
                Token.status == TokenStatus.done,
                Token.completed_at >= recent_15m,
            )
        )
    )
    recent_res = await db.execute(recent_active_query)
    for row in recent_res.all():
        line_key = row.assigned_line if row.assigned_line is not None else row.served_by_id
        if line_key is not None:
            active_lines.add(str(line_key))

    active_counters = len(active_lines)
    return live_avg, live_count, active_counters


def synthesize_ai_narrative(
    people_ahead: int,
    est_wait_minutes: Optional[int],
    hist_avg: Optional[float],
    live_avg: Optional[float],
    day_name: str,
    active_counters: int,
    pax_count: int = 1,
    is_dine_mode: bool = False,
    is_paused: bool = False,
    is_closed: bool = False,
) -> Dict[str, Any]:
    """
    Generate natural language insights and advice based on live state.
    Handles closed, paused, next-in-line, and active flow states.
    """
    if is_closed:
        return {
            "estimated_min_minutes": None,
            "estimated_max_minutes": None,
            "trend_title": "Queue is currently closed",
            "summary_message": "This queue session is inactive or closed.",
            "action_advice": "Please check back during operating hours.",
            "badge_type": "closed",
            "confidence_level": "paused",
            "pace_ratio": None,
            "is_active": False,
            "is_paused": False,
        }

    if is_paused or active_counters == 0:
        return {
            "estimated_min_minutes": None,
            "estimated_max_minutes": None,
            "trend_title": "Service paused / counters on hold" if is_paused else "Counters currently on break",
            "summary_message": f"There are {people_ahead} {'parties' if is_dine_mode else 'people'} waiting, but counters are currently on hold.",
            "action_advice": "Estimates will automatically resume once a counter begins serving.",
            "badge_type": "paused",
            "confidence_level": "paused",
            "pace_ratio": None,
            "is_active": True,
            "is_paused": True,
        }

    # Immediate turn handling
    if people_ahead == 0:
        return {
            "estimated_min_minutes": 1,
            "estimated_max_minutes": 3,
            "trend_title": "You are next in line!",
            "summary_message": "The counter is preparing to call your token number shortly.",
            "action_advice": "Please proceed towards the waiting area or service counter immediately.",
            "badge_type": "almost_turn",
            "confidence_level": "high",
            "pace_ratio": 1.0,
            "is_active": True,
            "is_paused": False,
        }

    min_mins = max(1, int(round((est_wait_minutes or 5) * 0.85)))
    max_mins = max(min_mins + 2, int(round((est_wait_minutes or 5) * 1.20)))

    # Pace comparison against same day-of-week baseline
    pace_ratio = 1.0
    confidence = "moderate"
    trend_title = f"Normal flow for {day_name}"
    badge_type = "normal"

    if hist_avg and live_avg:
        confidence = "high"
        pace_ratio = round(hist_avg / max(live_avg, 0.5), 2)
        if pace_ratio >= 1.20:
            pct_faster = int((pace_ratio - 1.0) * 100)
            trend_title = f"Moving ~{pct_faster}% faster than typical {day_name}s"
            badge_type = "fast"
        elif pace_ratio <= 0.80:
            trend_title = f"Peak rush: heavier traffic than usual {day_name}s"
            badge_type = "slow"
        else:
            trend_title = f"Steady flow consistent with typical {day_name}s"
            badge_type = "normal"
    elif live_avg:
        confidence = "moderate"
        trend_title = f"Calibrated using live counter pace today"
        badge_type = "normal"
    else:
        confidence = "learning"
        trend_title = "Estimated based on branch baseline"
        badge_type = "normal"

    party_text = f" for party of {pax_count}" if is_dine_mode and pax_count > 1 else ""

    if (est_wait_minutes or 0) <= 6:
        badge_type = "almost_turn" if badge_type != "fast" else badge_type
        summary_message = f"Only {people_ahead} {'parties' if is_dine_mode else 'people'} ahead of you{party_text} across {active_counters} counter{'s' if active_counters > 1 else ''}."
        action_advice = "Please stay near the lobby — your turn is approaching shortly."
    elif (est_wait_minutes or 0) <= 15:
        summary_message = f"There are {people_ahead} {'parties' if is_dine_mode else 'people'} ahead of you{party_text} across {active_counters} counter{'s' if active_counters > 1 else ''}."
        action_advice = "Moderate wait. Feel free to relax nearby; keep this screen open for updates."
    else:
        summary_message = f"Currently experiencing queue volume with {people_ahead} {'parties' if is_dine_mode else 'people'} ahead{party_text}."
        action_advice = "Safe for a quick coffee or stroll nearby. We recommend heading back when 2 people remain."

    return {
        "estimated_min_minutes": min_mins,
        "estimated_max_minutes": max_mins,
        "trend_title": trend_title,
        "summary_message": summary_message,
        "action_advice": action_advice,
        "badge_type": badge_type,
        "confidence_level": confidence,
        "pace_ratio": pace_ratio,
        "is_active": True,
        "is_paused": False,
    }


async def compute_ai_queue_overview(
    db: AsyncSession,
    token: Token,
    queue: Queue,
    session: Optional[SessionModel],
    people_ahead: int,
    is_past_session: bool,
) -> Dict[str, Any]:
    """
    Main orchestrator that computes branch-level data intelligence
    with Redis caching and explicit zero-service handling.
    """
    org_id = token.org_id
    queue_id = token.queue_id
    pax_count = getattr(token, "pax_count", 1) or 1
    session_id = session.id if session else queue.token_session_id

    # Check paused/closed states first
    is_closed = is_past_session or not queue.is_active or (session is not None and not session.is_active)
    is_paused = bool(queue.is_paused or (session is not None and session.is_paused))

    # Fast path for terminal token statuses
    if token.status in (TokenStatus.done, TokenStatus.skipped, TokenStatus.deleted):
        return {
            "estimated_min_minutes": None,
            "estimated_max_minutes": None,
            "trend_title": f"Ticket is {token.status.value}",
            "summary_message": f"This ticket has already been marked as {token.status.value}.",
            "action_advice": "No further waiting is required.",
            "badge_type": "normal",
            "confidence_level": "high",
            "people_ahead": 0,
            "active_counters": 0,
            "pace_ratio": None,
            "day_of_week": None,
            "is_paused": False,
            "is_active": not is_closed,
        }

    # Redis cache check
    ahead_bucket = people_ahead if people_ahead <= 2 else (people_ahead // 2) * 2
    cache_key = f"ai_ov:{queue_id}:{ahead_bucket}:pax_{min(pax_count, 6)}:p_{int(is_paused)}:c_{int(is_closed)}"
    
    redis_client = None
    try:
        redis_client = get_redis()
        cached = await redis_client.get(cache_key)
        if cached:
            parsed = json.loads(cached)
            parsed["people_ahead"] = people_ahead
            return parsed
    except Exception as exc:
        logger.debug("Redis cache check bypassed: %s", exc)

    # 1. Resolve branch timezone & local time
    tz_str = await get_branch_timezone(db, org_id)
    try:
        branch_tz = ZoneInfo(tz_str)
    except Exception:
        branch_tz = ZoneInfo("UTC")
        tz_str = "UTC"

    local_now = datetime.now(branch_tz)
    day_name = local_now.strftime("%A")

    # 2. Historical baseline (past 4 weeks, same DOW, same hour window)
    hist_avg, hist_count = await get_historical_baseline(
        db, org_id, queue_id, local_now, tz_str
    )

    # 3. Live performance & true active counters
    live_avg, live_count, active_counters = await get_live_performance_and_counters(
        db, queue_id, session_id, local_now
    )

    # 4. If closed or paused or active_counters == 0, synthesize non-numeric message
    if is_closed or is_paused or active_counters == 0:
        overview = synthesize_ai_narrative(
            people_ahead=people_ahead,
            est_wait_minutes=None,
            hist_avg=hist_avg,
            live_avg=live_avg,
            day_name=day_name,
            active_counters=active_counters,
            pax_count=pax_count,
            is_dine_mode=(pax_count > 1),
            is_paused=is_paused or (active_counters == 0),
            is_closed=is_closed,
        )
        overview["people_ahead"] = people_ahead
        overview["active_counters"] = active_counters
        overview["day_of_week"] = day_name
        return overview

    # 5. Calibrated service time
    if live_avg and live_count >= 3:
        if hist_avg and hist_count >= 3:
            effective_service_time = (0.65 * live_avg) + (0.35 * hist_avg)
        else:
            effective_service_time = live_avg
    elif hist_avg and hist_count >= 3:
        effective_service_time = hist_avg
    else:
        effective_service_time = DEFAULT_SERVICE_MINUTES

    # Adjust for party size and clamp outliers
    is_dine_mode = pax_count > 1
    pax_multiplier = 1.0 + (max(0, pax_count - 2) * 0.08)
    effective_service_time = min(max(effective_service_time * pax_multiplier, 0.5), 30.0)

    # Safe wait time calculation (active_counters guaranteed > 0 here)
    raw_estimate = (people_ahead * effective_service_time) / float(active_counters)
    est_wait_minutes = max(1, int(round(raw_estimate)))

    overview = synthesize_ai_narrative(
        people_ahead=people_ahead,
        est_wait_minutes=est_wait_minutes,
        hist_avg=hist_avg,
        live_avg=live_avg,
        day_name=day_name,
        active_counters=active_counters,
        pax_count=pax_count,
        is_dine_mode=is_dine_mode,
        is_paused=False,
        is_closed=False,
    )

    overview["people_ahead"] = people_ahead
    overview["active_counters"] = active_counters
    overview["day_of_week"] = day_name

    # 6. Cache in Redis
    if redis_client:
        try:
            await redis_client.set(
                cache_key,
                json.dumps(overview),
                ex=CACHE_TTL_SECONDS,
            )
        except Exception as exc:
            logger.debug("Failed to set Redis cache: %s", exc)

    return overview
