"""
app/api/v1/endpoints/whatsapp.py
WhatsApp Cloud API management endpoints.

Routes (Super Admin):
  GET  /whatsapp/config              → get global Meta config
  POST /whatsapp/config              → save global Meta config
  GET  /whatsapp/stats               → global analytics
  GET  /whatsapp/stats/daily         → messages per day (chart)
  GET  /whatsapp/stats/by-org        → per-org breakdown
  GET  /whatsapp/templates           → list templates
  POST /whatsapp/templates           → create template
  PUT  /whatsapp/templates/{id}      → update template
  DELETE /whatsapp/templates/{id}    → delete template
  GET  /whatsapp/messages            → paginated message log

Routes (Webhook - public):
  GET  /webhooks/whatsapp            → Meta verification challenge
  POST /webhooks/whatsapp            → Meta delivery events

Routes (Org Admin):
  GET  /whatsapp/org/config          → org enable status
  PATCH /whatsapp/org/config         → toggle enable
  GET  /whatsapp/org/stats           → org analytics
  GET  /whatsapp/org/messages        → org message log
  POST /whatsapp/org/test            → send test notification
"""
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.deps import get_current_super_admin, require_branch_admin
from app.db.deps import get_db
from app.models.user import User
from app.whatsapp import config_service, template_service, analytics_service, webhook_service
from app.whatsapp.message_service import send_whatsapp_message
from app.audit.service import record_event

logger = logging.getLogger(__name__)
router = APIRouter()
webhook_router = APIRouter()


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class WhatsAppConfigUpdate(BaseModel):
    access_token: Optional[str] = None
    phone_number_id: Optional[str] = None
    waba_id: Optional[str] = None
    app_id: Optional[str] = None
    app_secret: Optional[str] = None
    business_id: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_verify_token: Optional[str] = None
    is_enabled: Optional[bool] = None
    payment_active: Optional[bool] = None
    business_verified: Optional[bool] = None
    webhook_active: Optional[bool] = None


class TestConnectionRequest(BaseModel):
    access_token: Optional[str] = None
    phone_number_id: Optional[str] = None
    waba_id: Optional[str] = None


class OrgWhatsAppConfigUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    mode: Optional[str] = None
    phone_number_id: Optional[str] = None
    waba_id: Optional[str] = None
    access_token: Optional[str] = None
    webhook_verify_token: Optional[str] = None
    app_id: Optional[str] = None
    app_secret: Optional[str] = None


class TemplateCreate(BaseModel):
    template_name: str
    category: str = "UTILITY"
    language: str = "en"
    description: Optional[str] = None
    body_text: str
    variables: Optional[dict] = None
    event_type: Optional[str] = None
    status: str = "draft"


class TemplateUpdate(BaseModel):
    category: Optional[str] = None
    language: Optional[str] = None
    description: Optional[str] = None
    body_text: Optional[str] = None
    variables: Optional[dict] = None
    event_type: Optional[str] = None
    status: Optional[str] = None


class OrgConfigUpdate(BaseModel):
    is_enabled: bool


class TestMessageRequest(BaseModel):
    phone: str
    message: Optional[str] = None


# ── Super Admin: Config ───────────────────────────────────────────────────────

