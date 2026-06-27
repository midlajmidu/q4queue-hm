#!/usr/bin/env python3
"""
Direct SQL migration script — adds notify_skipped, notify_recalled, notify_removed
to whatsapp_configs table. Run with: python3 apply_wa_migration.py
"""
import asyncio
import os

async def main():
    # Try to import the app's DB session
    try:
        import sys
        sys.path.insert(0, "/Users/muzammil/Documents/q4queue/qrq/backend")
        from app.db.session import AsyncSessionLocal
        from sqlalchemy import text

        async with AsyncSessionLocal() as db:
            # Check if columns already exist
            check_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'whatsapp_configs' 
                AND column_name IN ('notify_skipped', 'notify_recalled', 'notify_removed')
            """)
            result = await db.execute(check_sql)
            existing = {row[0] for row in result.fetchall()}
            print(f"Existing columns: {existing}")

            for col in ['notify_skipped', 'notify_recalled', 'notify_removed']:
                if col not in existing:
                    await db.execute(text(
                        f"ALTER TABLE whatsapp_configs ADD COLUMN {col} BOOLEAN NOT NULL DEFAULT TRUE"
                    ))
                    print(f"✅ Added column: {col}")
                else:
                    print(f"⏭  Column already exists: {col}")

            await db.commit()
            print("Migration complete!")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
