"""
scripts/sync_plivo_history.py
Synchronizes complete historical Call Detail Records (CDR) from Plivo for the past 60-90 days.
Accurately maps each call to its correct branch (Organization), queue, and token by matching
customer phone numbers against the database.

Usage (inside Docker on live server):
    docker compose exec backend python -m scripts.sync_plivo_history --days 60

Usage (locally):
    python -m scripts.sync_plivo_history --days 60
"""
import asyncio
import argparse
import sys
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import httpx
from sqlalchemy import select, and_, or_, desc

# Ensure app is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal, connect_db
from app.core.config import get_settings
from app.models.call_log import CallLog
from app.models.organization import Organization
from app.models.token import Token
from app.models.user import User
from app.models.session import Session
from app.models.queue import Queue

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sync_plivo_history")


async def sync_history(days: int = 60, default_branch_slug: Optional[str] = "churchstreet") -> None:
    settings = get_settings()
    auth_id = settings.PLIVO_AUTH_ID
    auth_token = settings.PLIVO_AUTH_TOKEN

    if not auth_id or not auth_token:
        logger.error("❌ PLIVO_AUTH_ID or PLIVO_AUTH_TOKEN is not configured in .env!")
        sys.exit(1)

    try:
        await connect_db()
    except Exception as e:
        logger.error("❌ Failed to connect to database: %s", e)
        sys.exit(1)

    async with AsyncSessionLocal() as db:
        # Load all organizations for quick lookup
        org_res = await db.execute(select(Organization).where(Organization.is_active == True))
        all_orgs = org_res.scalars().all()
        org_by_slug = {o.slug: o for o in all_orgs}
        org_by_id = {o.id: o for o in all_orgs}

        fallback_org = None
        if default_branch_slug and default_branch_slug in org_by_slug:
            fallback_org = org_by_slug[default_branch_slug]
        elif all_orgs:
            fallback_org = all_orgs[0]

        logger.info("Found %d active branches in database.", len(all_orgs))
        if fallback_org:
            logger.info("Default fallback branch: %s (slug=%s, id=%s)", fallback_org.name, fallback_org.slug, fallback_org.id)

        # Cache existing IDs to prevent ForeignKeyViolationError on deleted/dangling sessions, queues, etc.
        valid_sessions = set((await db.execute(select(Session.id))).scalars().all())
        valid_queues = set((await db.execute(select(Queue.id))).scalars().all())
        valid_tokens = set((await db.execute(select(Token.id))).scalars().all())
        valid_users = set((await db.execute(select(User.id))).scalars().all())

        # Calculate time cutoff
        now = datetime.now(timezone.utc)
        since_date = now - timedelta(days=days)
        logger.info("Fetching Plivo calls from the last %d days (since %s)...", days, since_date.strftime("%Y-%m-%d"))

        # Paginate through Plivo Call API
        url = f"https://api.plivo.com/v1/Account/{auth_id}/Call/"
        all_plivo_calls: List[Dict[str, Any]] = []

        async with httpx.AsyncClient(auth=(auth_id, auth_token), timeout=25.0) as client:
            offset = 0
            page_size = 50
            total_fetched = 0

            while True:
                params = {
                    "limit": page_size,
                    "offset": offset,
                    "call_direction": "outbound",
                }
                logger.info("Fetching Plivo calls page (offset=%d)...", offset)
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    logger.error("Plivo API returned status %d: %s", resp.status_code, resp.text)
                    break

                data = resp.json()
                calls = data.get("objects", [])
                if not calls:
                    break

                for c in calls:
                    # Check initiation time against our cutoff
                    init_str = c.get("initiation_time")
                    call_dt = None
                    if init_str:
                        try:
                            call_dt = datetime.fromisoformat(init_str)
                            if call_dt.tzinfo is None:
                                call_dt = call_dt.replace(tzinfo=timezone.utc)
                        except Exception:
                            pass

                    # Filter: ignore internal SIP legs
                    to_num = str(c.get("to_number") or "").strip()
                    if to_num.startswith("sip:"):
                        continue

                    if call_dt and call_dt < since_date:
                        # Reached calls older than the requested days
                        pass

                    all_plivo_calls.append(c)

                total_fetched += len(calls)
                if len(calls) < page_size or not data.get("meta", {}).get("next"):
                    break
                offset += page_size

        logger.info("Fetched %d total outbound customer calls from Plivo.", len(all_plivo_calls))
        if not all_plivo_calls:
            logger.info("No calls found to synchronize.")
            return

        inserted_count = 0
        updated_count = 0
        branch_counts: Dict[str, int] = {}

        for c in all_plivo_calls:
            raw_to = str(c.get("to_number") or "").strip()
            if not raw_to or raw_to.startswith("sip:"):
                continue

            phone = f"+{raw_to}" if not raw_to.startswith("+") else raw_to
            phone_variants = list(set([phone, phone.lstrip("+"), f"+{phone.lstrip('+')}"]))

            dur = int(float(c.get("call_duration") or 0))
            ring = int(float(c.get("ring_duration") or 0))
            state = str(c.get("call_state") or "").upper().strip()

            if state == "ANSWER" or dur > 0:
                call_status = "completed"
            elif state == "BUSY":
                call_status = "busy"
            elif ring < 5:
                call_status = "cancelled"
            else:
                call_status = "no_answer"

            init_str = c.get("initiation_time")
            created_at = now
            if init_str:
                try:
                    parsed_dt = datetime.fromisoformat(init_str)
                    if parsed_dt.tzinfo is None:
                        parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                    created_at = parsed_dt
                except Exception:
                    pass

            # Match against recent tokens to accurately resolve Branch and Queue
            digits_tail = "".join(filter(str.isdigit, raw_to))[-10:] if len(raw_to) >= 10 else raw_to
            tok_res = await db.execute(
                select(Token).where(
                    Token.customer_phone.like(f"%{digits_tail}")
                ).order_by(desc(Token.created_at)).limit(1)
            )
            matched_token = tok_res.scalar_one_or_none()

            actual_org_id = matched_token.org_id if matched_token else (fallback_org.id if fallback_org else None)
            actual_queue_id = matched_token.queue_id if (matched_token and matched_token.queue_id in valid_queues) else None
            actual_session_id = matched_token.session_id if (matched_token and matched_token.session_id in valid_sessions) else None
            actual_token_id = matched_token.id if (matched_token and matched_token.id in valid_tokens) else None
            actual_cust_name = matched_token.customer_name if (matched_token and matched_token.customer_name) else "Customer"
            actual_caller_id = matched_token.served_by_id if (matched_token and matched_token.served_by_id in valid_users) else None

            if not actual_org_id:
                continue

            # Check if this call is already logged in DB
            time_margin = timedelta(minutes=3)
            log_res = await db.execute(
                select(CallLog).where(
                    and_(
                        CallLog.customer_phone.in_(phone_variants),
                        CallLog.created_at >= created_at - time_margin,
                        CallLog.created_at <= created_at + time_margin,
                    )
                ).limit(1)
            )
            existing_log = log_res.scalar_one_or_none()

            org_name = org_by_id.get(actual_org_id).name if actual_org_id in org_by_id else str(actual_org_id)

            if existing_log:
                # Update existing log
                changed = False
                if existing_log.duration_seconds == 0 and dur > 0:
                    existing_log.duration_seconds = dur
                    changed = True
                if existing_log.ring_duration_seconds == 0 and ring > 0:
                    existing_log.ring_duration_seconds = ring
                    changed = True
                if existing_log.call_status != call_status and call_status == "completed":
                    existing_log.call_status = call_status
                    changed = True
                # Correct wrong organization_id if it was mistakenly assigned to test-branch
                if existing_log.organization_id != actual_org_id and actual_org_id:
                    existing_log.organization_id = actual_org_id
                    changed = True
                if not existing_log.queue_id and actual_queue_id:
                    existing_log.queue_id = actual_queue_id
                    changed = True
                if not existing_log.token_id and actual_token_id:
                    existing_log.token_id = actual_token_id
                    changed = True

                if changed:
                    updated_count += 1
                    branch_counts[org_name] = branch_counts.get(org_name, 0) + 1
            else:
                new_log = CallLog(
                    organization_id=actual_org_id,
                    queue_id=actual_queue_id,
                    session_id=actual_session_id,
                    token_id=actual_token_id,
                    called_by_id=actual_caller_id,
                    customer_phone=phone,
                    customer_name=actual_cust_name,
                    duration_seconds=dur,
                    ring_duration_seconds=ring,
                    call_status=call_status,
                    created_at=created_at,
                )
                db.add(new_log)
                inserted_count += 1
                branch_counts[org_name] = branch_counts.get(org_name, 0) + 1

        await db.commit()

        logger.info("\n" + "=" * 55)
        logger.info("✅ Plivo Historical Synchronization Complete!")
        logger.info("   Total Calls Processed: %d", len(all_plivo_calls))
        logger.info("   New Calls Inserted:    %d", inserted_count)
        logger.info("   Existing Calls Updated:%d", updated_count)
        logger.info("   Branch Breakdown:")
        for b_name, count in branch_counts.items():
            logger.info("     - %s: %d calls", b_name, count)
        logger.info("=" * 55)


def main():
    parser = argparse.ArgumentParser(description="Sync complete Plivo call history into database.")
    parser.add_argument("--days", type=int, default=60, help="Number of past days to sync (default: 60)")
    parser.add_argument("--branch", type=str, default="churchstreet", help="Fallback branch slug (default: churchstreet)")
    args = parser.parse_args()

    asyncio.run(sync_history(days=args.days, default_branch_slug=args.branch))


if __name__ == "__main__":
    main()