@router.get("/config", summary="Get Global WhatsApp Config")
async def get_whatsapp_config(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> dict:
    """Return the current global WhatsApp configuration and derived status."""
    cfg = await config_service.get_global_config_dict()
    return cfg


@router.post("/config", summary="Save Global WhatsApp Config")
async def save_whatsapp_config(
    body: WhatsAppConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> dict:
    """Save Meta API credentials and flags. Recomputes connection status automatically."""
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    config = await config_service.upsert_global_config(db, data)

    await record_event(
        event_type="whatsapp.config_updated",
        user_id=current_user.id,
        details={"fields_updated": list(data.keys())},
    )

    return {"status": config.status, "is_enabled": config.is_enabled, "message": "Config saved"}


# ── Super Admin: Organization Routing ─────────────────────────────────────────

@router.get("/admin/organizations", summary="List Organizations WhatsApp Config")
async def list_admin_organizations_whatsapp(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> list[dict]:
    """List all organizations/branches with their assigned WhatsApp Phone ID routing."""
    return await config_service.list_admin_organizations_whatsapp(db)


@router.put("/admin/organizations/{org_id}", summary="Update Organization WhatsApp Config")
async def update_admin_organization_whatsapp(
    org_id: uuid.UUID,
    body: OrgWhatsAppConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> dict:
    """Update WhatsApp configuration and Phone Number ID for a specific organization/branch."""
    data = body.model_dump(exclude_unset=True)
    res = await config_service.update_admin_org_whatsapp(db, org_id, data)

    await record_event(
        event_type="whatsapp.org_config_updated",
        user_id=current_user.id,
        resource_type="organization",
        resource_id=str(org_id),
        details=data,
    )
    return res


@router.post("/admin/organizations/{org_id}/test-connection", summary="Test Organization WhatsApp Connection")
async def test_org_whatsapp_connection(
    org_id: uuid.UUID,
    body: Optional[TestConnectionRequest] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> dict:
    """Test Meta Graph API connectivity for an organization using its effective credentials."""
    cfg = await config_service.get_global_config_dict(org_id=org_id)
    token = (body.access_token if body and body.access_token else cfg["access_token"])
    phone_id = (body.phone_number_id if body and body.phone_number_id else cfg["phone_number_id"])
    api_ver = cfg.get("api_version") or "v21.0"

    if not token or not phone_id:
        return {
            "success": False,
            "error": "Missing Access Token or Phone Number ID for this organization.",
        }

    import httpx
    url = f"https://graph.facebook.com/{api_ver}/{phone_id}"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "message": "Connection successful! Meta Cloud API is connected for this organization.",
                    "details": {
                        "verified_name": data.get("verified_name"),
                        "display_phone_number": data.get("display_phone_number"),
                        "quality_rating": data.get("quality_rating"),
                        "code_verification_status": data.get("code_verification_status"),
                        "id": data.get("id"),
                    }
                }
            else:
                err_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = err_data.get("error", {}).get("message") or f"HTTP {resp.status_code}"
                return {
                    "success": False,
                    "error": f"Meta API Error ({resp.status_code}): {err_msg}",
                    "details": err_data,
                }
    except Exception as exc:
        return {
            "success": False,
            "error": f"Failed to connect to Meta API: {str(exc)}",
        }


@router.post("/test-connection", summary="Test WhatsApp Meta API Connection")
async def test_whatsapp_connection(
    body: Optional[TestConnectionRequest] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> dict:
    """
    Test connectivity to Meta Graph API using stored or provided credentials.
    Fetches phone number information and verify status.
    """
    cfg = await config_service.get_global_config_dict()
    token = (body.access_token if body and body.access_token else cfg["access_token"])
    phone_id = (body.phone_number_id if body and body.phone_number_id else cfg["phone_number_id"])
    api_ver = cfg.get("api_version") or "v21.0"

    if not token or not phone_id:
        return {
            "success": False,
            "error": "Missing Access Token or Phone Number ID. Please configure both fields first.",
        }

    import httpx
    url = f"https://graph.facebook.com/{api_ver}/{phone_id}"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "message": "Connection successful! Meta WhatsApp Cloud API is connected.",
                    "details": {
                        "verified_name": data.get("verified_name"),
                        "display_phone_number": data.get("display_phone_number"),
                        "quality_rating": data.get("quality_rating"),
                        "code_verification_status": data.get("code_verification_status"),
                        "id": data.get("id"),
                    }
                }
            else:
                err_data = resp.json().get("error", {})
                err_msg = err_data.get("message", f"HTTP {resp.status_code}")
                return {
                    "success": False,
                    "error": f"Meta API Error ({resp.status_code}): {err_msg}",
                    "details": err_data,
                }
    except Exception as exc:
        return {
            "success": False,
            "error": f"Connection failed: {str(exc)}"
        }


@router.post("/super-test-send", summary="Super Admin Send Test Message")
async def super_admin_test_send(
    body: TestMessageRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> dict:
    """Send a test WhatsApp message from Super Admin portal to any phone number."""
    cfg = await config_service.get_global_config_dict()
    if not cfg["access_token"] or not cfg["phone_number_id"]:
        raise HTTPException(
            status_code=400,
            detail="WhatsApp credentials are not configured. Please save Access Token and Phone Number ID first."
        )

    test_message = body.message or "✅ Test notification from Q4Queue Super Admin. WhatsApp integration is active and working!"

    background_tasks.add_task(
        send_whatsapp_message,
        phone=body.phone,
        event_type="test",
        variables=[test_message],
        org_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
    )

    await record_event(
        event_type="whatsapp.super_admin_test_sent",
        user_id=current_user.id,
        details={"phone": body.phone},
    )

    return {"status": "queued", "message": f"Test message dispatched to {body.phone}"}


# ── Super Admin: Analytics ────────────────────────────────────────────────────

@router.get("/stats", summary="Global WhatsApp Stats")
async def get_global_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> dict:
    return await analytics_service.get_global_stats(db)


@router.get("/stats/daily", summary="Daily Message Chart")
async def get_daily_chart(
    days: int = Query(default=30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> list:
    return await analytics_service.get_daily_chart(db, days=days)


@router.get("/stats/by-org", summary="Stats Per Organization")
async def get_stats_by_org(
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> list:
    return await analytics_service.get_stats_by_org(db, limit=limit)


# ── Super Admin: Templates ────────────────────────────────────────────────────

@router.get("/templates", summary="List WhatsApp Templates")
async def list_templates(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> list:
    templates = await template_service.list_templates(db)
    return [
        {
            "id": str(t.id),
            "template_name": t.template_name,
            "category": t.category,
            "language": t.language,
            "description": t.description,
            "body_text": t.body_text,
            "variables": t.variables,
            "status": t.status,
            "event_type": t.event_type,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat(),
        }
        for t in templates
    ]


@router.post("/templates", summary="Create WhatsApp Template", status_code=201)
async def create_template(
    body: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> dict:
    existing = await template_service.get_template_by_name(db, body.template_name)
    if existing:
        raise HTTPException(status_code=400, detail="Template name already exists")

    template = await template_service.create_template(db, body.model_dump())
    await record_event(
        event_type="whatsapp.template_created",
        user_id=current_user.id,
        details={"template_name": template.template_name},
    )
    return {"id": str(template.id), "template_name": template.template_name, "status": template.status}


@router.put("/templates/{template_id}", summary="Update WhatsApp Template")
async def update_template(
    template_id: uuid.UUID,
    body: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> dict:
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = await template_service.update_template(db, template_id, data)
    if updated is None:
        raise HTTPException(status_code=404, detail="Template not found")

    await record_event(
        event_type="whatsapp.template_updated",
        user_id=current_user.id,
        details={"template_id": str(template_id), "fields": list(data.keys())},
    )
    return {"id": str(updated.id), "template_name": updated.template_name, "status": updated.status}


@router.delete("/templates/{template_id}", summary="Delete WhatsApp Template", status_code=204)
async def delete_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> None:
    deleted = await template_service.delete_template(db, template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")

    await record_event(
        event_type="whatsapp.template_deleted",
        user_id=current_user.id,
        details={"template_id": str(template_id)},
    )


@router.post("/templates/sync-meta", summary="Purge Deprecated Templates from Meta WABA and Synchronize")
async def sync_meta_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> dict:
    result = await template_service.purge_deprecated_templates_from_meta(db)
    await record_event(
        event_type="whatsapp.templates_meta_synced",
        user_id=current_user.id,
        details=result,
    )
    return result


@router.delete("/templates/meta/{template_name}", summary="Delete Template from Meta WABA")
async def delete_meta_template_by_name(
    template_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> dict:
    result = await template_service.delete_template_from_meta(db, template_name)
    await record_event(
        event_type="whatsapp.template_meta_deleted",
        user_id=current_user.id,
        details={"template_name": template_name, "result": result},
    )
    return result


# ── Super Admin: Message Log ──────────────────────────────────────────────────

@router.get("/messages", summary="Global WhatsApp Message Log")
async def get_messages(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    organization_id: Optional[uuid.UUID] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    customer_phone: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    message_type: Optional[str] = Query(None),
    queue_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> dict:
    messages, total = await analytics_service.get_recent_messages(
        db, limit=limit, offset=offset, organization_id=organization_id,
        start_date=start_date, end_date=end_date, customer_phone=customer_phone,
        status=status, message_type=message_type, queue_id=queue_id
    )
    return {
        "items": [
            {
                "id": str(m.id),
                "organization_id": str(m.organization_id),
                "customer_phone": m.customer_phone,
                "customer_name": m.customer_name,
                "event_type": m.event_type,
                "template_name": m.template_name,
                "status": m.status,
                "meta_message_id": m.meta_message_id,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
                "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
                "read_at": m.read_at.isoformat() if m.read_at else None,
                "failed_at": m.failed_at.isoformat() if m.failed_at else None,
                "error_message": m.error_message,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# ── Org Admin: WhatsApp Settings (Moved to whatsapp_analytics.py) ─────────────


@router.post("/org/test", summary="Send Test WhatsApp Notification")
async def send_test_notification(
    body: TestMessageRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_branch_admin()),
) -> dict:
    """Send a test WhatsApp message to verify connectivity."""
    if current_user.org_id is None:
        raise HTTPException(status_code=403, detail="No organization context")

    test_message = body.message or "✅ This is a test notification from Q4Queue. WhatsApp is working correctly!"

    background_tasks.add_task(
        send_whatsapp_message,
        phone=body.phone,
        event_type="test",
        variables=[test_message],
        org_id=current_user.org_id,
    )

    await record_event(
        event_type="whatsapp.test_sent",
        org_id=current_user.org_id,
        user_id=current_user.id,
        details={"phone": body.phone},
    )

    return {"status": "queued", "message": "Test notification dispatched"}


# ── Token WhatsApp Status (for queue monitoring) ──────────────────────────────

@router.get("/token/{token_id}/status", summary="Get WhatsApp Status for Token")
async def get_token_whatsapp_status(
    token_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_branch_admin()),
) -> list:
    """Return WhatsApp delivery statuses for a specific token (queue monitoring icons)."""
    return await analytics_service.get_token_message_status(db, token_id)


# ── Webhook Endpoints ─────────────────────────────────────────────────────────

@webhook_router.get("/whatsapp", summary="WhatsApp Webhook Verification")
async def verify_whatsapp_webhook(
    request: Request,
) -> object:
    """
    Meta calls this GET endpoint to verify the webhook URL.
    Responds with the challenge string if the verify token matches.
    """
    params = dict(request.query_params)
    mode = params.get("hub.mode", "")
    token = params.get("hub.verify_token", "")
    challenge = params.get("hub.challenge", "")

    success, result = await webhook_service.verify_webhook(mode, token, challenge)
    if not success:
        raise HTTPException(status_code=403, detail=result)

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(content=result, status_code=200)


@webhook_router.post("/whatsapp", summary="WhatsApp Webhook Events", status_code=200)
async def receive_whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict:
    """
    Meta sends delivery status events here.
    Always returns 200 immediately — processing is async.
    """
    try:
        payload = await request.json()
        background_tasks.add_task(webhook_service.process_webhook, payload)
    except Exception as exc:
        logger.error("Webhook parse error: %s", exc)
    return {"status": "received"}
