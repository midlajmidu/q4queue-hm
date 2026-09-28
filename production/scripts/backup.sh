#!/usr/bin/env bash
set -e

# Change directory to the parent directory of this script (which should be the production folder)
cd "$(dirname "$0")/.."

echo "======================================"
echo " Backing up Q4Queue PostgreSQL DB"
echo "======================================"

# Load environment variables
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi
source .env

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/q4queue_backup_${TIMESTAMP}.sql"

mkdir -p backups

echo "Running pg_dump inside postgres container..."
docker exec -t queue_postgres pg_dump -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c -f /var/lib/postgresql/data/backup.sql

echo "Copying backup from container..."
docker cp queue_postgres:/var/lib/postgresql/data/backup.sql ./${BACKUP_FILE}

echo "Cleaning up container..."
docker exec -t queue_postgres rm /var/lib/postgresql/data/backup.sql

echo "✅ Backup successfully created at: ${BACKUP_FILE}"
