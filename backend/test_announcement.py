import asyncio
from httpx import AsyncClient

async def main():
    async with AsyncClient() as client:
        res = await client.post(
            "http://localhost:8000/api/v1/organization-admin/announcements",
            json={
                "title": "Test Announcement",
                "message": "Testing 123",
                "type": "info",
                "start_time": None,
                "end_time": None
            }
        )
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text}")

if __name__ == "__main__":
    asyncio.run(main())
