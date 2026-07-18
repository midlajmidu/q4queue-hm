from typing import Optional
import os
import base64
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.core.security import hash_password, verify_password
from app.db.deps import get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.queue import Queue
from app.models.organization_announcement import OrganizationAnnouncement
from app.schemas.organization_announcement import OrganizationAnnouncementResponse
from app.redis.client import get_redis
from app.services.email_service import send_otp_email
from app.services.token_service import notify_queue_update
import secrets
import uuid

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────

class SupportContactResponse(BaseModel):
    support_email: str
    support_phone: str

class ParentOrgSummary(BaseModel):
    id: str
    name: str
    slug: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None

class OrganizationSettingsResponse(BaseModel):
    name: str
    slug: str
    email: str
    address: Optional[str] = None
    phone_number: Optional[str] = None
    queue_templates: list[dict] = []
    auto_session_enabled: bool = False
    auto_session_time: Optional[str] = None
    access_token: Optional[str] = None
    parent_org: Optional[ParentOrgSummary] = None

    model_config = {"from_attributes": True}

class OrganizationSettingsUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = Field(None, max_length=1000)
    phone_number: Optional[str] = Field(None, max_length=30)
    queue_templates: Optional[list[dict]] = None
    auto_session_enabled: Optional[bool] = None
    auto_session_time: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)

class RequestOtpRequest(BaseModel):
    current_password: str

class SuccessResponse(BaseModel):
    message: str

# ── Endpoints ──────────────────────────────────────────────────────

