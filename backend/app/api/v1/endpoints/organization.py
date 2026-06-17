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
from app.redis.client import get_redis
from app.services.email_service import send_otp_email
from app.services.token_service import notify_queue_update
import secrets
import uuid

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────

class OrganizationSettingsResponse(BaseModel):
    name: str
    slug: str
    email: str
    address: Optional[str] = None
    phone_number: Optional[str] = None
    logo_url: Optional[str] = None
    brand_color: Optional[str] = None

    model_config = {"from_attributes": True}

class OrganizationSettingsUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = Field(None, max_length=1000)
    phone_number: Optional[str] = Field(None, max_length=30)
    brand_color: Optional[str] = Field(None, max_length=20)

class ChangePasswordRequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)

class RequestOtpRequest(BaseModel):
    current_password: str

class SuccessResponse(BaseModel):
    message: str

# ── Endpoints ──────────────────────────────────────────────────────

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

    return OrganizationSettingsResponse(
        name=org.name,
        slug=org.slug,
        email=current_user.email,
        address=org.address,
        phone_number=org.phone_number,
        logo_url=org.logo_url,
        brand_color=org.brand_color
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
    org.brand_color = data.brand_color
    
    await db.flush()

    # Notify all active queues to refresh branding
    active_queues = await db.execute(select(Queue).where(Queue.org_id == org.id, Queue.is_active == True))
    for q in active_queues.scalars():
        await notify_queue_update(q.id, org.id)

    return OrganizationSettingsResponse(
        name=org.name,
        slug=org.slug,
        email=current_user.email,
        address=org.address,
        phone_number=org.phone_number,
        logo_url=org.logo_url,
        brand_color=org.brand_color
    )

class LogoUploadRequest(BaseModel):
    filename: str
    base64_data: str

@router.post("/settings/logo", response_model=OrganizationSettingsResponse)
async def upload_organization_logo(
    data: LogoUploadRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload an organization logo (base64)
    """
    if current_user.role != "admin" and current_user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organization admins can upload logos")
        
    if not current_user.org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User does not belong to an organization")
        
    result = await db.execute(select(Organization).where(Organization.id == current_user.org_id).with_for_update())
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Ensure uploads directory exists
    os.makedirs("uploads", exist_ok=True)

    # Generate a unique filename using org_id and a random UUID to prevent caching issues on change
    ext = data.filename.split(".")[-1] if "." in data.filename else "png"
    filename = f"{org.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join("uploads", filename)

    # Decode base64 and write to file
    try:
        # Strip data URL scheme if present (e.g., "data:image/png;base64,...")
        base64_str = data.base64_data
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
            
        file_bytes = base64.b64decode(base64_str)
        with open(filepath, 'wb') as out_file:
            out_file.write(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image data")

    org.logo_url = f"/uploads/{filename}"
    await db.flush()

    # Notify all active queues to refresh branding
    active_queues = await db.execute(select(Queue).where(Queue.org_id == org.id, Queue.is_active == True))
    for q in active_queues.scalars():
        await notify_queue_update(q.id, org.id)

    return OrganizationSettingsResponse(
        name=org.name,
        slug=org.slug,
        email=current_user.email,
        address=org.address,
        phone_number=org.phone_number,
        logo_url=org.logo_url,
        brand_color=org.brand_color
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
