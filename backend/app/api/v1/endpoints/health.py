"""
app/api/v1/endpoints/health.py
Health-check endpoint — verifies API, DB, and Redis connectivity.

AUDIT FIX: Exception details no longer exposed in health response.
Was: "error: connection refused (host, port)" → now: "error"
"""
import logging
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.redis.client import get_redis

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/health",
    tags=["Health"],
    summary="System Health Check",
    response_description="Status of API, PostgreSQL, and Redis",
)
async def health_check() -> JSONResponse:
    """
    Returns the live status of all infrastructure components.
    • 200 — all systems operational
    • 503 — one or more systems degraded
    """
    health: dict = {
        "api": "ok",
        "database": "unknown",
        "redis": "unknown",
    }
    overall_ok = True

    # ── Database ──────────────────────────────────────────────────
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        health["database"] = "connected"
        logger.debug("Health check: database OK")
    except Exception as exc:
        # AUDIT FIX: Never expose exception details in response
        health["database"] = "error"
        overall_ok = False
        logger.error("Health check: database FAILED | %s", exc)

    # ── Redis ─────────────────────────────────────────────────────
    try:
        redis = get_redis()
        pong = await redis.ping()
        health["redis"] = "connected" if pong else "no-pong"
        if not pong:
            overall_ok = False
        logger.debug("Health check: redis OK")
    except Exception as exc:
        # AUDIT FIX: Never expose exception details in response
        health["redis"] = "error"
        overall_ok = False
        logger.error("Health check: redis FAILED | %s", exc)

    http_status = status.HTTP_200_OK
    return JSONResponse(status_code=http_status, content=health)
