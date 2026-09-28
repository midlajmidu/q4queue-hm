# Q4Queue — Complete Production Migration Audit

**Audit Date:** 2026-09-28  
**Target Environment:**
- **Marketing Site:** `https://q4queue.com` (Vercel)
- **SaaS Application:** `https://app.q4queue.com` (AWS EC2 Ubuntu 24.04)
- **API Endpoints:** `https://app.q4queue.com/api/v1` (Reverse-proxied via NGINX, no standalone `api.q4queue.com` subdomain)

---

## 1. Executive Summary & Audit Findings

The Q4Queue codebase contains several legacy customer-specific domains (`amoebaq.com`), developer tunnels (`ngrok`), local development references (`localhost:3000`, `localhost:8000`, `127.0.0.1`), and exposed internal ports (`5432:5432`, `6379:6379`).

This audit catalogues every occurrence, explains the defect, and specifies the required production configuration.

---

## 2. Hardcoded Domain, Port, and Tunnel Inventory

| # | File Path | Line(s) | Current Behavior | Why Incompatible with Production | Required Production Behavior | Env Var Required | Subsystem |
|---|---|---|---|---|---|---|---|
| 1 | `backend/app/core/config.py` | 17 | `PUBLIC_API_URL = "https://your-ngrok-url.ngrok-free.app"` | Uses ngrok placeholder as default | Default must be `https://app.q4queue.com` | `PUBLIC_API_URL` | Backend Config |
| 2 | `backend/app/core/config.py` | 45 | `CORS_ORIGINS = "...localhost:3000,http://app.localhost:3000,http://localhost:3002..."` | Development origins bundled in default config | Production default must only allow `https://app.q4queue.com,https://q4queue.com` | `CORS_ORIGINS` | Backend Security |
| 3 | `backend/app/api/v1/endpoints/plivo.py` | 48-67, 120-121 | Checks for `"amoebaq.com" in base` and `proto == "http"` | Hardcoded customer domain checks for HTTPS rewrite | Rely on `settings.PUBLIC_API_URL` or reverse proxy header `X-Forwarded-Proto: https` | `PUBLIC_API_URL` | Plivo WebRTC |
| 4 | `backend/app/api/v1/endpoints/plivo.py` | 51 | `if settings.PUBLIC_API_URL and "your-ngrok" not in settings.PUBLIC_API_URL and "localhost" not in settings.PUBLIC_API_URL:` | Heuristic filters for local testing string | Clean production URL resolution without hardcoded tunnel names | `PUBLIC_API_URL` | Plivo WebRTC |
| 5 | `backend/app/services/email_service.py` | 131 | `portal_url = f"{settings.FRONTEND_URL.rstrip('/')}/super-admin/sales-requests"` | Uses `FRONTEND_URL` (good), but needs clean fallback | Ensure `FRONTEND_URL` defaults to `https://app.q4queue.com` | `FRONTEND_URL` / `APP_URL` | Email System |
| 6 | `backend/app/whatsapp/message_service.py` | 239 | `frontend_url = getattr(settings, "FRONTEND_URL", "https://app.q4queue.com").rstrip("/")` | Good, but needs consistent reference | Use standardized `settings.FRONTEND_URL` | `FRONTEND_URL` / `APP_URL` | WhatsApp |
| 7 | `backend/app/services/notification_service.py` | 216, 235, 323 | `frontend_url = getattr(settings, "FRONTEND_URL", "https://app.q4queue.com").rstrip("/")` | Fallback is hardcoded | Use centralized settings attribute | `FRONTEND_URL` / `APP_URL` | Notifications |
| 8 | `frontend/app/display/[queueId]/page.tsx` | 105 | `${(process.env.NEXT_PUBLIC_API_URL \|\| 'https://amoebaq.com/api/v1').replace('/api/v1', '')}${rawLogoUrl}` | Hardcoded fallback to `amoebaq.com` | Fallback to relative `/uploads` or `NEXT_PUBLIC_API_URL` | `NEXT_PUBLIC_API_URL` | Frontend Display |
| 9 | `frontend/app/track/[trackingId]/page.tsx` | 450 | `https://amoebaq.com/api/v1${logoUrl}` | Hardcoded fallback to `amoebaq.com` | Fallback to relative path or dynamic base | `NEXT_PUBLIC_API_URL` | Customer Tracking |
| 10 | `frontend/app/join/[queueId]/page.tsx` | 391 | `https://amoebaq.com/api/v1${logoUrl}` | Hardcoded fallback to `amoebaq.com` | Fallback to relative path or dynamic base | `NEXT_PUBLIC_API_URL` | Queue Join |
| 11 | `frontend/components/UserSidebar.tsx` | 277 | `'https://amoebaq.com/api/v1'` | Hardcoded fallback to `amoebaq.com` | Use relative or standard `config.apiBaseUrl` | `NEXT_PUBLIC_API_URL` | Staff Sidebar |
| 12 | `frontend/app/api/v1/queues/[queueId]/scan/route.ts` | 33 | `new URL(location, "http://localhost:3000")` | Hardcoded `localhost:3000` base for URL parser | Use client request origin or `NEXT_PUBLIC_APP_URL` | `NEXT_PUBLIC_APP_URL` | Next.js API Route |
| 13 | `frontend/middleware.ts` | 19-36, 81-105 | Cross-domain redirect logic between root domain and `app.` subdomain | Conflates Vercel marketing domain with EC2 SaaS domain | Since Vercel serves `q4queue.com` and EC2 serves `app.q4queue.com`, EC2 middleware routes `/` to `/login` and redirects marketing to `LANDING_URL` | `NEXT_PUBLIC_LANDING_URL` | Frontend Routing |
| 14 | `landing/components/landing/Navbar.tsx` | 118, 195 | `href="/login"` | Relative link assumes marketing and app share one server | Must link to `https://app.q4queue.com/login` | `NEXT_PUBLIC_APP_URL` | Vercel Landing |
| 15 | `docker-compose.yml` | 16, 48, 92, 132 | `5432:5432`, `6379:6379`, `8000:8000`, `3002:3000` | Exposes internal databases and backend ports to host `0.0.0.0` | In production compose, only NGINX ports `80` and `443` are published | N/A (Docker Compose) | Docker Networking |
| 16 | `docker-compose.yml` | 94, 95 | `- ./backend/app:/app/app`, `- ./backend/alembic:/app/alembic` | Binds live development source code over container | Production containers must use immutable built Docker images | N/A (Docker Compose) | Docker Container |
| 17 | `production/nginx/nginx.conf` | 11, 21, 24, 25 | `server_name amoebaq.com www.amoebaq.com;` | Hardcoded customer domain and SSL certificate paths | Change to `app.q4queue.com` (and parameterized template for on-premise) | N/A (NGINX) | Ingress Proxy |
| 18 | `production/.env.example` | 7-19, 30, 34 | `amoebaq.com` across all domain settings | Customer-specific legacy domain | Standardize to `app.q4queue.com` and `q4queue.com` | All Domain Vars | Documentation |
| 19 | `.env.example` | 4 | `FRONTEND_URL=https://amoebaq.com` | Customer-specific legacy domain | Standardize to `https://app.q4queue.com` | `FRONTEND_URL` | Documentation |

