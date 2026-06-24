"""
app/main.py
FastAPI application factory — production hardened.

Phase 5 additions:
  - Security headers middleware
  - Request ID middleware
  - Structured logging middleware
  - Prometheus metrics endpoint
  - DB pool monitoring
  - Audit table auto-creation
  - CORS hardening (env-based origins)
"""
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.db.session import connect_db, disconnect_db
from app.redis.client import connect_redis, disconnect_redis
from app.websocket.pubsub import start_subscriber, stop_subscriber
from app.monitoring.pool_monitor import start_pool_monitor, stop_pool_monitor
from app.api.v1.router import api_router
from app.websocket.routes import router as ws_router
from app.middleware.request_id import RequestIdMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.logging_middleware import LoggingMiddleware
from app.api.v1.endpoints import health as health_ep

# ── Bootstrap logging ─────────────────────────────────────────────
setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


# ── Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("━━━ Starting %s v%s [%s] ━━━", settings.APP_NAME, settings.VERSION, settings.ENVIRONMENT)

    try:
        await connect_db()
    except Exception as exc:
        logger.critical("Failed to connect to PostgreSQL: %s", exc)
        raise

    # Bootstrap initial admin/org
    from app.db.bootstrap import bootstrap_db
    try:
        await bootstrap_db()
    except Exception as exc:
        logger.critical("Failed to bootstrap database: %s", exc)
        raise

    # Auto-create audit table if it doesn't exist
    try:
        from app.db.base_class import AuditBase
        from app.audit.models import AuditLog  # noqa: F401
        from app.db.session import engine as _eng
        async with _eng.begin() as conn:
            await conn.run_sync(AuditBase.metadata.create_all)
        logger.info("✓ Audit tables ready")
        
        from app.db.session import AsyncSessionLocal
        from app.whatsapp.template_service import seed_default_templates
        async with AsyncSessionLocal() as db:
            await seed_default_templates(db)
        logger.info("✓ WhatsApp templates seeded")
    except Exception as exc:
        logger.warning("Audit table creation skipped: %s", exc)

    try:
        await connect_redis()
    except Exception as exc:
        logger.critical("Failed to connect to Redis: %s", exc)
        raise

    try:
        await start_subscriber()
        logger.info("✓ Redis Pub/Sub subscriber started")
    except Exception as exc:
        logger.critical("Failed to start Redis subscriber: %s", exc)
        raise

    # Start pool monitor
    await start_pool_monitor()

    # Start backup scheduler
    from app.utils.backup import start_scheduler
    start_scheduler()
    
    # Start auto session scheduler
    from app.utils.auto_session import auto_session_task
    import asyncio
    app.state.auto_session_task = asyncio.create_task(auto_session_task())

    # Init metrics
    from app.monitoring.metrics import init_app_info
    init_app_info()

    logger.info("✓ All systems online — application ready for traffic.")

    yield

    logger.info("━━━ Shutting down %s ━━━", settings.APP_NAME)
    await stop_pool_monitor()
    await stop_subscriber()
    await disconnect_db()
    await disconnect_redis()
    logger.info("✓ Shutdown complete.")


# ── FastAPI instance ──────────────────────────────────────────────
if settings.ENVIRONMENT == "production":
    docs_url = None
    redoc_url = None
    openapi_url = None
else:
    docs_url = "/docs"
    redoc_url = "/redoc"
    openapi_url = "/openapi.json"

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Multi-Tenant Queue Management SaaS — Production Hardened.",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
    lifespan=lifespan,
)


# ── Middleware stack (order matters: first added = outermost) ─────

# 1. Request ID (outermost — sets correlation ID for everything below)
app.add_middleware(RequestIdMiddleware)

# 2. Security headers
app.add_middleware(SecurityHeadersMiddleware)

# 3. Structured access logging
app.add_middleware(LoggingMiddleware)

# 4. CORS (production hardened)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization", 
        "Content-Type", 
        "Accept", 
        "Origin",
        "X-Requested-With"
    ],
    expose_headers=[
        "Retry-After",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Window",
    ]
)


# ── Prometheus metrics auto-instrumentation ───────────────────────
if settings.METRICS_ENABLED:
    from prometheus_fastapi_instrumentator import Instrumentator
    instrumentator = Instrumentator(
        should_group_status_codes=True,
        excluded_handlers=["/metrics", "/health"],
    )
    instrumentator.instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
    logger.info("✓ Prometheus metrics exposed at /metrics")


# ── REST routes ───────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")

app.include_router(health_ep.router, prefix="", tags=["Health"])

# ── Static Files ──────────────────────────────────────────────────
# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ── WebSocket routes ──────────────────────────────────────────────
app.include_router(ws_router, prefix="/api/v1/ws")
