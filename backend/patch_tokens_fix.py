import psycopg2

DATABASE_URL = "postgresql://appuser:apppassword@localhost:5432/queuedb"

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # 1. Get the superadmin user ID (the one we accidentally assigned things to)
    cur.execute("SELECT id FROM users WHERE email = 'superadmin' OR role = 'super_admin' LIMIT 1;")
    superadmin_row = cur.fetchone()
    
    # 2. Get a REAL staff user ID (or organization admin if no staff exists)
    cur.execute("SELECT id, first_name, last_name, email FROM users WHERE role = 'staff' LIMIT 1;")
    staff_row = cur.fetchone()
    
    if not staff_row:
        # Fallback to organization_admin
        cur.execute("SELECT id, first_name, last_name, email FROM users WHERE role = 'organization_admin' LIMIT 1;")
        staff_row = cur.fetchone()

    if not staff_row:
        print("No staff or org admin found!")
        return
        
    staff_id = staff_row[0]
    staff_name = f"{staff_row[1] or ''} {staff_row[2] or ''}".strip() or staff_row[3]
    
    if superadmin_row:
        superadmin_id = superadmin_row[0]
        # Update tokens that were accidentally assigned to superadmin
        cur.execute("""
            UPDATE tokens
            SET served_by_id = %s,
                completed_by_id = CASE WHEN status = 'done' THEN %s ELSE completed_by_id END
            WHERE served_by_id = %s;
        """, (staff_id, staff_id, superadmin_id))
        
        # Also just in case, update ANY token that still belongs to super_admin
        cur.execute("""
            UPDATE tokens
            SET completed_by_id = %s
            WHERE completed_by_id = %s;
        """, (staff_id, superadmin_id))
        
        conn.commit()
        print(f"Re-assigned tokens from superadmin to {staff_name} ({staff_id})")
    else:
        print("Superadmin not found.")
        
    cur.close()
    conn.close()

main()
