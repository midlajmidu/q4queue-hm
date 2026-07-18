import asyncio
from app.db.session import SessionLocal
from app.api.v1.endpoints.super_admin import get_platform_analytics

async def run():
    async with SessionLocal() as db:
        try:
            res = await get_platform_analytics(is_test=False, _super_admin=None, db=db)
            print(res)
        except Exception as e:
            print("ERROR:", e)

asyncio.run(run())
