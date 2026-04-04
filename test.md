# Application Study: FlowClinic (Q4Queue)

## 🏗️ Backend Stack Details
- **Framework**: Python 3.11+ with **FastAPI**.
- **Database**: **PostgreSQL 15** (using **SQLAlchemy 2.0** Async mode).
- **In-Memory Store**: **Redis** (used for Rate Limiting and Real-Time WebSocket Pub/Sub).
- **Migration Tool**: **Alembic**.
- **Server**: **Uvicorn** (Asgi server).
- **Infrastructure**: Dockerized (Postgres, Redis, Backend, Frontend, Nginx).
- **Reverse Proxy**: **Nginx** (handles routing, SSL termination, and static assets).

## 🔐 Authentication Method
- **Method**: **JWT (JSON Web Tokens)** - Bearer Token.
- **Tenant Isolation**: Multi-tenant authentication. Users must provide an `organization_slug` to login to their specific clinic.
- **Roles**: 
  - `super_admin`: Global control over all organizations.
  - `admin`: Full control within their organization.
  - `staff`: Can manage tokens but not organization settings.
  - `display`: Read-only access for TV displays.
- **Features**: 
  - Rate-limited login (10 requests/min).
  - Audit logging for all authentication events.
  - Passwords hashed using standard FastAPI security patterns (likely Argon2 or BCrypt).

## 🗄️ Database Structure (Core Models)
- **organizations**: Stores tenant information (name, clinic slug, active status).
- **users**: Accounts tied to an organization (email unique per organization).
- **sessions**: Groups queues by date (e.g., separate queues for each morning/evening shift).
- **queues**: Represents a service line (e.g., "Doctor A", "Billing"). Includes `current_token_number` with row-level locking for concurrency.
- **tokens**: Individual customer ticket records.
  - *Status Lifecycle*: `waiting` -> `serving` -> `done`/`skipped`.
  - *Data*: Customer name, phone, age, and timestamps.
- **audit_logs**: Immutable record of system events.

## 🚀 Key API Endpoints (v1)

### Authentication
- `POST /api/v1/auth/login`: Authenticate and receive a Bearer JWT.

### Health & Monitoring
- `GET /health`: System health check (checks DB & Redis connection).
- `GET /metrics`: Prometheus metrics (if enabled).

### Queue Management (Admin/Staff)
- `GET /api/v1/queues`: List all queues for the organization.
- `POST /api/v1/queues`: Create a new queue.
- `GET /api/v1/queues/{uuid}`: Fetch detailed queue info.
- `DELETE /api/v1/queues/{uuid}`: Delete a queue.
- `POST /api/v1/queues/{uuid}/next`: Call the next customer in line (concurrency-safe).
- `POST /api/v1/queues/{uuid}/reset`: Clear tokens and reset counter for a new day.

### Token Operations
- `POST /api/v1/queues/{uuid}/tokens`: **Public** endpoint for customers to join the queue.
- `GET /api/v1/queues/{uuid}/tokens/{number}`: **Public** endpoint to check position/status.
- `PATCH /api/v1/tokens/{uuid}/done`: Mark a token as completed.
- `PATCH /api/v1/tokens/{uuid}/skip`: Skip a waiting customer.
- `PATCH /api/v1/tokens/{uuid}/remove`: Cancel a token.

### Super Admin (Global)
- `POST /api/v1/super-admin/organizations`: Create new tenants/clinics.
- `GET /api/v1/super-admin/organizations`: List all tenants.

### Real-Time
- `/api/v1/ws`: WebSocket connection for instant UI updates across dashboard/display.
