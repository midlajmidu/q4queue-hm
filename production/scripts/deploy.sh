#!/usr/bin/env bash
set -e

# Change directory to the parent directory of this script (which should be the production folder)
cd "$(dirname "$0")/.."

echo "======================================"
echo " Deploying Q4Queue Production"
echo "======================================"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your variables before deploying."
    exit 1
fi

echo "Starting Docker Compose..."
docker compose up -d

echo "✅ Q4Queue has been successfully deployed!"
echo "Check logs using: docker compose logs -f"
