#!/usr/bin/env bash
set -e

echo "======================================"
echo " Saving Q4Queue Production Images"
echo "======================================"

mkdir -p production

echo "Saving backend image..."
docker save qrq-backend:latest -o production/backend.tar

echo "Saving frontend image..."
docker save qrq-frontend:latest -o production/frontend.tar

echo "Generating portable checksums..."
cd production

if command -v sha256sum >/dev/null 2>&1; then
    sha256sum backend.tar > backend.tar.sha256
    sha256sum frontend.tar > frontend.tar.sha256
else
    shasum -a 256 backend.tar > backend.tar.sha256
    shasum -a 256 frontend.tar > frontend.tar.sha256
fi

cd ..

echo "✅ Images and checksums exported to production directory!"
