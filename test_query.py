import asyncio
from app.db.session import async_session_maker
from app.models.token import Token
from app.models.organization import Organization
from app.models.session import Session
from app.models.queue import Queue
from app.models.user import User
from sqlalchemy import select

async def main():
    async with async_session_maker() as db:
        stmt = (
            select(
                Organization.name.label("branch_name"),
                Session.session_date.label("date"),
                Queue.name.label("queue_name"),
                Token.token_number
            )
            .select_from(Token)
            .join(Organization, Token.org_id == Organization.id)
            .join(Session, Token.session_id == Session.id)
            .join(Queue, Token.queue_id == Queue.id)
            .outerjoin(User, Token.served_by_id == User.id)
        )
        res = await db.execute(stmt)
        records = res.all()
        print(f"Total records found: {len(records)}")

asyncio.run(main())
