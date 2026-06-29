# 🏥 Q4Queue — Real-Time SaaS Queue Management

Q4Queue is a premium, multi-tenant SaaS application designed for clinics, retail environments, and service centers to manage customer queues with absolute precision. Built from the ground up with a focus on **concurrency safety**, **multi-tenancy isolation**, and **real-time synchronization**, it provides a seamless and modern experience for administrators, staff, and end customers.

---

## 🚀 Key Features

- **🛡️ Clinical Concurrency Safety**: Utilizes strict PostgreSQL row-level locking (`SELECT FOR UPDATE`) to guarantee zero duplicated or skipped token numbers, even under extreme concurrent loads (100+ requests/sec).
- **🏢 Multi-Tenant Architecture**: Robust, deeply-integrated data isolation between organizations. Admins and staff strictly access and manage only their own organization's queues and analytics.
- **⚡ Pro-Active WebSockets**: Powered by Redis Pub/Sub, the dashboard, public TV display, and customer join pages update instantly without requiring manual page refreshes.
- **📊 Comprehensive Administrative Controls**:
  - **Manual Entry**: Swiftly generate tokens for walk-in customers.
  - **Invite by Number**: Directly call any specific waiting token to the desk, overriding standard queue order if necessary.
  - **Smart Remove**: Remove customers from the waiting list with a clean `deleted` auditing trail.
  - **Auto-Advance**: Seamlessly move to the next customer in line with one click or via keyboard shortcut (`Enter`).
  - **Queue Reset**: Clear daily activity and restart counters for a fresh day.
- **📺 Cinematic TV Display**: A dedicated, full-screen view optimized for waiting area monitors, broadcasting the currently serving number alongside recent history and organizational announcements.
- **📱 Smart Join Page**: A frictionless, customer-facing mobile view featuring live position tracking ("X people ahead of you") and real-time status alerts.

---

## 🛠️ Technology Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+) for high-performance API routing.
- **ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) utilizing the modern Async/await pattern.
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Version 15+) for ACID-compliant transactional persistence.
- **Caching & Pub/Sub**: [Redis](https://redis.io/) handling real-time WebSocket broadcasting and rate limiting.
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Authentication**: Stateless JWT (JSON Web Tokens) with secure Argon2 password hashing.

### Frontend
- **Framework**: [Next.js 15+](https://nextjs.org/) (React 19) utilizing the App Router.
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/) for rapid, responsive, and highly customizable UI design.
- **State Management**: React Hooks supplemented by native WebSocket listeners and BroadcastChannel cross-tab synchronization.
- **Icons**: [Lucide React](https://lucide.dev/) for crisp, scalable vector iconography.

---

## 🏗️ Project Architecture

```text
q4queue/
├── docker-compose.yml       # Orchestrates Postgres, Redis, Backend, Nginx
├── backend/
│   ├── app/                 # FastAPI application source
│   │   ├── api/             # REST Endpoints (v1)
│   │   ├── models/          # SQLAlchemy Database Models
│   │   ├── services/        # Business logic layer
│   │   └── websocket/       # Real-time message handlers
│   ├── alembic/             # DB migration scripts
│   ├── Dockerfile           # High-performance Python container
│   └── requirements.txt     # Backend dependencies
├── frontend/
│   ├── app/                 # Next.js App Router (Dashboard, Join, Display)
│   ├── components/          # Reusable UI components
│   ├── lib/                 # API client and configuration utilities
│   └── hooks/               # Custom hooks (WebSockets, Auth, Heartbeat)
└── deploy/                  # Infrastructure configurations (Nginx, etc.)
```

---

## 🚦 Quick Start Guide

### 1. Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your host machine.
- A modern web browser (Google Chrome, Microsoft Edge, or Arc recommended).

### 2. Environment Configuration
The project relies on a root `.env` file as well as sub-directory `.env` files. Ensure your local secrets are properly configured before starting the application:
```bash
# Root directory (.env)
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppassword
POSTGRES_DB=queuedb
```

### 3. Spin Up the Stack
Build and start all associated services (Database, Cache, API, Web) in the background:
```bash
docker compose up --build -d
```

### 4. Initial Provisioning (Super Admin)
The system is designed to automatically provision a global **Super Admin** account on its first run.
- **Login URL**: `http://localhost:3000/super-admin/login`
- **Default Email**: `superadmin@qrq.internal`
- **Default Password**: `SuperAdmin@2026!!!`

*Note: Use the Super Admin panel to provision your first Organization (Tenant) and assign their initial Admin account.*

---

## 📖 Standard Operating Procedures

### 📂 Super Admin Portal
- **URL Path**: `/super-admin/login`
- **Purpose**: Global management of the entire SaaS platform. Use this interface to onboard new client organizations, monitor platform-wide statistics, and oversee multi-tenant configurations.

### 🖥️ Organization Admin Dashboard
- **URL Path**: `/login` (or `/organization-login` for Org Admins)
- **Purpose**: The primary interface for staff and clinic administrators to manage their active queues.
- **Login Requirement**: Staff must log in under the specific **Organization Slug** provisioned by the Super Admin.
- **Power User Actions**:
  - `Enter` key: Call the next person in line instantly.
  - `S` key: Skip the currently highlighted customer.

### 📺 Public TV Display
- **URL Path**: `/display/[queueId]`
- **Purpose**: Optimized for large lobby screens. Displays the current serving token in high-contrast typography, accompanied by a recent activity ticker and customizable public announcements.

### 📱 Customer Join Portal
- **URL Path**: `/join/[queueId]`
- **Purpose**: Customers scan a physical QR code to access this page. Upon joining, they receive a unique cryptographic token and can track their real-time position in the queue without needing to download a mobile app.

---

## 🛰️ API Documentation

Once the backend service is running, developers can explore and interact with the API endpoints via automatically generated OpenAPI documentation:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Redoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🛡️ Technical Deep Dive: Concurrency & State Machine

To guarantee data integrity in high-traffic environments, the system strictly enforces the following token lifecycle:
`WAITING` ➔ `SERVING` ➔ `DONE` | `SKIPPED` | `DELETED`

- **Row Locking**: Every state transition (such as triggering `call_next`) performs a `FOR UPDATE` lock on the specific `Queue` database row. This reliably prevents race conditions that could occur if multiple staff members click "Next" at the exact same microsecond.
- **Safe Archival**: Tokens are never physically deleted from the database. To preserve a rigorous audit trail, they are flagged as `deleted` and logically removed from active waiting counts, ensuring historical reporting remains perfectly accurate.

---

## 🛠️ Development Utilities

### Generating Database Migrations
When modifying SQLAlchemy models, generate a new migration script using Alembic:
```bash
docker compose exec backend alembic revision --autogenerate -m "added_new_field"
```

### Monitoring Application Logs
Stream live logs from the backend container:
```bash
docker compose logs -f backend
```

---

## 📜 License
Internal use only. Q4Queue is a proprietary SaaS framework.