@router.get("/support-contact", response_model=SupportContactResponse)
async def get_support_contact(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get the platform support contact information."""
    from app.api.v1.endpoints.super_admin import IN_MEMORY_SETTINGS
    from app.models.parent_organization import ParentOrganization
    
    support_email = IN_MEMORY_SETTINGS.get("support_email", "contact@q4queue.com")
    support_phone = IN_MEMORY_SETTINGS.get("support_phone", "")

    if hasattr(current_user, 'parent_organization_id') and current_user.parent_organization_id:
        parent_org = await db.scalar(select(ParentOrganization).where(ParentOrganization.id == current_user.parent_organization_id))
        if parent_org:
            support_email = parent_org.contact_email or support_email
            support_phone = parent_org.contact_phone or support_phone
    elif current_user.org_id:
        org = await db.scalar(select(Organization).where(Organization.id == current_user.org_id))
        if org and org.parent_organization_id:
            parent_org = await db.scalar(select(ParentOrganization).where(ParentOrganization.id == org.parent_organization_id))
            if parent_org:
                support_email = parent_org.contact_email or support_email
                support_phone = parent_org.contact_phone or support_phone

    return SupportContactResponse(
        support_email=support_email,
        support_phone=support_phone
    )

@router.get("/settings", response_model=OrganizationSettingsResponse)
async def get_organization_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get the clinic settings for the currently authenticated admin's organization."""
    if not current_user.org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User does not belong to an organization")
    
    result = await db.execute(select(Organization).where(Organization.id == current_user.org_id))
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Fetch parent org details if linked
    parent_org_summary = None
    if org.parent_organization_id:
        from app.models.parent_organization import ParentOrganization
        po = await db.scalar(select(ParentOrganization).where(ParentOrganization.id == org.parent_organization_id))
        if po:
            parent_org_summary = ParentOrgSummary(
                id=str(po.id),
                name=po.name,
                slug=po.slug,
                contact_email=po.contact_email,
                contact_phone=po.contact_phone,
                address=po.address,
                logo_url=po.logo_url,
            )

    return OrganizationSettingsResponse(
        name=org.name,
        slug=org.slug,
        email=current_user.email,
        address=org.address,
        phone_number=org.phone_number,
        queue_templates=org.queue_templates if org.queue_templates is not None else [],
        auto_session_enabled=org.auto_session_enabled,
        auto_session_time=org.auto_session_time,
        parent_org=parent_org_summary,
    )

@router.put("/settings", response_model=OrganizationSettingsResponse)
async def update_organization_settings(
    data: OrganizationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update the clinic settings. Accessible by admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organization admins can update settings")
        
    if not current_user.org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User does not belong to an organization")
        
    result = await db.execute(select(Organization).where(Organization.id == current_user.org_id).with_for_update())
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    org.name = data.name
    org.address = data.address
    org.phone_number = data.phone_number

    old_active_templates = {t["id"] for t in (org.queue_templates or []) if t.get("isActive") is True}

    if data.queue_templates is not None:
        org.queue_templates = data.queue_templates
    if data.auto_session_enabled is not None:
        org.auto_session_enabled = data.auto_session_enabled
    if data.auto_session_time is not None:
        org.auto_session_time = data.auto_session_time
    
    await db.flush()

    new_active_templates = {t["id"] for t in (org.queue_templates or []) if t.get("isActive") is True}
    newly_activated = new_active_templates - old_active_templates

    if newly_activated:
        from datetime import datetime
        from zoneinfo import ZoneInfo
        from app.models.session import Session
        from app.services.queue_service import create_queue
        from app.schemas.queue import QueueCreate

        local_now = datetime.now(ZoneInfo("Asia/Kolkata"))
        active_sessions_result = await db.execute(
            select(Session).where(
                Session.org_id == org.id,
                Session.session_date >= local_now.date()
            )
        )
        active_sessions = active_sessions_result.scalars().all()

        for session in active_sessions:
            for tpl in org.queue_templates:
                if tpl["id"] in newly_activated:
                    queue_name = tpl.get("name", "Queue")
                    existing_queue = await db.scalar(
                        select(Queue).where(
                            Queue.org_id == org.id,
                            Queue.session_id == session.id,
                            Queue.name == queue_name
                        )
                    )
                    if existing_queue:
                        continue
                        
                    try:
                        await create_queue(
                            db,
                            org_id=org.id,
                            session_id=session.id,
                            data=QueueCreate(
                                name=queue_name,
                                prefix=tpl.get("defaultPrefix", "A"),
                                starting_sequence=tpl.get("startingNumber", 1),
                                service_lines=tpl.get("serviceLines", 0),
                                open_time=tpl.get("openTime"),
                                close_time=tpl.get("closeTime")
                            )
                        )
                    except Exception:
                        pass # Ignore errors

    # Notify all active queues to refresh branding
    active_queues = await db.execute(select(Queue).where(Queue.org_id == org.id, Queue.is_active == True))
    for q in active_queues.scalars():
        await notify_queue_update(q.id, org.id)

    from app.core.security import create_access_token
    token = create_access_token(
        user_id=str(current_user.id),
        org_id=str(current_user.org_id) if current_user.org_id else None,
        parent_org_id=str(current_user.parent_organization_id) if current_user.parent_organization_id else None,
        role=current_user.role,
        email=current_user.email,
        org_slug=org.slug,
        org_name=org.name,
        org_logo_url=None,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_first_login=current_user.is_first_login,
    )

    return OrganizationSettingsResponse(
        name=org.name,
        slug=org.slug,
        email=current_user.email,
        address=org.address,
        phone_number=org.phone_number,
        queue_templates=org.queue_templates if org.queue_templates is not None else [],
        auto_session_enabled=org.auto_session_enabled,
        auto_session_time=org.auto_session_time,
        access_token=token,
    )



@router.post("/request-password-change-otp", response_model=SuccessResponse)
async def request_password_change_otp(
    data: RequestOtpRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Verify current password and send an OTP via email for password change."""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")

    # Generate 6-digit OTP
    otp = "".join(str(secrets.randbelow(10)) for _ in range(6))
    
    redis = get_redis()
    otp_key = f"otp:pwd_change:{current_user.id}"
    
    # Store OTP in Redis with 5 minutes expiration (300 seconds)
    await redis.setex(otp_key, 300, otp)
    
    # Send email asynchronously
    success = await send_otp_email(current_user.email, otp)
    if not success:
        # We don't fail the request completely to allow testing if SMTP isn't configured,
        # since it logs the OTP. In strict prod, we might return 500.
        pass

    return SuccessResponse(message="OTP sent to your email address")

@router.post("/change-password", response_model=SuccessResponse)
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Change the admin's own password using the OTP sent to their email."""
    redis = get_redis()
    otp_key = f"otp:pwd_change:{current_user.id}"
    
    stored_otp = await redis.get(otp_key)
    if not stored_otp or stored_otp != data.otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    result = await db.execute(select(User).where(User.id == current_user.id).with_for_update())
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(data.new_password)
    from datetime import datetime, timezone
    user.password_changed_at = datetime.now(timezone.utc)
    await db.flush()
    
    # Invalidate OTP
    await redis.delete(otp_key)

    return SuccessResponse(message="Password changed successfully")

@router.get("/announcements/active", response_model=list[OrganizationAnnouncementResponse])
async def get_active_organization_announcements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get active announcements from the parent organization for this branch."""
    if not current_user.org_id:
        return []
        
    org_result = await db.execute(select(Organization).where(Organization.id == current_user.org_id))
    org = org_result.scalar_one_or_none()
    
    if not org or not org.parent_organization_id:
        return []
        
    from datetime import datetime
    now = datetime.utcnow()
    
    query = select(OrganizationAnnouncement).where(
        OrganizationAnnouncement.parent_organization_id == org.parent_organization_id,
        OrganizationAnnouncement.is_active == True
    )
    
    result = await db.execute(query)
    announcements = result.scalars().all()
    
    # Filter by start_time, end_time, and target_branches
    valid_announcements = []
    for ann in announcements:
        if ann.start_time and ann.start_time.replace(tzinfo=None) > now:
            continue
        if ann.end_time and ann.end_time.replace(tzinfo=None) < now:
            continue
        if ann.target_branches and org.id not in ann.target_branches:
            continue
        valid_announcements.append(ann)
        
    return valid_announcements
