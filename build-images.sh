#!/usr/bin/env bash
set -e

echo "========================================"
echo " Building Q4Queue Production Images"
echo " Platform: linux/amd64"
echo "========================================"

# Enable Buildx
docker buildx create --use >/dev/null 2>&1 || true
docker buildx inspect --bootstrap

echo "Building Backend Image..."
docker buildx build \
  --platform linux/amd64 \
  -t qrq-backend:latest \
  --load \
  ./backend

echo "Building Frontend Image..."
docker buildx build \
  --platform linux/amd64 \
  -t qrq-frontend:latest \
  --load \
  ./frontend

echo ""
echo "✅ AMD64 production images built successfully."
echo ""
docker image inspect qrq-backend:latest --format='Backend Platform: {{.Architecture}}/{{.Os}}'
docker image inspect qrq-frontend:latest --format='Frontend Platform: {{.Architecture}}/{{.Os}}'
