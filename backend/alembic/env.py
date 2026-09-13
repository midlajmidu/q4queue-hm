"""
alembic/env.py
Alembic environment — supports async SQLAlchemy.
"""
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# Import Base and all models (so autogenerate can detect them)
from app.db.base import Base
from app.db.base_class import AuditBase
from app.audit.models import AuditLog  # noqa: F401 - register audit metadata
from app.core.config import get_settings

settings = get_settings()

# Alembic Config object
config = context.config

database_url = settings.database_url_async
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use the asyncpg URL from settings
config.set_main_option("sqlalchemy.url", settings.database_url_async)

target_metadata = [Base.metadata, AuditBase.metadata]


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""

    url = settings.database_url_async
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()




async def run_async_migrations() -> None:
    """Run migrations in 'online' mode using async engine."""

    database_url = settings.database_url_async

    connectable = create_async_engine(
        database_url,
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
