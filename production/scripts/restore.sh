#!/usr/bin/env bash
set -e

# Change directory to the parent directory of this script (which should be the production folder)
cd "$(dirname "$0")/.."

echo "======================================"
echo " Restoring Q4Queue PostgreSQL DB"
echo "======================================"

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_backup.sql>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file '$BACKUP_FILE' not found!"
    exit 1
fi

# Load environment variables
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi
source .env

echo "Copying backup to container..."
docker cp "${BACKUP_FILE}" queue_postgres:/var/lib/postgresql/data/restore.sql

echo "Restoring database..."
# Note: We drop connections to ensure we can restore cleanly
docker exec -t queue_postgres psql -U ${POSTGRES_USER} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}';"
docker exec -t queue_postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f /var/lib/postgresql/data/restore.sql

echo "Cleaning up container..."
docker exec -t queue_postgres rm /var/lib/postgresql/data/restore.sql

echo "✅ Database successfully restored from: ${BACKUP_FILE}"
