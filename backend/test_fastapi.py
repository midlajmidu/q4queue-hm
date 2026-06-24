from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxN2M2ZjE4Yi1kNjA5LTQ0MTYtODEyYi02NDc5YzI0ZTUxODEiLCJvcmdfaWQiOm51bGwsInBhcmVudF9vcmdfaWQiOiI4NTkwZWM5NC03NjA4LTQzZmEtODVkZS1iN2JiOTQ5NGRlNzAiLCJvcmdfc2x1ZyI6ImFtZWJhIiwib3JnX25hbWUiOiJhbWViYSIsIm9yZ19sb2dvX3VybCI6bnVsbCwicm9sZSI6Im9yZ2FuaXphdGlvbl9hZG1pbiIsImVtYWlsIjoiYW1lYmFAZ21haWwuY29tIiwiZmlyc3RfbmFtZSI6Im11aGFtbWVkIiwibGFzdF9uYW1lIjoibWlkbGFqIiwiaXNfZmlyc3RfbG9naW4iOmZhbHNlLCJleHAiOjE3ODIzOTY3MjZ9.Urd1YJzWHejDgFXWrtDm4wyNe0IIFXuuemPSbiWv04A"

print("Sending request...")
response = client.get(
    "/api/v1/organization-admin/analytics?start_date=2026-06-25&end_date=2026-06-25",
    headers={"Authorization": f"Bearer {jwt_token}"}
)
print("Status Code:", response.status_code)
print("Response JSON:", response.text)
