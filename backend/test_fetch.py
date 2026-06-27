import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.get('http://localhost:8000/api/v1/track/12345678-1234-5678-1234-567812345678')
        print(r.status_code)
        print(r.text)

asyncio.run(main())
