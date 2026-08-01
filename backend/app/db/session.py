"""
app/db/session.py
Async SQLAlchemy engine + session factory with connection pooling.
"""
import logging
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
    AsyncEngine,
)
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Engine (created once at module import) ────────────────────────────────────
engine: AsyncEngine = create_async_engine(
    settings.database_url_async,
    echo=False,                              # Disable verbose SQL logging for high performance
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,                    # detect stale connections
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def connect_db() -> None:
    """Verify DB connectivity at startup."""
    async with engine.connect() as conn:
        await conn.execute(
            __import__("sqlalchemy").text("SELECT 1")
        )
    logger.info("PostgreSQL connection pool ready | url=%s", settings.database_url_async.split("@")[-1])


async def disconnect_db() -> None:
    """Gracefully dispose the connection pool on shutdown."""
    await engine.dispose()
    logger.info("PostgreSQL connection pool closed.")
