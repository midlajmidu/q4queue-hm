import asyncio
from httpx import AsyncClient
from app.main import app

async def test():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/organization-admin/monitoring/sessions")
        print(response.status_code)
        print(response.text)

if __name__ == "__main__":
    asyncio.run(test())
