import os
import json
import uuid
from datetime import date
import pytest
from unittest.mock import patch, AsyncMock

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parent_organization import ParentOrganization
from app.models.organization import Organization
from app.models.queue import Queue
from app.models.session import Session
from app.models.token import Token, TokenStatus
from app.models.message import Message
from app.models.org_backup import OrgBackup, BackupStatus
from app.services.org_backup_service import (
    create_org_backup,
    restore_org_backup,
    BACKUP_DIR,
    IncrementalBackupWriter,
)

EXPECTED_KEYS = [
    "parent_organizations",
    "organizations",
    "users",
    "organization_announcements",
    "queues",
    "sessions",
    "tokens",
    "messages",
]

@pytest.mark.asyncio
async def test_empty_organization_backup(db: AsyncSession):
    """Verify empty organization produces valid JSON with all 8 top-level empty arrays."""
    po = ParentOrganization(name="Empty Test Org", slug=f"empty-org-{uuid.uuid4().hex[:6]}")
    db.add(po)
    await db.commit()
    await db.refresh(po)

    backup_record = None
    filepath = None
    try:
        backup_record = await create_org_backup(po.id, db)
        assert backup_record.status == BackupStatus.success
        assert backup_record.size_bytes > 0

        filepath = os.path.join(BACKUP_DIR, backup_record.filename)
        assert os.path.exists(filepath)
        assert not os.path.exists(f"{filepath}.tmp")

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        for key in EXPECTED_KEYS:
            assert key in data, f"Missing key {key} in backup JSON"

        assert len(data["parent_organizations"]) == 1
        assert data["parent_organizations"][0]["id"] == str(po.id)
        assert data["organizations"] == []
        assert data["users"] == []
        assert data["organization_announcements"] == []
        assert data["queues"] == []
        assert data["sessions"] == []
        assert data["tokens"] == []
        assert data["messages"] == []

    finally:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
        if backup_record:
            await db.execute(delete(OrgBackup).where(OrgBackup.id == backup_record.id))
        await db.execute(delete(ParentOrganization).where(ParentOrganization.id == po.id))
        await db.commit()


@pytest.mark.asyncio
async def test_small_organization_backup(db: AsyncSession):
    """Verify small organization backup serializes all entities with exact counts and schema."""
    po = ParentOrganization(name="Small Org", slug=f"small-org-{uuid.uuid4().hex[:6]}")
    db.add(po)
    await db.flush()

    branch = Organization(name="Branch 1", slug=f"b1-{uuid.uuid4().hex[:6]}", parent_organization_id=po.id)
    db.add(branch)
    await db.flush()

    queue = Queue(name="General Queue", org_id=branch.id)
    db.add(queue)
    await db.flush()

    sess = Session(org_id=branch.id, queue_id=queue.id, session_date=date.today(), is_active=True)
    db.add(sess)
    await db.flush()

    tok1 = Token(
        org_id=branch.id,
        queue_id=queue.id,
        session_id=sess.id,
        token_number=1,
        customer_name="Alice",
        customer_phone="+1234567890",
        status=TokenStatus.waiting,
    )
    tok2 = Token(
        org_id=branch.id,
        queue_id=queue.id,
        session_id=sess.id,
        token_number=2,
        customer_name="Bob",
        customer_phone="+1234567891",
        status=TokenStatus.serving,
    )
    db.add_all([tok1, tok2])
    await db.flush()

    msg = Message(org_id=branch.id, content="Welcome", message_type="alert")
    db.add(msg)
    await db.commit()

    backup_record = None
    filepath = None
    try:
        backup_record = await create_org_backup(po.id, db)
        assert backup_record.status == BackupStatus.success

        filepath = os.path.join(BACKUP_DIR, backup_record.filename)
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert len(data["parent_organizations"]) == 1
        assert len(data["organizations"]) == 1
        assert len(data["queues"]) == 1
        assert len(data["sessions"]) == 1
        assert len(data["tokens"]) == 2
        assert len(data["messages"]) == 1

        token_numbers = [t["token_number"] for t in data["tokens"]]
        assert set(token_numbers) == {1, 2}

    finally:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
        if backup_record:
            await db.execute(delete(OrgBackup).where(OrgBackup.id == backup_record.id))
        await db.execute(delete(Token).where(Token.org_id == branch.id))
        await db.execute(delete(Message).where(Message.org_id == branch.id))
        await db.execute(delete(Session).where(Session.org_id == branch.id))
        await db.execute(delete(Queue).where(Queue.org_id == branch.id))
        await db.execute(delete(Organization).where(Organization.id == branch.id))
        await db.execute(delete(ParentOrganization).where(ParentOrganization.id == po.id))
        await db.commit()


