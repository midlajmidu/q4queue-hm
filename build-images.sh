#!/usr/bin/env bash
set -e

echo "========================================"
echo " Building and Pushing Q4Queue Images"
echo " Platform: linux/amd64"
echo " Repo: q4queue/app"
echo "========================================"

# Enable Buildx
docker buildx create --use >/dev/null 2>&1 || true
docker buildx inspect --bootstrap

echo ""
echo "Building and Pushing Backend Image..."
docker buildx build \
  --platform linux/amd64 \
  -t q4queue/app:backend-latest \
  --push \
  ./backend

echo ""
echo "Building and Pushing Frontend Image..."
docker buildx build \
  --platform linux/amd64 \
  -t q4queue/app:frontend-latest \
  --push \
  ./frontend

echo ""
echo "✅ AMD64 production images successfully built and pushed to Docker Hub!"
echo "You can now run 'docker compose pull' on the server."
echo ""
