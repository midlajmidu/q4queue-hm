import asyncio
from app.redis.client import redis_client
import json

async def main():
    errors = await redis_client.lrange("system_errors", 0, 10)
    for e in errors:
        print(json.loads(e))

asyncio.run(main())
