import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # First login to get token
        resp = await client.post("http://localhost:8000/api/v1/auth/login", data={"username": "maaz@q4queue.com", "password": "securepassword"})
        if resp.status_code != 200:
            print("Login failed:", resp.text)
            return
        token = resp.json()["access_token"]
        print("Logged in!")
        
        # Now get export
        resp = await client.get("http://localhost:8000/api/v1/organization-admin/analytics/export", headers={"Authorization": f"Bearer {token}"})
        print("Status:", resp.status_code)
        print("Body:", repr(resp.text[:500]))

asyncio.run(main())
