import psycopg2

def main():
    conn = psycopg2.connect("postgresql://appuser:apppassword@127.0.0.1:5432/queuedb")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM organizations LIMIT 1;")
    cols = [desc[0] for desc in cursor.description]
    print("Columns in organizations:", cols)

main()
