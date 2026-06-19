"""
app/api/v1/router.py
Top-level v1 API router — register all endpoint routers here.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    users,
    queues,
    tokens,
    super_admin,
    staff,
    organization,
    sessions,
    analytics,
    messages,
    system,
)

api_router = APIRouter()

# ── Health ─────────────────────────────────────────────────────────
api_router.include_router(health.router, prefix="", tags=["Health"])

# ── System ─────────────────────────────────────────────────────────
api_router.include_router(system.router, prefix="/system", tags=["System"])

# ── Authentication ─────────────────────────────────────────────────
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

# ── Users ──────────────────────────────────────────────────────────
api_router.include_router(users.router, prefix="/users", tags=["Users"])

# ── Staff Management ───────────────────────────────────────────────
api_router.include_router(staff.router, prefix="/staff", tags=["Staff"])

# ── Sessions (date-based queue groups) ────────────────────────────
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])

# ── Queues ─────────────────────────────────────────────────────────
api_router.include_router(queues.router, prefix="/queues", tags=["Queues"])

# ── Analytics ──────────────────────────────────────────────────────
api_router.include_router(analytics.router, prefix="/stats", tags=["Analytics"])

# ── Tokens ─────────────────────────────────────────────────────────
api_router.include_router(tokens.router, prefix="/tokens", tags=["Tokens"])

# ── Messages ───────────────────────────────────────────────────────
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])

# ── Organization ───────────────────────────────────────────────────
api_router.include_router(organization.router, prefix="/organization", tags=["Organization"])

# ── Super Admin ────────────────────────────────────────────────────
api_router.include_router(super_admin.router, prefix="/super-admin", tags=["Super Admin"])