@pytest.mark.asyncio
async def test_chunked_keyset_pagination_backup(db: AsyncSession):
    """Verify keyset pagination across multiple chunks produces no duplicates or missing records."""
    po = ParentOrganization(name="Chunked Org", slug=f"chunked-org-{uuid.uuid4().hex[:6]}")
    db.add(po)
    await db.flush()

    branch = Organization(name="Branch Chunked", slug=f"bc-{uuid.uuid4().hex[:6]}", parent_organization_id=po.id)
    db.add(branch)
    await db.flush()

    queue = Queue(name="Queue Chunked", org_id=branch.id)
    db.add(queue)
    await db.flush()

    sess = Session(org_id=branch.id, queue_id=queue.id, session_date=date.today(), is_active=True)
    db.add(sess)
    await db.flush()

    # Seed 9 tokens and 7 messages
    total_tokens = 9
    tokens = [
        Token(
            org_id=branch.id,
            queue_id=queue.id,
            session_id=sess.id,
            token_number=i + 1,
            customer_name=f"Customer {i + 1}",
            customer_phone=f"+123456780{i}",
            status=TokenStatus.waiting,
        )
        for i in range(total_tokens)
    ]
    db.add_all(tokens)

    total_messages = 7
    messages = [
        Message(org_id=branch.id, content=f"Message {i + 1}", message_type="info")
        for i in range(total_messages)
    ]
    db.add_all(messages)
    await db.commit()

    backup_record = None
    filepath = None
    # Force tiny CHUNK_SIZE = 3 to test multiple chunk iterations
    try:
        with patch("app.services.org_backup_service.CHUNK_SIZE", 3):
            backup_record = await create_org_backup(po.id, db)
            assert backup_record.status == BackupStatus.success

        filepath = os.path.join(BACKUP_DIR, backup_record.filename)
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert len(data["tokens"]) == total_tokens
        assert len(data["messages"]) == total_messages

        # Verify no duplicates
        token_ids = [t["id"] for t in data["tokens"]]
        assert len(token_ids) == len(set(token_ids)), "Duplicate token IDs found in chunked backup"

        msg_ids = [m["id"] for m in data["messages"]]
        assert len(msg_ids) == len(set(msg_ids)), "Duplicate message IDs found in chunked backup"

        # Verify strict ascending UUID ordering from keyset pagination
        assert token_ids == sorted(token_ids), "Tokens are not in strict ascending order"
        assert msg_ids == sorted(msg_ids), "Messages are not in strict ascending order"

    finally:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
        if backup_record:
            await db.execute(delete(OrgBackup).where(OrgBackup.id == backup_record.id))
        await db.execute(delete(Token).where(Token.org_id == branch.id))
        await db.execute(delete(Message).where(Message.org_id == branch.id))
        await db.execute(delete(Session).where(Session.org_id == branch.id))
        await db.execute(delete(Queue).where(Queue.org_id == branch.id))
        await db.execute(delete(Organization).where(Organization.id == branch.id))
        await db.execute(delete(ParentOrganization).where(ParentOrganization.id == po.id))
        await db.commit()


