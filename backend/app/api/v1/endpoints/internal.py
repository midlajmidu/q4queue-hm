"""
app/api/v1/endpoints/internal.py
Internal super_admin endpoints for managing tenants.
"""
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.core.deps import require_super_admin
from app.core.security import hash_password
from app.db.deps import get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.user import User as UserModel

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────
class OrganizationCreate(BaseModel):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=100)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)


class OrganizationResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    is_active: bool

    class Config:
        from_attributes = True


# ── Endpoints ──────────────────────────────────────────────────────
@router.post(
    "/organizations",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_tenant(
    data: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_super_admin: UserModel = Depends(require_super_admin()),
) -> Any:
    """
    Create a new Organization and its initial admin user.
    Requires super_admin role.
    """
    # 1. Start logic
    try:
        # Check slug uniqueness globally
        org_q = await db.execute(select(Organization).where(Organization.slug == data.slug))
        if org_q.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Organization slug already exists",
            )
        
        # We don't need to check email globally because email is unique per org,
        # and we are creating a new org. It will be unique within the new org.

        # 2. Create Organization
        from app.api.v1.endpoints.super_admin import IN_MEMORY_SETTINGS
        org = Organization(
            name=data.name,
            slug=data.slug,
            is_active=True,
            max_sessions=IN_MEMORY_SETTINGS.get("default_session_limit", 10),
            max_queues_per_session=IN_MEMORY_SETTINGS.get("default_queue_limit", 20),
        )
        db.add(org)
        await db.flush()  # to get org.id

        # 3. Create initial Admin for this Org
        admin_user = User(
            email=data.admin_email,
            password_hash=hash_password(data.admin_password),
            role="admin",
            is_active=True,
            org_id=org.id,
        )
        db.add(admin_user)

        # Write audit log if audit system is present in kwargs or context,
        # based on project patterns. Assuming AuditLog from app.audit.models
        try:
            from app.audit.models import AuditLog
            audit_log = AuditLog(
                org_id=org.id,
                user_id=current_super_admin.id,
                event_type="organization_created",
                entity_type="organization",
                entity_id=str(org.id),
                details={"slug": data.slug, "admin_email": data.admin_email}
            )
            db.add(audit_log)
        except ImportError:
            pass # Audit log not implemented as strict dependency

        await db.commit()
        logger.info("Created new tenant %s by super_admin %s", org.id, current_super_admin.id)
        
        return org

    except IntegrityError as e:
        await db.rollback()
        logger.error("Integrity error during tenant creation: %s", e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database integrity error. Check uniqueness constraints.",
        )
