import asyncio
from datetime import date, timedelta
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.session import Session

async def main():
    async with AsyncSessionLocal() as db:
        # Find user
        res = await db.execute(select(User).where(User.email == "abc@gmail.com"))
        user = res.scalar_one_or_none()
        if not user:
            print("User abc@gmail.com not found")
            return
            
        org_id = user.org_id
        print(f"Found user. Org ID: {org_id}")
        
        # Get latest session date
        res = await db.execute(select(Session).where(Session.org_id == org_id).order_by(Session.session_date.desc()).limit(1))
        latest_session = res.scalar_one_or_none()
        
        if latest_session:
            start_date = latest_session.session_date + timedelta(days=1)
        else:
            start_date = date.today()
            
        print(f"Creating 10 sessions starting from {start_date}")
        
        for i in range(10):
            s_date = start_date + timedelta(days=i)
            new_session = Session(
                org_id=org_id,
                session_date=s_date,
                title=f"Session {s_date.strftime('%B %d, %Y')}"
            )
            db.add(new_session)
            
        await db.commit()
        print("10 sessions created successfully!")

if __name__ == "__main__":
    asyncio.run(main())