@pytest.mark.asyncio
async def test_failure_cleanup_removes_tmp_file(db: AsyncSession):
    """Verify that if an error occurs mid-stream, .tmp file is purged and no .q4backup is created."""
    po = ParentOrganization(name="Fail Org", slug=f"fail-org-{uuid.uuid4().hex[:6]}")
    db.add(po)
    await db.commit()
    await db.refresh(po)

    backup_record = None
    try:
        with patch.object(IncrementalBackupWriter, "write_eager_section", side_effect=IOError("Disk write simulated failure")):
            with pytest.raises(IOError):
                await create_org_backup(po.id, db)

        # Inspect backups directory
        for fname in os.listdir(BACKUP_DIR):
            if po.slug in fname:
                assert not fname.endswith(".tmp"), f"Stale temp file found: {fname}"
                assert not fname.endswith(".q4backup"), f"Incomplete backup file found: {fname}"

        # Verify OrgBackup record has status 'failed'
        res = await db.execute(select(OrgBackup).where(OrgBackup.parent_org_id == po.id))
        backup_record = res.scalar_one_or_none()
        assert backup_record is not None
        assert backup_record.status == BackupStatus.failed

    finally:
        if backup_record:
            await db.execute(delete(OrgBackup).where(OrgBackup.id == backup_record.id))
        await db.execute(delete(ParentOrganization).where(ParentOrganization.id == po.id))
        await db.commit()


