"""
tests/conftest.py
Shared pytest fixtures — async HTTP client, seeded DB state, auth tokens.

The test suite connects to the RUNNING Docker services (postgres + redis).
Run tests WITH docker-compose up active:
  docker-compose exec backend pytest tests/ -v
"""
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog  # noqa: F401 - register AuditBase metadata
from app.core.config import get_settings
from app.core.security import create_access_token, hash_password
from app.db.base_class import AuditBase
from app.db.session import AsyncSessionLocal, engine
from app.main import app
from app.models.organization import Organization
from app.models.user import User

# ── Pytest-asyncio global config ─────────────────────────────────────────────
pytest_plugins = ("anyio",)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def ensure_isolated_test_schema() -> AsyncGenerator[None, None]:
    """Refuse production DBs and ensure auxiliary test schema is current."""
    database_name = make_url(get_settings().database_url_async).database or ""
    if "test" not in database_name.lower():
        raise RuntimeError(
            f"Refusing to run tests against non-test database {database_name!r}."
        )
    async with engine.begin() as connection:
        await connection.run_sync(AuditBase.metadata.create_all)
        await connection.execute(text(
            "ALTER TABLE IF EXISTS whatsapp_configs "
            "ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(30) "
            "NOT NULL DEFAULT 'button_reply_only'"
        ))
    yield


# ─────────────────────────────────────────────────────────────────────────────
# HTTP client
# ─────────────────────────────────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """ASGI test client — hits the real FastAPI app in-process."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ─────────────────────────────────────────────────────────────────────────────
# Database session
# ─────────────────────────────────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Fresh DB session per test — rolls back after each test."""
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()


# ─────────────────────────────────────────────────────────────────────────────
# Seeded tenant fixtures
# ─────────────────────────────────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session")
async def org_a() -> AsyncGenerator[Organization, None]:
    """Org A — persisted for the test session."""
    async with AsyncSessionLocal() as session:
        org = Organization(name="Test Org A", slug=f"test-org-a-{uuid.uuid4().hex[:6]}")
        session.add(org)
        await session.commit()
        await session.refresh(org)
        yield org
        await session.delete(org)
        await session.commit()


@pytest_asyncio.fixture(scope="session")
async def org_b() -> AsyncGenerator[Organization, None]:
    """Org B — separate tenant."""
    async with AsyncSessionLocal() as session:
        org = Organization(name="Test Org B", slug=f"test-org-b-{uuid.uuid4().hex[:6]}")
        session.add(org)
        await session.commit()
        await session.refresh(org)
        yield org
        await session.delete(org)
        await session.commit()


@pytest_asyncio.fixture(scope="session")
async def user_a(org_a: Organization) -> AsyncGenerator[User, None]:
    """Admin user in Org A."""
    async with AsyncSessionLocal() as session:
        user = User(
            org_id=org_a.id,
            email="testadmin@example.com",
            password_hash=hash_password("password_orgA"),
            role="admin",
            is_first_login=False,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        yield user
        await session.delete(user)
        await session.commit()


@pytest_asyncio.fixture(scope="session")
async def user_b(org_b: Organization) -> AsyncGenerator[User, None]:
    """Admin user in Org B — same email as user_a (multi-tenant isolation proof)."""
    async with AsyncSessionLocal() as session:
        user = User(
            org_id=org_b.id,
            email="testadmin@example.com",   # same email, different org
            password_hash=hash_password("password_orgB"),
            role="admin",
            is_first_login=False,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        yield user
        await session.delete(user)
        await session.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Token helpers
# ─────────────────────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def token_a(user_a: User, org_a: Organization) -> str:
    return create_access_token(
        user_id=str(user_a.id),
        org_id=str(org_a.id),
        role=user_a.role,
        email=user_a.email,
    )


@pytest.fixture(scope="session")
def token_b(user_b: User, org_b: Organization) -> str:
    return create_access_token(
        user_id=str(user_b.id),
        org_id=str(org_b.id),
        role=user_b.role,
        email=user_b.email,
    )


@pytest.fixture(scope="session")
def auth_headers_a(token_a: str) -> dict:
    return {"Authorization": f"Bearer {token_a}"}


@pytest.fixture(scope="session")
def auth_headers_b(token_b: str) -> dict:
    return {"Authorization": f"Bearer {token_b}"}
