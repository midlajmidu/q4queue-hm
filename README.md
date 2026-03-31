# 🏥 Q4Queue — Premium SaaS Queue Management

Q4Queue is a high-performance, multi-tenant SaaS platform designed for clinics and service centers to manage customer queues with absolute precision. Built with a focus on **concurrency safety**, **data isolation**, and **real-time synchronization**, it provides a premium experience for administrators, staff, and customers.

> [!NOTE]
> This branch (`landing-page-ui`) is specifically optimized for static-first hosting on Vercel, providing a high-fidelity landing and lead-capture funnel before the core application deployment.

---

## 🚀 Key Features

- **🛡️ Concurrency Safety**: Uses strict PostgreSQL row-level locking (`SELECT FOR UPDATE`) to guarantee zero duplicated or skipped tokens, even under extreme load (100+ requests/sec).
- **🏢 Multi-Tenant Isolation**: Robust data separation between Organizations. Staff only see their own organization's queues.
- **⚡ Real-Time Sync**: Powered by Redis Pub/Sub and WebSockets, ensuring every dashboard, TV display, and customer page updates instantly without manual refresh.
- **📊 Admin Efficiency**:
  - **Auto-Advance**: Slay the queue with one click or the `Enter` keyboard shortcut.
  - **Direct Invite**: Call specific tokens to the desk for prioritized cases.
  - **Queue Control**: Start, stop, and reset queues with an automated auditing trail.
- **📺 TV Display Optimization**: High-visibility "Now Serving" dashboard designed for large screens in waiting areas.
- **📱 One-Scan Join**: Customer-facing mobile interface with real-time position tracking and status alerts.

---

## 🗄️ Domain Architecture (Core Models)

The system is structured around five primary database entities, ensuring a scalable and maintainable data layer:

### 1. `Organization`
The foundation of the multi-tenant architecture.
- **Identity**: Globally unique `slug` (e.g., `heart-clinic`) for URL-based routing.
- **Configuration**: Manages limits (max sessions, max queues) and branding information.

### 2. `User`
Administrative and staff accounts.
- **Isolation**: Every user is scoped to a single `org_id`.
- **Roles**: Extensible roles including `admin`, `staff`, and `display`.

### 3. `Session`
Date-based work groups (e.g., "Monday Shift", "Morning OPD").
- **Constraint**: Unique `org_id` + `session_date` pairing ensures organizational history is organized by calendar day.
- **Hierarchy**: Acts as a parent container for multiple Queues.

### 4. `Queue`
Individual service lines (e.g., "Reception", "Doctors Room 1").
- **Identity**: Custom prefixes (A, B, C) and names.
- **State**: Tracks `current_token_number` and activity status.

### 5. `Token`
The customer's entry into a specific queue.
- **Lifecycle**: `WAITING` ➔ `SERVING` ➔ `DONE` | `SKIPPED` | `DELETED`.
- **Customer Identity**: Stores `name`, `age`, and `phone_number` for notification and analytics.

---

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern, high-performance web framework for Python.
- **SQLAlchemy 2.0**: Type-safe ORM for complex async database interactions.
- **Alembic**: Robust database migration management.
- **Redis**: Low-latency caching and WebSocket message brokering.
- **PostgreSQL 15**: Industrial-grade relational database.

### Frontend
- **Next.js 15+**: React-based framework with Server Actions and App Router.
- **Tailwind CSS 4.0**: Premium, utility-first styling for high-fidelity UI.
- **Framer Motion**: Smooth micro-animations and page transitions.
- **Lucide Icons**: Consistent, beautiful iconography.

---

## 🏗️ Project Structure

```text
q4queue/
├── backend/
│   ├── app/
│   │   ├── api/             # RESTful API Endpoints
│   │   ├── models/          # Core Domain Entities (Org, User, Session, Queue, Token)
│   │   ├── services/        # Business Logic & Atomicity Handlers
│   │   └── websocket/       # Real-time state management
│   └── alembic/             # Version-controlled DB migrations
├── frontend/
│   ├── app/                 # Next.js Pages (Dashboard, Join, Display)
│   ├── components/          # Reusable UI Architecture
│   └── lib/                 # Type-managed API & WebSocket hooks
└── docker-compose.yml       # Production-ready container orchestration
```

---

## 🚦 Getting Started

1. **Environment Setup**: Ensure your `.env` file is configured with the necessary database and Redis credentials.
2. **Launch Stack**:
   ```bash
   docker compose up --build -d
   ```
3. **Super Admin Access**:
   - **URL**: `http://localhost:3000/super-admin/login`
   - **Default Email**: `superadmin@q4queue.internal`
   - **Password**: `SuperAdmin@2026!!!` (Configure in production!)

---

## 🛰️ Access Points

- **Staff Dashboard**: `http://localhost:3000/login`
- **Patient Display**: `http://localhost:3000/display/[queueId]`
- **Join Queue**: `http://localhost:3000/join/[queueId]`

---

## 📜 License
Proprietary SaaS Framework. Internal use only.
