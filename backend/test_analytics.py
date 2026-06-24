import asyncio
import uuid
from app.db.session import AsyncSessionLocal
from app.services.analytics_service import get_cross_branch_analytics

async def test_analytics():
    async with AsyncSessionLocal() as db:
        try:
            p_id = "8590ec94-7608-43fa-85de-b7bb9494de70"
            print("Using Parent Org ID:", p_id)
            
            res = await get_cross_branch_analytics(
                db=db,
                parent_org_id=p_id,
                branch_id=None,
                start_date="2026-06-25",
                end_date="2026-06-25"
            )
            import json
            from app.schemas.organization_admin_monitoring import AnalyticsResponse
            print("Trying to validate with AnalyticsResponse...")
            try:
                AnalyticsResponse(**res)
                print("VALIDATION SUCCESS")
            except Exception as e:
                print("VALIDATION FAILED:", e)
            print("SUCCESS:", json.dumps(res, indent=2))
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_analytics())
