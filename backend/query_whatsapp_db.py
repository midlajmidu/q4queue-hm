import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.whatsapp.models import WhatsAppConfig, WhatsAppMessage, WhatsAppWebhookLog, WhatsAppTemplate

async def main():
    async with AsyncSessionLocal() as db:
        # 1. Configs
        result = await db.execute(select(WhatsAppConfig))
        configs = result.scalars().all()
        print("=== WHATSAPP CONFIGS ===")
        for c in configs:
            print(f"Org ID: {c.org_id}, Token: {c.access_token[:10] if c.access_token else 'None'}..., Phone ID: {c.phone_number_id}, Business Account ID: {c.business_id}, Enabled: {c.is_enabled}, Business Verified: {c.business_verified}")

        # 2. Templates
        result = await db.execute(select(WhatsAppTemplate))
        templates = result.scalars().all()
        print("\n=== WHATSAPP TEMPLATES ===")
        for t in templates:
            print(f"Name: {t.template_name}, Language: {t.language}, Status: {t.status}")
        if not templates:
            print("No templates found in database.")

        # 3. Messages (latest 10)
        result = await db.execute(select(WhatsAppMessage).order_by(WhatsAppMessage.created_at.desc()).limit(10))
        msgs = result.scalars().all()
        print("\n=== LATEST MESSAGES ===")
        for m in msgs:
            print(f"[{m.created_at}] To: {m.customer_phone}, Template: {m.template_name}, Status: {m.status}, Error: {m.error_message}")

        # 4. Webhooks (latest 5)
        result = await db.execute(select(WhatsAppWebhookLog).order_by(WhatsAppWebhookLog.created_at.desc()).limit(5))
        logs = result.scalars().all()
        print("\n=== LATEST WEBHOOKS ===")
        for w in logs:
            print(f"[{w.created_at}] Status: {w.event_type}, Payload: {str(w.payload)[:100]}...")

if __name__ == "__main__":
    asyncio.run(main())
