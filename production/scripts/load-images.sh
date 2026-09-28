#!/usr/bin/env bash
set -e

# Change directory to the parent directory of this script (which should be the production folder)
cd "$(dirname "$0")/.."

echo "======================================"
echo " Loading Q4Queue Production Images"
echo "======================================"

if [ -f "backend.tar" ]; then
    echo "Loading backend image..."
    docker load -i backend.tar
else
    echo "Warning: backend.tar not found!"
fi

if [ -f "frontend.tar" ]; then
    echo "Loading frontend image..."
    docker load -i frontend.tar
else
    echo "Warning: frontend.tar not found!"
fi

echo "✅ Images loaded into Docker!"
