# 🏥 FlowClinic — Real-Time SaaS Queue Management

FlowClinic is a premium, multi-tenant SaaS application designed for clinics and service centers to manage customer queues with absolute precision. Built with a focus on **concurrency safety**, **multi-tenancy isolation**, and **real-time synchronization**, it provides a seamless experience for administrators, staff, and customers.

---

## 🚀 Key Features

- **🛡️ Clinical Concurrency Safety**: Uses strict PostgreSQL row-level locking (`SELECT FOR UPDATE`) to ensure zero duplicated or skipped token numbers, even under extreme load (100+ requests/sec).
- **🏢 Multi-Tenant Architecture**: Robust data isolation between organizations. Admins only see and manage their own organization's queues.
- **⚡ Pro-Active WebSockets**: Powered by Redis Pub/Sub, the dashboard, TV display, and customer join pages update instantly without a page refresh.
- **📊 Comprehensive Admin Controls**:
  - **Manual Entry**: Hand-generate tokens for walk-in customers.
  - **Invite by Number**: Directly call any specific waiting token to the desk.
  - **Smart Remove**: Remove customers from the waiting list with a clean `deleted` auditing trail.
  - **Auto-Advance**: Seamlessly move to the "Next" customer with one click or keyboard shortcut (`Enter`).
  - **Queue Reset**: Clear activity and restart counters for a fresh day.
- **📺 Cinematic TV Display**: A dedicated full-screen view for waiting areas showing the current serving number and recent history.
- **📱 Smart Join Page**: Customer-facing mobile view with live position tracking ("X people ahead of you") and real-time status alerts.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **ORM**: [SQLAlchemy](https://www.sqlalchemy.org/) (Async/await pattern)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Version 15)
- **Caching/PubSub**: [Redis](https://redis.io/) (Real-time updates & rate limiting)
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Auth**: JWT (JSON Web Tokens) with Argon2 hashing

### Frontend
- **Framework**: [Next.js 15+](https://nextjs.org/) (React 19)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **State Management**: React Hooks + WebSocket listeners
- **Icons**: Lucide React / HeroIcons

---

## 🏗️ Project Structure

```text
queeeee/
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
│   ├── lib/                 # API client and utilities
│   └── hooks/               # Custom hooks (WebSockets, Auth)
└── deploy/                  # Infrastructure config (Nginx, etc.)
```

---

## 🚦 Quick Start

### 1. Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.
- Modern browser (Chrome/Edge/Arc recommended).

### 2. Environment Setup
The project comes with a root `.env` and sub-directory `.env` files. Ensure your local secrets are configured:
```bash
# Root directory (.env)
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppassword
POSTGRES_DB=queuedb
```

### 3. Spin Up the Stack
```bash
# Build and start all services in the background
docker compose up --build -d
```

### 4. Initial Setup (Super Admin)
The system automatically creates a global **Super Admin** on the first run.
- **Login URL**: `http://localhost:3000/super-admin/login`
- **Default Email**: `superadmin@qrq.internal`
- **Default Password**: `SuperAdmin@2026!!!`

Use the Super Admin panel to create your first **Organization** (Tenant) and their initial **Admin** account.

---

## 📖 Usage Guide

### 📂 Super Admin Portal
- **URL**: `http://localhost:3000/super-admin/login`
- **Purpose**: Manage the entire SaaS platform. Use this to create new clinics, monitor platform stats, and manage organizations.

### 🖥️ Clinic Admin Dashboard
- **URL**: `http://localhost:3000/login`
- **Purpose**: Staff and Clinic Admins manage their specific queues here.
- **Login**: Requires the **Organization Slug** you created in the Super Admin panel.
- **Actions**:
  - `Enter` key: Call the next person in line.
  - `S` key: Skip the current customer.

### 📺 TV Display
- **URL**: `http://localhost:3000/display/[queueId]`
- Optimized for large screens. Shows the current serving number in huge font and the last 5 activities below.

### 📱 Customer Join
- **URL**: `http://localhost:3000/join/[queueId]`
- Customers can scan a QR code leading to this page.
- Once they join, they receive a unique token and can watch their position change in real-time.

---

## 🛰️ API Documentation

Once the backend is running, you can explore the fully interactive API documentation:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Redoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🛡️ Concurrency & State Machine

The system strictly follows this lifecycle for every token:
`WAITING` ➔ `SERVING` ➔ `DONE` | `SKIPPED` | `DELETED`

- **Row Locking**: Every state transition (e.g., `call_next`) performs a `FOR UPDATE` lock on the specific `Queue` row to prevent any race condition between multiple staff members calling "Next" at the exact same microsecond.
- **Safe Removal**: Tokens are never physically deleted to preserve the audit trail; they are marked as `deleted` and removed from the active waiting counts.

---

## 🛠️ Development Tools

### Generating Migrations
```bash
docker compose exec backend alembic revision --autogenerate -m "added_new_field"
```

### Viewing Logs
```bash
docker compose logs -f backend
```

---

## 📜 License
Internal use only. FlowClinic is a proprietary SaaS framework.
