"""
app/db/base.py
Consolidated metadata for all models.
All models MUST be imported here so Alembic autogenerate can detect them.
"""
from app.db.base_class import Base  # noqa: F401


# ── Register all models (Alembic autogenerate requires these imports) ──────────
from app.models.organization import Organization  # noqa: E402, F401
from app.models.user import User                  # noqa: E402, F401
from app.models.session import Session            # noqa: E402, F401
from app.models.queue import Queue                # noqa: E402, F401
from app.models.token import Token                # noqa: E402, F401
from app.models.parent_organization import ParentOrganization # noqa: E402, F401
from app.models.organization_announcement import OrganizationAnnouncement # noqa: E402, F401
from app.models.system_announcement import SystemAnnouncement # noqa: E402, F401
from app.models.message import Message            # noqa: E402, F401
from app.models.export_job import ExportJob       # noqa: E402, F401
from app.models.org_backup import OrgBackup       # noqa: E402, F401
from app.models.branch_backup import BranchBackup # noqa: E402, F401
from app.audit.models import AuditLog             # noqa: E402, F401
