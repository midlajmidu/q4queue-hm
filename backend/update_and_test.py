import asyncio
import httpx
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.whatsapp.models import WhatsAppConfig

async def main():
    waba_id = "1034155465720837"
    print(f"Updating global whatsapp_configs to set waba_id={waba_id}...")

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(WhatsAppConfig).where(WhatsAppConfig.org_id.is_(None))
        )
        global_cfg = result.scalar_one_or_none()
        if global_cfg:
            global_cfg.waba_id = waba_id
            await db.commit()
            print("Successfully updated waba_id in database!")
            access_token = global_cfg.access_token
            api_version = "v21.0"
        else:
            print("Error: Global WhatsApp config not found in DB!")
            return

    # Call Meta Graph API to fetch templates
    url = f"https://graph.facebook.com/{api_version}/{waba_id}/message_templates"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    print(f"\nFetching templates from Meta API: {url}...")
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        templates = data.get("data", [])
        print(f"\nFound {len(templates)} templates on Meta Business Account:")
        for t in templates:
            print(f"- Name: {t.get('name')}")
            print(f"  Status: {t.get('status')}")
            print(f"  Language: {t.get('language')}")
            print(f"  Category: {t.get('category')}")
            # print variables/body
            body = next((c.get('text') for c in t.get('components', []) if c.get('type') == 'BODY'), 'None')
            print(f"  Body: {body}")
            print()
    else:
        print(f"Failed to fetch templates from Meta! Status={response.status_code}")
        print(response.text)

if __name__ == "__main__":
    asyncio.run(main())
