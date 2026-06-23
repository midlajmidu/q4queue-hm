import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

async def test_send():
    token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    url = f"https://graph.facebook.com/v20.0/{phone_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "to": "+919539679027",
        "type": "template",
        "template": {
            "name": "queue_joined_v4",
            "language": {"code": "en"},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": "Midlaj"},
                        {"type": "text", "text": "Support"},
                        {"type": "text", "text": "My Org"},
                        {"type": "text", "text": "A-1"},
                        {"type": "text", "text": "1"},
                        {"type": "text", "text": "url1"},
                        {"type": "text", "text": "url2"},
                    ]
                }
            ]
        }
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload)
        print("Status:", resp.status_code)
        print("Response:", resp.json())

asyncio.run(test_send())
