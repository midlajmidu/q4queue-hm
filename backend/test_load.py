import psycopg2

def main():
    conn = psycopg2.connect("postgresql://appuser:apppassword@127.0.0.1:5432/queuedb")
    cursor = conn.cursor()
    
    print("=== TRUE CAPACITY TRACKING AUDIT ===\n")
    
    cursor.execute("SELECT id, name, max_waiting_capacity FROM organizations LIMIT 5;")
    orgs = cursor.fetchall()
    
    for org in orgs:
        org_id, name, max_cap = org
        print(f"Branch: {name}")
        print(f"Max Capacity configured: {max_cap}")
        
        cursor.execute("""
            SELECT count(tokens.id) 
            FROM tokens 
            JOIN queues ON tokens.queue_id = queues.id
            JOIN sessions ON queues.session_id = sessions.id
            WHERE sessions.org_id = %s AND tokens.status = 'waiting'
        """, (org_id,))
        waiting = cursor.fetchone()[0] or 0
        
        print(f"Tokens Currently Waiting: {waiting}")
        
        pct = int((waiting / (max_cap or 1)) * 100)
        load_percentage = min(100, pct)
        load_status = "Critical" if load_percentage >= 90 else "Heavy" if load_percentage >= 75 else "Normal"
        
        print(f"Calculated Load: {load_percentage}% -> {load_status}")
        print("-" * 30)

main()
