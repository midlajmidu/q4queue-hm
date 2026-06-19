import asyncio
import httpx

async def test_pause():
    # Attempt to log in to get a token, or just try hitting the endpoint without a token.
    # Without a token it should return 401. If it returns 404, the endpoint doesn't exist!
    
    async with httpx.AsyncClient() as client:
        res = await client.patch("http://localhost:8000/api/v1/queues/123e4567-e89b-12d3-a456-426614174000/paused?is_paused=true")
        print(f"Status Code: {res.status_code}")
        print(f"Response: {res.text}")

if __name__ == "__main__":
    asyncio.run(test_pause())
