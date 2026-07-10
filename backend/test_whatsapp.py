import os
import requests
from dotenv import load_dotenv

load_dotenv(".env")

ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID").strip('"').strip("'")
API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v25.0").strip('"').strip("'")

url = f"https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/messages"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "messaging_product": "whatsapp",
    "to": "919539679027",
    "type": "template",
    "template": {
        "name": "ticket_confirmed_v1",
        "language": {
            "code": "en"
        },
        "components": [
            {
                "type": "header",
                "parameters": [
                    {
                        "type": "image",
                        "image": {
                            # Using a generic placeholder image since the dynamic generator isn't built yet
                            "link": "https://developers.facebook.com/images/meta-blueprint/logo.png"
                        }
                    }
                ]
            },
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "Midlaj"},               # {{1}} Customer Name
                    {"type": "text", "text": "A-12"},                 # {{2}} Ticket Number
                    {"type": "text", "text": "12"},                   # {{3}} People Ahead
                    {"type": "text", "text": "https://amoebaq.com"},  # {{4}} Queue Tracking URL
                    {"type": "text", "text": "https://amoebaq.com"},  # {{5}} Live Display URL
                    {"type": "text", "text": "Lulu Mall"},            # {{6}} Branch Name
                    {"type": "text", "text": "Roller Coaster"}        # {{7}} Queue Name
                ]
            }
        ]
    }
}

print(f"Sending test template to 919539679027...")
response = requests.post(url, headers=headers, json=payload)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
