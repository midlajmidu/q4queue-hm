"""
app/audit/service.py
Audit trail recording service.

Fire-and-forget: audit logging never blocks or crashes the main request.
Failures are logged but silently swallowed.

Event types:
  - token.join
  - token.next
  - token.skip
  - token.done
  - queue.create
  - queue.toggle
  - auth.login
  - auth.login_failed
"""
import logging
import uuid
from typing import Any, Optional


from app.audit.models import AuditLog
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def record_event(
    *,
    event_type: str,
    org_id: Optional[uuid.UUID] = None,
    parent_org_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    ip_address: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
) -> None:
    """
    Record an audit event. Fire-and-forget — never raises.
    Uses a separate DB session to avoid interfering with the main transaction.
    """
    try:
        async with AsyncSessionLocal() as db:
            log = AuditLog(
                event_type=event_type,
                org_id=org_id,
                parent_organization_id=parent_org_id,
                user_id=user_id,
                ip_address=ip_address,
                resource_type=resource_type,
                resource_id=resource_id if resource_id else None,
                details=details,
            )
            db.add(log)
            await db.commit()
    except Exception as exc:
        # Never crash the main request
        logger.error("Audit log failed | event=%s err=%s", event_type, exc)
