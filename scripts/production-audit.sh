#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# Q4QUEUE AUTOMATED PRODUCTION AUDIT & VALIDATION SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ERRORS=0
WARNINGS=0

echo "================================================================="
echo "  Q4QUEUE PRODUCTION AUDIT & VERIFICATION"
echo "  Auditing: ${REPO_ROOT}"
echo "================================================================="
echo ""

# Helper logging functions
pass() { echo "  [PASS] $*"; }
fail() { echo "  [FAIL] $*"; ((ERRORS++)); }
warn() { echo "  [WARN] $*"; ((WARNINGS++)); }

# ── 1. Check for hardcoded legacy/customer domains ─────────────
echo "1. Checking for forbidden hardcoded domains..."
FORBIDDEN_DOMAINS=("amoebaq.com" "ameoba.q4queue.com" "api.ameoba")

for domain in "${FORBIDDEN_DOMAINS[@]}"; do
    MATCHES=$(grep -rn "$domain" \
        --exclude-dir=".git" \
        --exclude-dir="node_modules" \
        --exclude-dir=".next" \
        --exclude-dir="local_backups" \
        --exclude-dir="artifacts" \
        --exclude-dir="brain" \
        --exclude-dir="venv" \
        --exclude-dir=".venv" \
        --exclude-dir="__pycache__" \
        --exclude="*.log" \
        --exclude="*.sha256" \
        --exclude="*.pyc" \
        --exclude="*.tar" \
        --exclude="PRODUCTION_MIGRATION_AUDIT.md" \
        --exclude="production-audit.sh" \
        "${REPO_ROOT}" || true)

    if [ -n "$MATCHES" ]; then
        fail "Found hardcoded forbidden reference: '$domain'"
        echo "$MATCHES" | head -n 5 | sed 's/^/         /'
    else
        pass "No occurrences of '$domain' found in codebase."
    fi
done

# ── 2. Check production Docker Compose configuration ──────────
echo ""
echo "2. Auditing production/docker-compose.yml..."
PROD_COMPOSE="${REPO_ROOT}/production/docker-compose.yml"

if [ ! -f "$PROD_COMPOSE" ]; then
    fail "production/docker-compose.yml does not exist."
else
    # Check that database and redis ports are NOT published to the host
    if grep -E '^[[:space:]]*-[[:space:]]*"?5432:5432' "$PROD_COMPOSE" > /dev/null; then
        fail "PostgreSQL port 5432 is publicly exposed in production/docker-compose.yml!"
    else
        pass "PostgreSQL port 5432 is isolated inside the Docker network."
    fi

    if grep -E '^[[:space:]]*-[[:space:]]*"?6379:6379' "$PROD_COMPOSE" > /dev/null; then
        fail "Redis port 6379 is publicly exposed in production/docker-compose.yml!"
    else
        pass "Redis port 6379 is isolated inside the Docker network."
    fi

    if grep -E '^[[:space:]]*-[[:space:]]*"?8000:8000' "$PROD_COMPOSE" > /dev/null; then
        fail "FastAPI port 8000 is publicly exposed in production/docker-compose.yml!"
    else
        pass "FastAPI backend port 8000 is isolated behind NGINX."
    fi

    if grep -E '^[[:space:]]*-[[:space:]]*"?3000:3000' "$PROD_COMPOSE" > /dev/null; then
        fail "Next.js port 3000 is publicly exposed in production/docker-compose.yml!"
    else
        pass "Next.js frontend port 3000 is isolated behind NGINX."
    fi

    # Check for dev bind mounts of code
    if grep -E '^\s*-\s*\./backend/app:/app/app' "$PROD_COMPOSE" > /dev/null; then
        fail "Development code bind mount found in production/docker-compose.yml!"
    else
        pass "No development code bind mounts found in production Compose."
    fi
fi

# ── 3. Check NGINX production configuration ───────────────────
echo ""
echo "3. Auditing production/nginx/nginx.conf..."
PROD_NGINX="${REPO_ROOT}/production/nginx/nginx.conf"

if [ ! -f "$PROD_NGINX" ]; then
    fail "production/nginx/nginx.conf does not exist."
else
    if grep -q "app.q4queue.com" "$PROD_NGINX"; then
        pass "NGINX server_name configured for app.q4queue.com."
    else
        fail "NGINX server_name does not contain app.q4queue.com."
    fi

    if grep -q "Strict-Transport-Security" "$PROD_NGINX"; then
        pass "Strict-Transport-Security HSTS header is enabled."
    else
        fail "Strict-Transport-Security header is missing in NGINX configuration."
    fi

    if grep -q "client_max_body_size" "$PROD_NGINX"; then
        pass "client_max_body_size is properly set for media uploads."
    else
        warn "client_max_body_size is missing in NGINX configuration."
    fi

    if grep -q "proxy_set_header Upgrade" "$PROD_NGINX"; then
        pass "WebSocket Upgrade headers configured."
    else
        fail "WebSocket Upgrade headers missing in NGINX configuration."
    fi
fi

# ── 4. Check backend URL and settings resolution ──────────────
echo ""
echo "4. Auditing backend configuration & central settings..."
BACKEND_CONFIG="${REPO_ROOT}/backend/app/core/config.py"

if grep -q "APP_URL" "$BACKEND_CONFIG" && grep -q "PUBLIC_API_URL" "$BACKEND_CONFIG" && grep -q "LANDING_URL" "$BACKEND_CONFIG"; then
    pass "Backend config.py defines APP_URL, PUBLIC_API_URL, and LANDING_URL."
else
    fail "Backend config.py missing central URL settings."
fi

# ── 5. Check health & readiness endpoints ──────────────────────
echo ""
echo "5. Auditing health and readiness endpoints..."
HEALTH_FILE="${REPO_ROOT}/backend/app/api/v1/endpoints/health.py"

if [ -f "$HEALTH_FILE" ] && grep -q "/ready" "$HEALTH_FILE"; then
    pass "Readiness check endpoint /ready is implemented."
else
    fail "Readiness check endpoint /ready is missing."
fi

# ── 6. Check production environment templates ─────────────────
echo ""
echo "6. Auditing production environment templates..."
PROD_ENV_EXAMPLE="${REPO_ROOT}/production/.env.example"

REQUIRED_PROD_VARS=(
    "APP_URL"
    "LANDING_URL"
    "PUBLIC_API_URL"
    "SECRET_KEY"
    "DATABASE_URL"
    "REDIS_URL"
    "CORS_ORIGINS"
    "POSTGRES_DB"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "WHATSAPP_ACCESS_TOKEN"
    "WHATSAPP_PHONE_NUMBER_ID"
    "WHATSAPP_VERIFY_TOKEN"
    "PLIVO_AUTH_ID"
    "PLIVO_AUTH_TOKEN"
)

for var in "${REQUIRED_PROD_VARS[@]}"; do
    if grep -q "^${var}=" "$PROD_ENV_EXAMPLE"; then
        pass "Variable '$var' documented in production/.env.example."
    else
        fail "Variable '$var' missing from production/.env.example!"
    fi
done

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "================================================================="
echo "  AUDIT COMPLETE: ${ERRORS} errors, ${WARNINGS} warnings"
echo "================================================================="

if [ $ERRORS -gt 0 ]; then
    echo "❌ Production audit failed! Please fix the errors listed above."
    exit 1
else
    echo "✅ All automated production readiness checks passed successfully!"
    exit 0
fi
