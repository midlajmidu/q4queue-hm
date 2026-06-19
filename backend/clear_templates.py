import asyncio
from sqlalchemy import delete
from app.db.session import AsyncSessionLocal
from app.whatsapp.models import WhatsAppTemplate

async def clear_templates():
    async with AsyncSessionLocal() as db:
        await db.execute(delete(WhatsAppTemplate))
        await db.commit()
        print("Templates cleared from database.")

if __name__ == "__main__":
    asyncio.run(clear_templates())