@pytest.mark.asyncio
async def test_tenant_isolation_in_backup(db: AsyncSession):
    """Verify organization A backup cannot contain organization B's branches, queues, tokens, or messages."""
    po_a = ParentOrganization(name="Tenant A", slug=f"tenant-a-{uuid.uuid4().hex[:6]}")
    po_b = ParentOrganization(name="Tenant B", slug=f"tenant-b-{uuid.uuid4().hex[:6]}")
    db.add_all([po_a, po_b])
    await db.flush()

    branch_a = Organization(name="Branch A", slug=f"ba-{uuid.uuid4().hex[:6]}", parent_organization_id=po_a.id)
    branch_b = Organization(name="Branch B", slug=f"bb-{uuid.uuid4().hex[:6]}", parent_organization_id=po_b.id)
    db.add_all([branch_a, branch_b])
    await db.flush()

    q_a = Queue(name="QA", org_id=branch_a.id)
    q_b = Queue(name="QB", org_id=branch_b.id)
    db.add_all([q_a, q_b])
    await db.flush()

    s_a = Session(org_id=branch_a.id, queue_id=q_a.id, session_date=date.today(), is_active=True)
    s_b = Session(org_id=branch_b.id, queue_id=q_b.id, session_date=date.today(), is_active=True)
    db.add_all([s_a, s_b])
    await db.flush()

    t_a = Token(
        org_id=branch_a.id,
        queue_id=q_a.id,
        session_id=s_a.id,
        token_number=1,
        customer_name="Alice A",
        customer_phone="+1234567890",
        status=TokenStatus.waiting,
    )
    t_b = Token(
        org_id=branch_b.id,
        queue_id=q_b.id,
        session_id=s_b.id,
        token_number=999,
        customer_name="Bob B",
        customer_phone="+1234567899",
        status=TokenStatus.waiting,
    )
    db.add_all([t_a, t_b])

    m_a = Message(org_id=branch_a.id, content="Msg A", message_type="alert")
    m_b = Message(org_id=branch_b.id, content="Msg B", message_type="alert")
    db.add_all([m_a, m_b])
    await db.commit()

    backup_a = None
    filepath_a = None
    try:
        backup_a = await create_org_backup(po_a.id, db)
        filepath_a = os.path.join(BACKUP_DIR, backup_a.filename)

        with open(filepath_a, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Confirm Org A contains Org A entities
        assert len(data["organizations"]) == 1
        assert data["organizations"][0]["id"] == str(branch_a.id)

        assert len(data["queues"]) == 1
        assert data["queues"][0]["id"] == str(q_a.id)

        assert len(data["tokens"]) == 1
        assert data["tokens"][0]["id"] == str(t_a.id)

        assert len(data["messages"]) == 1
        assert data["messages"][0]["id"] == str(m_a.id)

        # Confirm ZERO Org B entities leaked into Org A backup
        org_ids_in_backup = {o["id"] for o in data["organizations"]}
        assert str(branch_b.id) not in org_ids_in_backup

        token_ids_in_backup = {t["id"] for t in data["tokens"]}
        assert str(t_b.id) not in token_ids_in_backup

        message_ids_in_backup = {m["id"] for m in data["messages"]}
        assert str(m_b.id) not in message_ids_in_backup

    finally:
        if filepath_a and os.path.exists(filepath_a):
            os.remove(filepath_a)
        if backup_a:
            await db.execute(delete(OrgBackup).where(OrgBackup.id == backup_a.id))
        for b_id in [branch_a.id, branch_b.id]:
            await db.execute(delete(Token).where(Token.org_id == b_id))
            await db.execute(delete(Message).where(Message.org_id == b_id))
            await db.execute(delete(Session).where(Session.org_id == b_id))
            await db.execute(delete(Queue).where(Queue.org_id == b_id))
            await db.execute(delete(Organization).where(Organization.id == b_id))
        await db.execute(delete(ParentOrganization).where(ParentOrganization.id.in_([po_a.id, po_b.id])))
        await db.commit()


@pytest.mark.asyncio
async def test_per_tenant_redis_lock_prevents_concurrent_backup(db: AsyncSession):
    """Verify that attempting concurrent backups for the same tenant raises RuntimeError."""
    po = ParentOrganization(name="Lock Org", slug=f"lock-org-{uuid.uuid4().hex[:6]}")
    db.add(po)
    await db.commit()
    await db.refresh(po)

    mock_redis = AsyncMock()
    # First set succeeds, second set fails (lock already held)
    mock_redis.set.return_value = False

    try:
        with patch("app.redis.client.get_redis", return_value=mock_redis):
            with pytest.raises(RuntimeError, match="Backup already in progress"):
                await create_org_backup(po.id, db)
    finally:
        await db.execute(delete(ParentOrganization).where(ParentOrganization.id == po.id))
        await db.commit()


@pytest.mark.asyncio
async def test_restore_compatibility_with_generated_backup(db: AsyncSession):
    """Verify that generated backup JSON is 100% compatible with restore_org_backup."""
    po = ParentOrganization(name="Restore Org", slug=f"restore-org-{uuid.uuid4().hex[:6]}")
    db.add(po)
    await db.flush()

    branch = Organization(name="Restore Branch", slug=f"rb-{uuid.uuid4().hex[:6]}", parent_organization_id=po.id)
    db.add(branch)
    await db.flush()

    queue = Queue(name="Restore Queue", org_id=branch.id)
    db.add(queue)
    await db.flush()

    sess = Session(org_id=branch.id, queue_id=queue.id, session_date=date.today(), is_active=True)
    db.add(sess)
    await db.flush()

    tok = Token(
        org_id=branch.id,
        queue_id=queue.id,
        session_id=sess.id,
        token_number=101,
        customer_name="Restore Customer",
        customer_phone="+1234567890",
        status=TokenStatus.waiting,
    )
    db.add(tok)
    await db.commit()

    backup_record = None
    filepath = None
    try:
        backup_record = await create_org_backup(po.id, db)
        filepath = os.path.join(BACKUP_DIR, backup_record.filename)

        # Call restore_org_backup using the generated file
        await restore_org_backup(po.id, filepath, db)

        # Verify records restored correctly
        restored_tokens = (await db.scalars(select(Token).where(Token.org_id == branch.id))).all()
        assert len(restored_tokens) == 1
        assert restored_tokens[0].token_number == 101
        assert restored_tokens[0].customer_name == "Restore Customer"

    finally:
        # Cleanup any generated backup and safety backup files
        if os.path.exists(BACKUP_DIR):
            for f in os.listdir(BACKUP_DIR):
                if po.slug in f:
                    try:
                        os.remove(os.path.join(BACKUP_DIR, f))
                    except Exception:
                        pass
        await db.execute(delete(OrgBackup).where(OrgBackup.parent_org_id == po.id))
        await db.execute(delete(Token).where(Token.org_id == branch.id))
        await db.execute(delete(Session).where(Session.org_id == branch.id))
        await db.execute(delete(Queue).where(Queue.org_id == branch.id))
        await db.execute(delete(Organization).where(Organization.id == branch.id))
        await db.execute(delete(ParentOrganization).where(ParentOrganization.id == po.id))
        await db.commit()
