import asyncio
from app.db.session import SessionLocal
from app.api.v1.endpoints.super_admin import get_org_analytics
from app.models.user import User

async def main():
    db = SessionLocal()
    # test dummy user
    dummy_user = User(role="super_admin")
    try:
        res = await get_org_analytics(timeframe="daily", _super_admin=dummy_user, db=db)
        print("Success!", len(res.items))
    except Exception as e:
        print("Error:", e)
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(main())
