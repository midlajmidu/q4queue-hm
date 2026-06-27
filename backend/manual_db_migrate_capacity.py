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
    
    # 1. Add the column
    try:
        cursor.execute("ALTER TABLE organizations ADD COLUMN max_waiting_capacity INTEGER NOT NULL DEFAULT 50;")
        print("Successfully added max_waiting_capacity column to organizations table.")
    except Exception as e:
        print("Error adding column (it might already exist):", e)
        
    # 2. Update the Alembic version to this new migration
    try:
        cursor.execute("UPDATE alembic_version SET version_num='a22222222222';")
        print("Successfully updated alembic version to a22222222222.")
    except Exception as e:
        print("Error updating alembic version:", e)

    cursor.close()
    conn.close()

if __name__ == "__main__":
    migrate()