---

## 3. URL Architecture Model

```text
+-----------------------------------------------------------------------------------+
| ENVIRONMENT VARIABLE     | DEVELOPMENT VALUE           | PRODUCTION VALUE (SaaS)  |
+-----------------------------------------------------------------------------------+
| ENVIRONMENT              | development                 | production               |
| APP_URL / FRONTEND_URL   | http://localhost:3000       | https://app.q4queue.com  |
| LANDING_URL              | http://localhost:3000       | https://q4queue.com      |
| PUBLIC_API_URL           | http://localhost:8000       | https://app.q4queue.com  |
| BACKEND_INTERNAL_URL     | http://127.0.0.1:8000       | http://backend:8000      |
| NEXT_PUBLIC_API_URL      | /api/v1                     | /api/v1                  |
| NEXT_PUBLIC_WS_BASE_URL  | ws://localhost:8000/api/v1/ws| wss://app.q4queue.com/api/v1/ws |
| CORS_ORIGINS             | (localhost ports)           | https://app.q4queue.com,https://q4queue.com |
+-----------------------------------------------------------------------------------+
```

---

## 4. Subsystem Migration Plans

### 4.1. Authentication & Cookie Strategy
- The current application relies on JWT Bearer tokens passed via `Authorization: Bearer <token>` and mirrored between memory and browser storage with multi-tab listeners.
- **Decision:** Preserve the robust Bearer token architecture for zero regressions, while ensuring strict CORS origin enforcement (`allow_origins` without wildcards) and comprehensive Security Headers (CSP, Frame-Options, XSS protection, HSTS) terminating at NGINX.

### 4.2. WebSockets & Real-Time Sync
- Browser client connects to `wss://app.q4queue.com/api/v1/ws/...`.
- NGINX handles protocol upgrade (`Upgrade: $http_upgrade`, `Connection: "upgrade"`) with a 3600-second read timeout.
- Internal Gunicorn workers communicate via Redis Pub/Sub (`redis:6379`).

### 4.3. External Webhooks
- **Meta WhatsApp:** Registered at `https://app.q4queue.com/api/v1/webhooks/whatsapp`. GET challenge verifies against `WHATSAPP_VERIFY_TOKEN` (or tenant override). POST event updates message delivery statuses idempotently by `meta_message_id`.
- **Plivo WebRTC Voice:** Callbacks generated via `PUBLIC_API_URL`:
  - Answer URL: `https://app.q4queue.com/api/v1/plivo/answer`
  - Hangup URL: `https://app.q4queue.com/api/v1/plivo/hangup`

### 4.4. Storage & Backups
- `/app/uploads` is mounted to persistent host storage (`uploads_data` volume or host directory).
- In-process backup scheduler runs with distributed Redis locks to avoid duplicate runs across Gunicorn workers.
- Off-host backup command provided for daily S3 synchronization.
