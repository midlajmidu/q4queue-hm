import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.token import Token, TokenStatus
from datetime import datetime, timedelta, timezone

async def restore_accidentally_deleted_tokens():
    async with AsyncSessionLocal() as db:
        # Find tokens deleted in the last 60 minutes that have an assigned_line 
        # (which means they were serving when deleted by the bug)
        sixty_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=60)
        
        result = await db.execute(
            select(Token).where(
                Token.status == TokenStatus.deleted,
                Token.assigned_line.isnot(None),
                Token.deleted_at >= sixty_mins_ago
            )
        )
        tokens = result.scalars().all()
        
        if not tokens:
            print("No recently deleted serving tokens found.")
            return

        for token in tokens:
            print(f"Restoring Token {token.token_number} (Line {token.assigned_line})")
            token.status = TokenStatus.serving
            token.deleted_at = None
            token.removed_by = None
            
        await db.commit()
        print(f"Successfully restored {len(tokens)} tokens to serving state.")

if __name__ == "__main__":
    asyncio.run(restore_accidentally_deleted_tokens())
