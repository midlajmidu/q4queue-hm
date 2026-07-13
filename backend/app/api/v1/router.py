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
    parent_organizations,
    organization_admin,
    organization_admin_monitoring,
    organization_admin_settings,
    organization_admin_announcements,
    organization_admin_exports,
    organization_admin_backups,
    organization_admin_operations,
    sessions,
    analytics,
    messages,
    system,
    tracking,
    whatsapp,
    whatsapp_analytics,
    pairing,
    plivo,
    calls,
    whatsapp_media,
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

# ── Calls ──────────────────────────────────────────────────────────
api_router.include_router(calls.router, prefix="/calls", tags=["Calls"])

# ── Organization ───────────────────────────────────────────────────
api_router.include_router(organization.router, prefix="/organization", tags=["Organization"])
api_router.include_router(parent_organizations.router, prefix="/parent-organizations", tags=["Parent Organizations"])
api_router.include_router(organization_admin.router, prefix="/organization-admin", tags=["Organization Admin"])
api_router.include_router(organization_admin_monitoring.router, prefix="/organization-admin", tags=["Organization Admin Monitoring"])
api_router.include_router(organization_admin_settings.router, prefix="/organization-admin", tags=["Organization Admin Settings"])
api_router.include_router(organization_admin_announcements.router, prefix="/organization-admin", tags=["Organization Admin Announcements"])
api_router.include_router(organization_admin_exports.router, prefix="/organization-admin", tags=["Organization Admin Exports"])
api_router.include_router(organization_admin_backups.router, prefix="/organization-admin", tags=["Organization Admin Backups"])
api_router.include_router(organization_admin_operations.router, prefix="/organization-admin", tags=["Organization Admin Operations"])

# ── Super Admin ────────────────────────────────────────────────────
api_router.include_router(super_admin.router, prefix="/super-admin", tags=["Super Admin"])

# ── WhatsApp ─────────────────────────────────────────────────
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["WhatsApp"])
api_router.include_router(whatsapp_analytics.router, prefix="/whatsapp/analytics", tags=["WhatsApp Analytics"])
api_router.include_router(whatsapp_media.router, prefix="/whatsapp/media", tags=["WhatsApp Media"])
api_router.include_router(whatsapp.webhook_router, prefix="/webhooks", tags=["Webhooks"])

# ── Customer Tracking ───────────────────────────────────────
api_router.include_router(tracking.router, prefix="/track", tags=["Tracking"])

# ── Smart TV Pairing ───────────────────────────────────────
api_router.include_router(pairing.router, prefix="/pairing", tags=["Pairing"])

# ── Plivo WebRTC ───────────────────────────────────────────
api_router.include_router(plivo.router, prefix="/plivo", tags=["Plivo"])
