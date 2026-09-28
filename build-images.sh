#!/usr/bin/env bash
set -e

VERSION="${1:-${Q4QUEUE_VERSION:-v1.0.0}}"

echo "========================================"
echo " Building and Pushing Q4Queue Images"
echo " Platform: linux/amd64"
echo " Target Version: ${VERSION}"
echo " Repo: q4queue/app"
echo "========================================"

# Enable Buildx with a persistent named builder for caching
docker buildx create --name q4queue-builder --use >/dev/null 2>&1 || true
docker buildx use q4queue-builder
docker buildx inspect --bootstrap

echo ""
echo "Building and Pushing Backend Image (${VERSION} & latest)..."
docker buildx build \
  --platform linux/amd64 \
  -t "q4queue/app:backend-${VERSION}" \
  -t "q4queue/app:backend-latest" \
  --push \
  ./backend

echo ""
echo "Building and Pushing Frontend Image (${VERSION} & latest)..."
docker buildx build \
  --platform linux/amd64 \
  -t "q4queue/app:frontend-${VERSION}" \
  -t "q4queue/app:frontend-latest" \
  --push \
  ./frontend

echo ""
echo "Building and Pushing Landing Image (${VERSION} & latest)..."
docker buildx build \
  --platform linux/amd64 \
  -t "q4queue/app:landing-${VERSION}" \
  -t "q4queue/app:landing-latest" \
  --push \
  ./landing

echo ""
echo "✅ AMD64 production images (${VERSION} and latest) successfully built and pushed to Docker Hub!"
echo "To deploy this version on production, set Q4QUEUE_VERSION=${VERSION} in .env and run 'docker compose pull && docker compose up -d'"
echo ""
