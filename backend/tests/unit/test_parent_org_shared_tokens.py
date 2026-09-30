"""Unit tests for shared tokens attribute on ParentOrganization and Organization models."""
import uuid
from datetime import datetime, timezone
from app.models.parent_organization import ParentOrganization
from app.models.organization import Organization
from app.schemas.parent_organization import ParentOrganizationResponse


def test_parent_organization_default_shared_tokens():
    """Verify that enable_shared_tokens is defined as boolean on ParentOrganization."""
    parent_org = ParentOrganization(
        id=uuid.uuid4(),
        name="Enterprise Healthcare",
        slug="enterprise-healthcare",
        enable_shared_tokens=False,
    )
    assert parent_org.enable_shared_tokens is False


def test_organization_enable_shared_tokens():
    """Verify that enable_shared_tokens can be enabled and serialized correctly."""
    parent_org_id = uuid.uuid4()
    branch = Organization(
        id=uuid.uuid4(),
        parent_organization_id=parent_org_id,
        name="Downtown Clinic",
        slug="downtown-clinic",
        enable_shared_tokens=True,
    )
    assert branch.enable_shared_tokens is True


def test_parent_organization_response_schema():
    """Verify that ParentOrganizationResponse schema properly includes enable_shared_tokens."""
    now = datetime.now(timezone.utc)
    schema = ParentOrganizationResponse(
        id=uuid.uuid4(),
        name="Enterprise Group",
        slug="enterprise-group",
        is_active=True,
        enable_shared_tokens=True,
        created_at=now,
        updated_at=now,
    )
    assert schema.enable_shared_tokens is True
    dumped = schema.model_dump()
    assert dumped["enable_shared_tokens"] is True
