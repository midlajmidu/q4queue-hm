import asyncio
import httpx
from app.whatsapp.config_service import get_global_config_dict

async def main():
    cfg = await get_global_config_dict()
    access_token = cfg["access_token"]
    phone_number_id = cfg["phone_number_id"]
    api_version = cfg["api_version"]
    
    phone = "919539679027"
    url = f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone,
        "type": "template",
        "template": {
            "name": "hello_world",
            "language": {
                "code": "en_US"
            }
        }
    }
    
    print(f"Sending hello_world template to {phone}...")
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        
    print(f"Status Code: {response.status_code}")
    print(response.text)

if __name__ == "__main__":
    asyncio.run(main())
