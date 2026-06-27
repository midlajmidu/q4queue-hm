import asyncio
import psycopg2

def migrate():
    conn = psycopg2.connect(
        dbname="queuedb",
        user="appuser",
        password="apppassword",
        host="127.0.0.1",
        port="5432"
    )
    conn.autocommit = True
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;")
        print("Successfully added last_active_at column.")
    except Exception as e:
        print("Error adding column:", e)
        
    try:
        cursor.execute("UPDATE alembic_version SET version_num='a11111111111';")
        print("Successfully updated alembic version.")
    except Exception as e:
        print("Error updating alembic version:", e)

    cursor.close()
    conn.close()

if __name__ == "__main__":
    migrate()
