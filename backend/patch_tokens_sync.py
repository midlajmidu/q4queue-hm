import psycopg2

DATABASE_URL = "postgresql://appuser:apppassword@localhost:5432/queuedb"

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Get a user_id
    cur.execute("SELECT id FROM users LIMIT 1;")
    row = cur.fetchone()
    if not row:
        print("No users found to assign.")
        return
    user_id = row[0]
    
    # Update tokens
    cur.execute("""
        UPDATE tokens
        SET served_by_id = %s,
            completed_by_id = CASE WHEN status = 'done' THEN %s ELSE completed_by_id END
        WHERE status IN ('done', 'serving') AND served_by_id IS NULL;
    """, (user_id, user_id))
    
    conn.commit()
    print(f"Patched tokens with user_id: {user_id}")
    cur.close()
    conn.close()

main()
