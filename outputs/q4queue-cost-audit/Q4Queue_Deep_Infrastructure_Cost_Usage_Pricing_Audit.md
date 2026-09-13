# Q4Queue — Deep Infrastructure Cost, Usage & Pricing Economics Audit

**Audit date:** 2026-09-06 — **VERIFIED FROM WORKSPACE DATE**  
**Scope:** `/Users/muhammedmidlaj/Desktop/qrq-1` only. This report is for Q4Queue, not Eventloo.

Evidence labels used throughout:

- **VERIFIED FROM CODE** — directly observable in this repository.
- **VERIFIED FROM PROVIDER PRICING** — current published provider price; links are included.
- **ESTIMATED** — engineering estimate derived from the architecture; validate by measurement.
- **ASSUMPTION** — editable business/model input.
- **UNKNOWN — NEEDS INPUT** — unavailable from the repository or public pricing.

All monetary figures are monthly INR excluding customer-facing GST unless stated otherwise. Every table's numeric values inherit the evidence label in that row. Forecasts are decision models, not load-test results.

## 1. Executive Summary

Q4Queue is a real multi-tenant queue-management product, not a billing-ready self-service SaaS. **VERIFIED FROM CODE.** It has parent organisations, branches, role-based staff, queues, daily sessions, customer tokens, QR/TOTP admission, WebSocket updates, analytics, exports, backups, Meta WhatsApp notifications, and Plivo browser-to-phone calling.

The deployed design is a single Docker host running Nginx, Next.js, FastAPI, PostgreSQL and Redis. **VERIFIED FROM CODE.** The repository declares approximately **4 CPU cores and 2.4–3.4 GB of container memory limits — VERIFIED FROM CODE**, while the operating guide recommends a host with **4 vCPU/8 GB minimum — VERIFIED FROM CODE**. The actual host, invoice, disk, traffic, production database size, peak concurrency and provider-account usage are **UNKNOWN — NEEDS INPUT**.

The biggest economic fact is that core queue processing is cheap but communications are not. Under the normal model, **1,000 token lifecycles cost about ₹7 core infrastructure plus ₹184 Meta utility messaging = ₹191 marginal cost — ESTIMATED/ASSUMPTION**. If Q4Queue absorbs more message types, WhatsApp can rapidly exceed compute cost. SMS and voice are even less suitable for “unlimited.”

The biggest technical cost amplifier is snapshot generation: one queue mutation builds separate public and admin snapshots, together executing roughly **26–28 database queries — ESTIMATED FROM CODE**, before broadcasting large token lists to every connected client. Dashboard polling, duplicated per-worker schedulers, unbounded in-process notification tasks, local backups, and missing data retention compound the risk.

Commercial direction: use **subscription + comprehensible token/queue/branch limits + prepaid communication add-ons — RECOMMENDED**. Charge for product value through plans; meter delivered WhatsApp, SMS and billable voice separately. Recommended starting prices are **Starter ₹999, Growth ₹2,499, Business ₹6,999, and Enterprise from roughly ₹25,000–₹75,000+ — RECOMMENDED/ASSUMPTION**. Their average-use modeled gross margins are **82.5%, 85.2%, 86.0% and 87.5% — ESTIMATED**, but only if communication allowances remain controlled and operational support stays near the modeled allowance.

Before public trials, Q4Queue needs enforceable entitlements, atomic usage counters, subscription state, payment webhooks, communication wallets, durable jobs, global abuse controls, off-site backups, retention, and production observability. **VERIFIED GAP FROM CODE.**

### Missing facts that materially change the answer

- Actual VPS/cloud invoices, CPU/RAM/disk and included transfer — **UNKNOWN — NEEDS INPUT**.
- PostgreSQL row counts, table/index bytes, query latency, connection count and backup bytes — **UNKNOWN — NEEDS INPUT**.
- Monthly token/session/queue counts and peak requests/connections — **UNKNOWN — NEEDS INPUT**.
- Meta WABA country/category invoice rates, free-window share, delivered/failed mix and messages per token — **UNKNOWN — NEEDS INPUT**.
- Plivo account rate card, phone-number rental, billed minutes, route and retry behavior — **UNKNOWN — NEEDS INPUT**.
- HM Leisure/Amoeba branches, queues, staff, token volume, peak traffic, support hours and SLA — **UNKNOWN — NEEDS INPUT**.
- Domain, SMTP/Workspace, backup-storage and payment-gateway invoices — **UNKNOWN — NEEDS INPUT**.

## 2. Q4Queue Architecture

### Technology and deployment

| Layer | Actual implementation | Cost behavior | Evidence |
|---|---|---|---|
| Web | Next.js 16.1.6 and React 19.2.3 App Router | CPU/RAM step-function; static bandwidth variable | VERIFIED FROM CODE |
| API | FastAPI 0.115.5, Python 3.11, async SQLAlchemy | CPU/RAM step-function; request work variable | VERIFIED FROM CODE |
| Database | PostgreSQL 15, asyncpg pool | Storage variable; CPU/I/O and connections step-function | VERIFIED FROM CODE |
| Real time | WebSockets plus Redis 7 Pub/Sub | Connections and outbound bytes variable; Redis capacity step-function | VERIFIED FROM CODE |
| Edge | Nginx TLS/reverse proxy | Mostly fixed; bandwidth variable | VERIFIED FROM CODE |
| Packaging | Docker Compose on one host | Fixed until host limit, then a large step | VERIFIED FROM CODE |
| Authentication | JWT HS256 with 24-hour access token; bcrypt passwords | Negligible direct fee; DB read/CPU per protected request | VERIFIED FROM CODE |
| Communications | Meta Graph Cloud API; Plivo WebRTC/PSTN; Gmail SMTP | Delivered messages/minutes variable | VERIFIED FROM CODE |
| Files | Local Docker volumes for logos, exports and backups | Disk/backup variable; single-host durability risk | VERIFIED FROM CODE |
| Monitoring | Prometheus instrumentation and local logs; no hosted monitoring stack in Compose | Software free; operating/storage cost exists | VERIFIED FROM CODE |

### Organisation and isolation

A `ParentOrganization` represents an enterprise/customer group; `Organization` represents a branch. Branches carry `parent_org_id`, slugs, active state, limits and settings. **VERIFIED FROM CODE.** Super-admin and organisation-admin endpoints create these records manually; there is no public checkout/onboarding path. **VERIFIED FROM CODE.**

Tenant isolation is application-level: JWT/current-user dependencies resolve the user's role and organisation, then endpoints add `org_id` or parent-organisation filters. **VERIFIED FROM CODE.** PostgreSQL row-level security is not implemented. **VERIFIED FROM CODE.** This makes missing filters a cross-tenant security risk and favors a shared-schema cost model.

### Users and permissions

- `super_admin`: platform-wide administration; normally has no branch `org_id`. **VERIFIED FROM CODE.**
- `organization_admin`: manages a parent organisation and its branches, analytics, exports and backups. **VERIFIED FROM CODE.**
- `admin` / `branch_admin`: manages one branch, queues, sessions and staff. **VERIFIED FROM CODE.**
- `staff`: performs queue operations within its assigned branch. **VERIFIED FROM CODE.**

Every protected request normally validates JWT, loads the current user, and may perform an additional active-branch check. **ESTIMATED FROM CODE: 1–2 database reads/request.**

### Queue, customer, token and session mechanics

A queue belongs to a branch and stores name, active state, current token sequence, current-serving state, announcement and session controls. Queue creation inserts the queue, audits the action and can trigger real-time refresh work. **VERIFIED FROM CODE.**

A customer scans a locally generated QR containing a short-lived TOTP. The scan endpoint validates the rotating code and records one-time use in Redis for **600 seconds — VERIFIED FROM CODE**. The customer submits identity/phone details and WhatsApp consent. Token creation locks the queue row, validates the active session, checks for a duplicate active phone, finds the maximum token number, advances the sequence, inserts the token and calculates people ahead. **VERIFIED FROM CODE.**

Token states are `waiting`, `serving`, `done`, `skipped` and `deleted`. **VERIFIED FROM CODE.** Staff can call next, recall, complete, skip, delete and restore. “Delete” is a soft delete, so rows and indexes continue growing. **VERIFIED FROM CODE.** Queue actions use row locks, which protect ordering but serialize same-queue writes.

Sessions are queue/day operating windows. The database enforces one session per queue/date. **VERIFIED FROM CODE.** Sessions can be started, completed, paused/resumed or deleted; an auto-session task checks schedules once per minute per API worker. **VERIFIED FROM CODE.**

### Notifications and dashboard behavior

Meta WhatsApp supports join, nearby positions, called, completed, skipped, recalled and removed events with per-organisation toggles. **VERIFIED FROM CODE.** Join is consent-based; later alerts require the customer to activate notifications through a reply/button and rely on Meta's conversation rules. Each send creates/updates message rows, calls Meta, and webhook delivery states create additional log rows. **VERIFIED FROM CODE.**

The customer tracking page and staff/display pages use queue WebSockets. A connection causes an initial database snapshot; mutations rebuild snapshots and publish them through Redis. **VERIFIED FROM CODE.** The branch dashboard separately polls overview data every **20 seconds — VERIFIED FROM CODE**; other admin/monitor views poll at approximately **12, 15, 30 or 60 seconds — VERIFIED FROM CODE**, depending on page.

Analytics are computed from transactional tables using aggregate queries at request time. The main analytics route performs roughly **8 or more queries — ESTIMATED FROM CODE**; the organisation-admin dashboard can perform roughly **18 queries — ESTIMATED FROM CODE**.

### Major database tables

| Table/group | Purpose | Growth and access pattern | Important index observation | Evidence |
|---|---|---|---|---|
| `parent_organizations`, `organizations` | Tenant hierarchy/settings/limits | Low rows; frequent authentication/config reads | Slug/relationship indexes exist | VERIFIED FROM CODE |
| `users` | Admin/staff identities and roles | Staff-count growth; read on protected requests | Identity/org indexes exist | VERIFIED FROM CODE |
| `queues` | Branch queues and sequence state | Low rows; locked on token mutation | Unique name/org and org indexes | VERIFIED FROM CODE |
| `sessions` | Daily queue operating windows | Roughly queue-days retained | Unique queue/date; org/queue indexes | VERIFIED FROM CODE |
| `tokens` | Customer and lifecycle data | Dominant transactional growth; never physically removed by normal delete | Several indexes exist; session/status composites are missing | VERIFIED FROM CODE |
| `audit_logs` | Administrative/action trail | Potentially multiple writes per action | No ideal org/date composite identified | VERIFIED FROM CODE |
| `whatsapp_messages`, `whatsapp_webhook_logs`, `whatsapp_usage_stats` | Send state, raw callbacks and usage | Multiple rows per delivered message | Webhook time/retention indexing needs work | VERIFIED FROM CODE |
| `call_logs`, `messages` | Voice and internal messages | Per call/message | Normal tenant/user indexes | VERIFIED FROM CODE |
| `export_jobs`, `org_backups`, `branch_backups` | Generated artifact metadata | Per export/backup; file bytes live on disk | Retention and file/index consistency are operational concerns | VERIFIED FROM CODE |
| announcements/config/templates | System and tenant content/configuration | Low rows | Not a material cost driver | VERIFIED FROM CODE |

**Database footprint model:** **10 KB live indexed data per token lifecycle — ESTIMATED**. It covers the token, indexes, audit rows, WhatsApp message/webhook rows and overhead. Actual `pg_total_relation_size` measurements are **UNKNOWN — NEEDS INPUT**.

### Major API surface and cost profile

The repository exposes about **100 route declarations — ESTIMATED FROM CODE SEARCH**. The table groups them into the major economic paths; response sizes must be measured in production.

| Endpoint group | Purpose/authentication | Typical database/external work | Response size and frequency | Cost concern | Evidence |
|---|---|---|---|---|---|
| `/auth/*`, `/super-admin/login` | Login/password/OTP; public credential exchange | User/org reads; password CPU; SMTP for OTP | 1–5 KB; low except attacks | Brute force and email abuse | ESTIMATED FROM CODE |
| `/queues`, `/queues/{id}` | Create/list/update queues; staff/admin JWT | 2–8 reads and 1–3 writes/action | 2–20 KB; dashboard use | Repeated list refreshes | ESTIMATED FROM CODE |
| `/queues/{id}/scan`, join/token creation routes | Public QR validation and joining | Redis commands; queue/session/token reads; row lock; writes | 2–10 KB; proportional to arrivals | Primary public abuse and write path | ESTIMATED FROM CODE |
| `/queues/{id}/next` and token action routes | Call/complete/skip/delete/restore; staff/admin JWT | 5–12 transaction queries plus snapshots; audit; optional Meta | 2–20 KB/action; operationally frequent | Most expensive mutation path | ESTIMATED FROM CODE |
| `/track/{tracking_id}` and public token GET/delete | Customer status/self-service | 2–5 reads; delete adds writes/snapshot | 2–10 KB; may repeat | Polling/PII exposure | ESTIMATED FROM CODE |
| `/ws/queues/{id}`, `/ws/notifications`, `/ws/pairing/{code}` | Queue/admin/pairing real time; mixed public/JWT | Initial 13–14-query snapshot; Redis Pub/Sub | 50–150 KB initial/event snapshot; persistent | Fan-out multiplier | ESTIMATED FROM CODE |
| `/sessions/*` | Daily session lifecycle; staff/admin JWT | 2–8 reads/writes plus snapshots | 2–20 KB; daily/operational | Lock/state correctness | ESTIMATED FROM CODE |
| `/analytics/*`, organisation monitoring/operations | Dashboards, KPIs, history; authenticated | 5–18 aggregate/history queries | 5–100 KB; polled 12–60 sec | Historical scans and repeated work | ESTIMATED FROM CODE |
| `/whatsapp/*`, analytics/settings/templates | Configure/send/report; authenticated | Config/message/usage reads/writes; Meta API | 2–100 KB; per message/admin load | Direct provider cost and logs | ESTIMATED FROM CODE |
| Meta webhook routes | Inbound messages and delivery states; signed provider callback | Raw webhook insert + message/token updates | Small; multiple callbacks/message | Storage/write amplification | ESTIMATED FROM CODE |
| `/calls/*` | Save/list/aggregate Plivo call logs; authenticated | 1–6 queries; browser calls Plivo | 2–100 KB; per call/report | Per-minute external charge | ESTIMATED FROM CODE |
| exports/backups | Generate/download/restore; privileged | Wide data scans, file generation, metadata writes | KB to many MB; episodic | CPU, disk, restore risk | ESTIMATED FROM CODE |
| parent/org/branch/staff/admin routes | Tenant/user administration; privileged | 2–20 reads/writes depending dashboard | 2–100 KB; low/moderate | N+1/count-heavy dashboards | ESTIMATED FROM CODE |

### Development versus production

Development configuration points services at local/container hosts and uses framework development workflows. Production configuration sets the Amoeba/Q4Queue domain, Docker networks and persistent volumes. **VERIFIED FROM CODE.** The root production-like Compose still starts the API with `--reload`, while an alternate production Compose/Dockerfile differs in worker/resource settings. **VERIFIED FROM CODE.** Consolidate these definitions so the shipped topology is unambiguous.

## 3. Complete Usage Flow

```text
Customer scans local QR
  → Next.js join page
  → TOTP scan API
  → Redis one-time-key check/write
  → queue/organisation/session reads
  → customer submits details
  → FastAPI join endpoint
  → PostgreSQL queue-row lock + validation + token insert
  → audit write
  → two queue snapshots
  → Redis Pub/Sub
  → WebSocket fan-out to staff/display/customer
  → optional Meta WhatsApp send + webhook logs
  → staff calls/serves/completes token
  → token/session/queue writes + audit
  → snapshots and notifications repeat
  → analytics later aggregate the retained rows
```

| Action | Frontend/API | DB reads | DB writes | External/background/storage | Estimated unit cost | Evidence |
|---|---|---:|---:|---:|---:|---|
| Create queue | Authenticated queue POST | 2–5 | 2–3 | Audit + snapshot possible | <₹0.01 | ESTIMATED FROM CODE |
| Scan QR | Public scan endpoint | 2–4 | 0 | About 5 Redis commands; local QR generation | <₹0.01 | ESTIMATED FROM CODE |
| Customer joins/generates token | Public join POST | 8–12 transaction reads | 2–4 | Queue-row lock, audit, snapshot task | ₹0.007 core per average lifecycle allocation | ESTIMATED FROM CODE |
| Optional join WhatsApp | Background send | 3–6 | 2–4 | 1 media upload + 1 send; later webhooks | ₹0.115 planning rate per delivered utility message | ESTIMATED; official WABA rate UNKNOWN |
| Customer checks status | Tracking GET and/or WebSocket | 2–5 per GET; initial socket snapshot 13–14 | 0 | Redis Pub/Sub after connection | <₹0.01/request; bandwidth dominates | ESTIMATED FROM CODE |
| Staff serves/calls next | Authenticated action POST | 8–12 transaction reads plus 26–28 snapshot reads | 3–6 | Redis publish; optional Meta task | ₹0.007 lifecycle allocation plus communication | ESTIMATED FROM CODE |
| Complete/skip/delete/restore | Authenticated action | 5–10 plus snapshots | 2–6 | Audit + Redis + optional Meta | ₹0.007 lifecycle allocation plus communication | ESTIMATED FROM CODE |
| Dashboard load | Overview endpoint | 5–18 depending on role/page | 0 | Repeats every 12–60 seconds on polling pages | Highly concurrency-dependent | ESTIMATED FROM CODE |
| Analytics load | Analytics endpoints | 8+ aggregate queries | 0 | CPU/I/O over historical rows | Low now; step-function risk at large history | ESTIMATED FROM CODE |
| Export | Export POST/download | Multiple range queries | 1–2 metadata writes | Local CSV/XLSX/PDF file | Variable with export range | VERIFIED FROM CODE / UNKNOWN SIZE |
| Backup | Scheduler/manual API | Database-wide scan/dump | Metadata write | Local disk `pg_dump` | Variable with entire DB/tenant size | VERIFIED FROM CODE / UNKNOWN SIZE |

Normal lifecycle planning input: **5 public/product API requests, about 75 database reads and 23 database writes per token — ESTIMATED FROM CODE**. This includes allocated snapshots, audits and ordinary WhatsApp webhook activity. It deliberately excludes continuous dashboard polling and unusually high WebSocket fan-out.

## 4. Cost Drivers

### Fixed, variable and step-function map

| Driver | Type | Why it costs | Customer-facing meter? | Evidence |
|---|---|---|---|---|
| Base Docker host, domain, one mail account | Fixed | Exists before first paying tenant | No | VERIFIED FROM CODE / invoice UNKNOWN |
| App/DB/Redis host upgrades | Step-function | Capacity is purchased in blocks | No | VERIFIED ARCHITECTURE / ESTIMATED SCALE |
| Tokens/customers | Variable proxy | Drives rows, API work, snapshots and bandwidth | Yes: primary usage allowance | VERIFIED FROM CODE |
| Active queues/connections | Variable + step-function | Drives WebSockets, snapshots and peak concurrency | Yes: plan limit | VERIFIED FROM CODE |
| Branches/staff | Mostly value/complexity | Adds permissions, support, concurrent dashboards | Yes: plan packaging | VERIFIED FROM CODE |
| Sessions | Moderate data/control driver | More session rows and analytics cardinality | Soft plan limit | VERIFIED FROM CODE |
| WhatsApp delivered messages | Variable | Meta charges per delivered message/category/market | Yes: prepaid/pass-through | VERIFIED FROM PROVIDER PRICING |
| SMS segments | Variable | Provider/carrier/route/DLT billing | Yes: prepaid/pass-through | PROVIDER UNKNOWN |
| Voice billable minutes and number rental | Variable + fixed | Both WebRTC and PSTN legs may bill | Yes: prepaid minutes | VERIFIED FROM PROVIDER PRICING |
| PostgreSQL rows/indexes/backups | Variable + step-function | Storage, I/O, RAM working set and backup time | Indirect through retention/usage | VERIFIED FROM CODE |
| WebSocket/poll bandwidth | Variable | Large snapshots multiplied by viewers | Indirect; rate/connection limits | VERIFIED FROM CODE |
| Local uploads/exports/logs | Variable | Disk grows without object-store lifecycle | Storage quota/retention | VERIFIED FROM CODE |
| Payment processing | Variable % revenue | Gateway fee per payment | Built into price | PLANNING BENCHMARK |
| Human support/operations | Variable/semi-fixed | Onboarding, incident and enterprise effort | Built into tiers/SLA | ASSUMPTION |

### What is cheap versus dangerous

- **Very cheap — VERIFIED/ESTIMATED:** local QR codes, queue definitions, staff records, basic roles, announcements and ordinary API requests.
- **Moderate — ESTIMATED:** sessions, analytics, exports, retained transactional data and moderate WebSocket traffic.
- **Expensive — VERIFIED/ESTIMATED:** synchronous historical analytics, repeated large snapshots, whole-database backups, dedicated enterprise infrastructure and hands-on support.
- **Highly variable — VERIFIED:** WhatsApp, SMS, voice minutes, bot-created tokens, polling, concurrent sockets and retained webhook/audit data.

Features that must never be unlimited: delivered WhatsApp, SMS, voice minutes/calls, token creation, public API requests, exports, backup retention, storage, branches, queues, concurrent displays/sockets and enterprise support/SLA. **RECOMMENDED.** “Unlimited staff” is safer financially but still raises support/concurrency risk, so reserve it for negotiated enterprise contracts.

The best cost meter is **token lifecycle**; the best sales package combines **tokens + branches + queues + staff**, with communication metered independently. **RECOMMENDED.** API requests and database reads are real costs but are confusing customer-facing units.

## 5. Fixed Costs

| Item | Monthly model | Basis | Evidence |
|---|---:|---|---|
| Base production server | ₹4,560 | $48 DigitalOcean 4 vCPU/8 GiB benchmark × ₹95/USD | VERIFIED FROM PROVIDER PRICING for benchmark; actual host UNKNOWN |
| Gmail/Workspace account | ₹650 | Published Business Starter flexible list price | VERIFIED FROM PROVIDER PRICING; actual account UNKNOWN |
| Domain allocation | ₹100 | Annual registration divided monthly | ASSUMPTION; registrar/invoice UNKNOWN |
| Off-site backup allowance | ₹300 | Planning placeholder; not currently implemented | ASSUMPTION |
| Base fixed cost | ₹5,610 | Sum above | ESTIMATED/ASSUMPTION |
| Meta phone/WABA base fee | ₹0 assumed | Direct Cloud API is usage-priced; verify account | ASSUMPTION / account UNKNOWN |
| TLS certificate | ₹0 certificate fee | Let's Encrypt certificates are free | VERIFIED FROM PROVIDER PRICING |
| Redis/PostgreSQL/Prometheus licences | ₹0 licence fee | Self-managed open-source software | VERIFIED FROM CODE/PROVIDER |

Official sources: [DigitalOcean Droplet pricing](https://www.digitalocean.com/pricing/droplets), [Google Workspace pricing](https://knowledge.workspace.google.com/admin/billing/compare-flexible-and-annual-fixed-term-payment-plans), [Let's Encrypt agreement](https://letsencrypt.org/documents/LE-SA-v1.8-July-06-2026.pdf), [Redis Open Source](https://redis.io/open-source/), and [Prometheus](https://prometheus.io/).

The **₹5,610 base — ESTIMATED** is a normalized planning baseline, not Q4Queue's verified invoice.

## 6. Variable Costs

| Item | Unit model | Monthly examples | Evidence |
|---|---:|---|---|
| Core compute/DB/bandwidth | ₹7 per 1,000 tokens | ₹70 at 10,000; ₹700 at 100,000 | ESTIMATED |
| Meta utility message | ₹0.115 per delivered message | ₹115 per 1,000; ₹11,500 per 100,000 | ESTIMATED planning rate; exact WABA rate UNKNOWN |
| Normal WhatsApp mix | 1.6 messages/token | ₹184 per 1,000 tokens | ASSUMPTION + estimated planning rate |
| SMS | Provider/route dependent | Cannot price safely from code | UNKNOWN — NEEDS INPUT |
| Voice | About ₹0.63/billable minute for two modeled legs | ₹630 per 1,000 minutes plus number rental | ESTIMATED FROM PROVIDER PRICING |
| Payment processing | 2.36% of revenue | ₹23.58 on ₹999; ₹165.18 on ₹6,999 | VERIFIED PRICE + 18% GST-on-fee ASSUMPTION |
| Support/operations | 8% of revenue | ₹79.92 on ₹999 | ASSUMPTION |
| Live DB data | 10 KB/token | About 9.54 GB per 1,000,000 tokens | ESTIMATED |
| Stored DB plus backup copies | 3.5× live bytes | About 33.38 GB per 1,000,000 retained tokens | ASSUMPTION |
| Bandwidth | 1 MB/token lifecycle | About 976.6 GB per 1,000,000 tokens | ESTIMATED |

Razorpay is not implemented; its [2% platform fee](https://razorpay.com/pricing/) is used only as a payment-cost benchmark. **VERIFIED FROM CODE / PROVIDER.**

### Storage growth

Users can upload organisation logos and generate exports; ticket images are generated in memory for Meta. Backups, logos and exports remain on local volumes; there is no S3-compatible object store or CDN upload pipeline. **VERIFIED FROM CODE.** Customer document upload is not present. **VERIFIED FROM CODE.** Actual logo/export bytes per tenant are **UNKNOWN — NEEDS INPUT**.

Using the normal **2,000 tokens/organisation/month, 10 KB live/token and 3.5× live-plus-backup multiplier — ASSUMPTION**, transactional storage after **12 months — ASSUMPTION** is approximately:

| Organisations | Live DB | DB plus modeled backup copies | Local logos/exports | Evidence |
|---:|---:|---:|---|---|
| 100 | 22.9 GB | 80.1 GB | UNKNOWN — NEEDS INPUT | ESTIMATED/ASSUMPTION |
| 1,000 | 228.9 GB | 801.1 GB | UNKNOWN — NEEDS INPUT | ESTIMATED/ASSUMPTION |
| 10,000 | 2,288.8 GB | 8,010.9 GB | UNKNOWN — NEEDS INPUT | ESTIMATED/ASSUMPTION |

Storage becomes significant well before the largest scenario because local logical dumps duplicate the working set and compete for the same disk/I/O. **ESTIMATED.** Retention, compression and object-storage lifecycle are required before scale.

## 7. Cost Per Organisation

| Usage profile | Tokens/month | WhatsApp assumption | Fixed allocation | Core variable | Communication | Support/ops | Cost before payment fee | Evidence |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Low | 500 | 0.5/token | ₹56 | ₹4 | ₹29 | ₹100 | ₹189 | ESTIMATED/ASSUMPTION |
| Normal | 2,000 | 1.6/token | ₹56 | ₹14 | ₹368 | ₹150 | ₹588 | ESTIMATED/ASSUMPTION |
| High | 20,000 | 1.6/token | ₹56 | ₹140 | ₹3,680 | ₹500 | ₹4,376 | ESTIMATED/ASSUMPTION |
| Enterprise | 100,000 | 1.6/token | ₹200 | ₹700 | ₹18,400 | ₹4,000 | ₹23,300 | ESTIMATED/ASSUMPTION |

Fixed allocation uses **₹5,610 across 100 organisations = ₹56.10/organisation — ASSUMPTION**. The enterprise row uses a larger **₹200 allocation — ASSUMPTION** but excludes dedicated infrastructure, SLA penalties and bespoke onboarding. Payment fees depend on selling price and are calculated in Section 15.

Without absorbed communications, a normal organisation's modeled technical cost is only about **₹70/month plus support — ESTIMATED**. With normal Meta usage it is about **₹438 before support — ESTIMATED**. This is why communications belong in a wallet/pass-through layer rather than an unlimited subscription benefit.

## 8. Cost Per 1,000 Customers

Planning model per **1,000 token lifecycles — ASSUMPTION**:

```text
Core compute + DB + included bandwidth     ₹7   ESTIMATED
1,600 Meta utility messages × ₹0.115     ₹184   ASSUMPTION + ESTIMATED RATE
Marginal total                            ₹191   ESTIMATED
Fixed allocation at normal density        ₹28   ASSUMPTION
Allocated total                           ₹219   ESTIMATED
```

| Tokens/customers | API requests | DB reads | DB writes | Live DB added | Stored incl. backup copies | Bandwidth | WhatsApp cost | Total marginal cost | Evidence |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1,000 | 5,000 | 75,000 | 23,000 | 0.01 GB | 0.03 GB | 0.98 GB | ₹184 | ₹191 | ESTIMATED/ASSUMPTION |
| 10,000 | 50,000 | 750,000 | 230,000 | 0.10 GB | 0.33 GB | 9.77 GB | ₹1,840 | ₹1,910 | ESTIMATED/ASSUMPTION |
| 50,000 | 250,000 | 3,750,000 | 1,150,000 | 0.48 GB | 1.67 GB | 48.83 GB | ₹9,200 | ₹9,550 | ESTIMATED/ASSUMPTION |
| 100,000 | 500,000 | 7,500,000 | 2,300,000 | 0.95 GB | 3.34 GB | 97.66 GB | ₹18,400 | ₹19,100 | ESTIMATED/ASSUMPTION |
| 500,000 | 2,500,000 | 37,500,000 | 11,500,000 | 4.77 GB | 16.69 GB | 488.28 GB | ₹92,000 | ₹95,500 | ESTIMATED/ASSUMPTION |
| 1,000,000 | 5,000,000 | 75,000,000 | 23,000,000 | 9.54 GB | 33.38 GB | 976.56 GB | ₹184,000 | ₹191,000 | ESTIMATED/ASSUMPTION |

Retention recommendation: keep token-level personal data hot for **90 days — RECOMMENDED/ASSUMPTION**, aggregate daily queue/session metrics before deletion, retain finance/security audit metadata for **12 months — RECOMMENDED/ASSUMPTION**, and make longer legal/enterprise retention configurable and paid. Raw WhatsApp webhooks should usually expire after **30–90 days — RECOMMENDED/ASSUMPTION**. Confirm Indian contractual/privacy requirements with counsel: **UNKNOWN — NEEDS INPUT**.

## 9. Infrastructure Capacity

Capacity scenario assumes **2 queues and 2,000 monthly tokens per organisation; 5 API requests, 10 KB live DB and 1 MB bandwidth per token; 1.6 WhatsApp messages/token — ASSUMPTION/ESTIMATED**. DB size is a **12-month live-data estimate — ASSUMPTION**, excluding deletion and backup copies.

| Organisations | Queues | Customers/month | API requests/month | DB after 12 months | Bandwidth/month | Estimated infra | Communication | Total | Evidence |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 10 | 20 | 20,000 | 100,000 | 2.3 GB | 19.5 GB | ₹4,560 | ₹3,680 | ₹8,240 | ESTIMATED/ASSUMPTION |
| 50 | 100 | 100,000 | 500,000 | 11.4 GB | 97.7 GB | ₹4,560 | ₹18,400 | ₹22,960 | ESTIMATED/ASSUMPTION |
| 100 | 200 | 200,000 | 1,000,000 | 22.9 GB | 195.3 GB | ₹7,980 | ₹36,800 | ₹44,780 | ESTIMATED/ASSUMPTION |
| 500 | 1,000 | 1,000,000 | 5,000,000 | 114.4 GB | 976.6 GB | ₹22,800 | ₹184,000 | ₹206,800 | ESTIMATED/ASSUMPTION |
| 1,000 | 2,000 | 2,000,000 | 10,000,000 | 228.9 GB | 1,953.1 GB | ₹45,600 | ₹368,000 | ₹413,600 | ESTIMATED/ASSUMPTION |
| 5,000 | 10,000 | 10,000,000 | 50,000,000 | 1,144.4 GB | 9,765.6 GB | ₹182,400 | ₹1,840,000 | ₹2,022,400 | ESTIMATED/ASSUMPTION |
| 10,000 | 20,000 | 20,000,000 | 100,000,000 | 2,288.8 GB | 19,531.3 GB | ₹342,000 | ₹3,680,000 | ₹4,022,000 | ESTIMATED/ASSUMPTION |

These rows are architecture requirements, not claims that the current host can serve every row. **Current safe planning envelope: roughly 50–100 normal organisations, 100,000–200,000 tokens/month, 50–150 concurrent sockets and 3–5 sustained queue mutations/second — ESTIMATED.** Validate using production-like k6/Locust tests before committing an SLA. The first bottleneck is expected to be PostgreSQL CPU/I/O/connection pressure from snapshots and analytics; next are WebSocket bandwidth and local-disk backup contention. **ESTIMATED.**

Two configured API workers can expose up to **60 SQLAlchemy connections — VERIFIED FROM CODE/config calculation**, which is aggressive for a PostgreSQL container limited to **512 MB–1 GB RAM — VERIFIED FROM CODE**. The scheduler is started per worker, so **2 workers can execute 2 copies of each minute-level loop — VERIFIED FROM CODE**.

### Peak-load analysis

| Burst | Arrival rate | Approx. DB operations from joins | Likely outcome | Evidence |
|---|---:|---:|---|---|
| 100 joins in 1 minute | 1.67/sec | about 60/sec | Probably feasible on benchmark host; load-test required | ESTIMATED |
| 500 joins in 10 minutes | 0.83/sec | about 30/sec | Probably feasible if spread across queues | ESTIMATED |
| 1,000 joins in 1 hour | 0.28/sec | about 10/sec | Average load is modest | ESTIMATED |
| 100 joins in 10 seconds | 10/sec | about 360/sec | Same-queue locking and snapshots likely cause latency/timeouts | ESTIMATED |

Public joining is rate-limited to approximately **5 requests/10 seconds and 30/minute per IP — VERIFIED FROM CODE**. A venue using one shared NAT may therefore reject legitimate bursts before infrastructure saturates, while a distributed bot can bypass the per-IP protection.

### Real-time scaling

An idle WebSocket is comparatively cheap; mutations are expensive. One active queue connection creates an initial snapshot of roughly **13–14 queries — ESTIMATED FROM CODE**. Each mutation currently builds two snapshots totaling roughly **26–28 queries — ESTIMATED FROM CODE**, then fans payloads of approximately **50–150 KB — ESTIMATED** to connected clients. At **1,000 active queues — ASSUMPTION**, even one mutation per queue per minute implies about **17 mutations/sec and 440–480 snapshot queries/sec — ESTIMATED**. At **10,000 active queues — ASSUMPTION**, this design requires snapshot caching, incremental events and horizontal WebSocket workers.

## 10. Communication Costs

### WhatsApp

Q4Queue calls Meta Graph Cloud API directly. **VERIFIED FROM CODE.** Meta prices delivered template messages by market and category; service messages and eligible utility messages in customer-service windows may be free. [Official WhatsApp Business Platform pricing](https://whatsappbusiness.com/products/platform-pricing/). The official public page available to this audit did not expose a stable numeric India rate. The model therefore uses **₹0.115 per India utility message — ESTIMATED PLANNING RATE**, while the exact current WABA rate and invoice are **UNKNOWN — NEEDS INPUT** and must replace this cell before launch.

| Delivered utility messages | Direct Meta cost | Evidence |
|---:|---:|---|
| 1,000 | ₹115 | ESTIMATED planning rate |
| 10,000 | ₹1,150 | ESTIMATED planning rate |
| 100,000 | ₹11,500 | ESTIMATED planning rate |
| 1,000,000 | ₹115,000 | ESTIMATED planning rate |

Code issues: join sends also upload a ticket image; delivery callbacks add raw webhook rows. **VERIFIED FROM CODE.** A reminder path emits `queue_nearby_3_v2`/`queue_nearby_5_v2` while configured mapping expects newer names, so templates may fail after incurring application work. **VERIFIED FROM CODE; Meta account result UNKNOWN.**

Recommendation: customer-owned WABA with direct billing for large tenants, or Q4Queue prepaid credits at **₹250 per 1,000 delivered utility messages — RECOMMENDED/ASSUMPTION**. This yields **₹135 gross spread before tax/support — ESTIMATED** at the modeled rate. Marketing/authentication must be priced from current category/country rate cards plus **20–30% administration/risk markup — RECOMMENDED/ASSUMPTION**.

### SMS

SMS is not implemented. **VERIFIED FROM CODE.** Plivo lists **₹0.20 domestic and $0.08 ILDO per SMS — VERIFIED FROM PROVIDER PRICING**, but its India availability/registration terms can make the domestic number inapplicable and direct brands may face monthly commitments. See [Plivo India SMS pricing](https://www.plivo.com/sms/coverage/in/). Provider, DLT registration, route, Unicode segmentation and account eligibility are **UNKNOWN — NEEDS INPUT**.

Do not bundle SMS yet. Charge prepaid provider cost plus **25% — RECOMMENDED/ASSUMPTION**. At the ILDO benchmark and **₹95/USD — ASSUMPTION**, cost is **₹7.60/SMS and recommended retail at least ₹9.50/SMS — ESTIMATED**. Reprice after an India domestic/DLT quote.

### Voice/calling

The frontend uses Plivo browser calling and the backend stores call logs. **VERIFIED FROM CODE.** Published India rates are **₹0.25/min WebRTC, ₹0.38/min domestic and ₹200/month number rental, billed in 30-second pulses — VERIFIED FROM PROVIDER PRICING**. See [Plivo Voice India pricing](https://www.plivo.com/voice/pricing/in/) and [Plivo billing concepts](https://www.plivo.com/docs/faq/billing-and-invoices/billing-concepts).

Assuming both legs bill, cost is **₹0.63/min — ESTIMATED**. With a **90-second average answered call — ASSUMPTION**, including one **₹200/month number — VERIFIED PROVIDER PRICE**, costs are:

| Calls | Modeled cost | Evidence |
|---:|---:|---|
| 100 | ₹295 | ESTIMATED/ASSUMPTION |
| 1,000 | ₹1,145 | ESTIMATED/ASSUMPTION |
| 10,000 | ₹9,650 | ESTIMATED/ASSUMPTION |
| 100,000 | ₹94,700 | ESTIMATED/ASSUMPTION |

Recommend a prepaid retail rate of **₹1.25 per billable minute plus dedicated-number rental — RECOMMENDED/ASSUMPTION**. Failed/unanswered calls may be free, but answered voicemail/retries can bill; real invoices are **UNKNOWN — NEEDS INPUT**.

### Email and QR

Gmail SMTP is used for password OTP/change messages, not marketing. **VERIFIED FROM CODE.** The model uses **₹650/month — VERIFIED FROM PROVIDER PRICING** for one Workspace account; the actual account/free allowance is **UNKNOWN — NEEDS INPUT**. QR generation is local with `qrcode.react`: **no meaningful third-party per-QR cost — VERIFIED FROM CODE**.

## 11. Cost Risks

| Rank | Risk | How margins break | Mitigation | Evidence |
|---:|---|---|---|---|
| 1 | Unmetered communication | Messages/minutes scale directly and exceed compute cost | Prepaid wallet, delivered-event ledger, category-aware rates, customer-owned WABA | VERIFIED/RECOMMENDED |
| 2 | Dual full snapshots per mutation | Roughly 26–28 DB reads plus large fan-out on every state change | Shared snapshot base, incremental events, short cache | ESTIMATED FROM CODE |
| 3 | Public token/notification abuse | Bots create rows, messages and webhook work | Org+queue+device+IP quotas, CAPTCHA escalation, spend caps | VERIFIED GAP |
| 4 | Same-queue row lock contention | Bursts serialize and increase latency/retries | Atomic per-session sequence and idempotency keys; load-test | VERIFIED FROM CODE |
| 5 | Polling plus WebSockets | Admin pages keep generating queries while real-time is active | Push invalidations, longer intervals, cached rollups | VERIFIED FROM CODE |
| 6 | Unbounded retention | Tokens, audits and raw webhooks permanently grow indexes/backups | Partition, aggregate, archive and delete | VERIFIED GAP |
| 7 | Local backup/export/upload storage | Disk fills; backup I/O competes with production; host loss loses files | Object storage, lifecycle, quotas, restore tests | VERIFIED FROM CODE |
| 8 | Duplicate per-worker schedulers | Scale-out duplicates minute jobs and backups | Dedicated worker/leader lock | VERIFIED FROM CODE |
| 9 | In-process fire-and-forget tasks | Restarts lose notifications; spikes create unbounded coroutines | Durable queue, retries, dead-lettering, concurrency limits | VERIFIED FROM CODE |
| 10 | Missing billing enforcement/observability | Limits are displayed but not consistently enforced; no real cost telemetry | Entitlement service, usage ledger, budgets and alerts | VERIFIED GAP |

The single most dangerous margin destroyer is **absorbing unlimited WhatsApp/SMS/voice — VERIFIED ECONOMIC CONCLUSION**. At **1,000,000 normal token lifecycles — ASSUMPTION**, modeled WhatsApp alone is **₹184,000/month — ESTIMATED**, versus **₹7,000 core marginal infrastructure — ESTIMATED**.

## 12. Optimisation Opportunities

| Priority | Change | Current measured/model state | Optimised target | Saving | Evidence |
|---:|---|---|---|---:|---|
| 1 | Build one shared mutation snapshot | 26–28 snapshot queries/mutation | 13–14 | 45–55% snapshot DB work | ESTIMATED FROM CODE |
| 2 | Replace full lists with counters + deltas | 50–150 KB/event | 2–10 KB typical delta | 80–95% event bandwidth | ESTIMATED |
| 3 | Consolidate snapshot aggregates | 13–14 queries/snapshot | 4–6 | 55–70% snapshot queries | ESTIMATED |
| 4 | Cache dashboard/analytics rollups | 5–18 queries every 12–60 sec/viewer | 1 cached read; refresh on event/1–5 min | 75–95% read load | ESTIMATED |
| 5 | Dedicated durable job worker | Per-worker minute loops and raw async tasks | One scheduler + bounded queue | Prevent duplicates; reliability gain, ₹ saving UNKNOWN | VERIFIED GAP |
| 6 | Add token/session/org composite indexes | Filters scan broader indexes | `(queue_id,session_id,status,token_number)` and org/date indexes | 30–80% latency on target queries | ESTIMATED; verify EXPLAIN |
| 7 | Retention/partitioning | Indefinite hot tokens/audits/webhooks | 90-day hot + aggregates/archive | 60–90% hot-index size over multi-year use | ASSUMPTION |
| 8 | Object-store files/backups | Local disk/manual retention | Compressed object storage + lifecycle | Disk-risk reduction; cost UNKNOWN | RECOMMENDED |
| 9 | Right-size DB pools/workers | Up to 60 app DB connections | Pool budget tied to Postgres RAM and pgbouncer if needed | Avoid memory/connection incidents | VERIFIED/RECOMMENDED |
| 10 | Compress/cache static and API payloads | Nginx/CDN optimization incomplete | Brotli/gzip, immutable assets, CDN where useful | 30–70% transfer on compressible payloads | ESTIMATED |

“Current cost” in this table is primarily work per operation because production invoices and traces are **UNKNOWN — NEEDS INPUT**. Instrument endpoint latency, response bytes, DB query counts, Pub/Sub events, connected sockets and provider spend per tenant before converting these percentages into rupees.

## 13. Pricing Model Comparison

Scores are **1 poor to 5 excellent — ASSUMPTION**.

| Model | Simplicity | Profitability | Scalability | Predictability | Sales ease | Infra-risk control | Expansion revenue | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| A — Per organisation | 5 | 2 | 3 | 5 | 5 | 1 | 2 | Too exposed to heavy users |
| B — Per queue | 4 | 3 | 3 | 4 | 4 | 2 | 3 | Queue count poorly tracks communication |
| C — Per token | 3 | 5 | 5 | 2 | 3 | 5 | Economically clean, less budget-friendly |
| D — Subscription + usage | 4 | 5 | 5 | 4 | 4 | 5 | Strong base model |
| E — Subscription + limits + communication add-ons | 5 | 5 | 5 | 5 | 5 | 5 | Recommended SMB model |
| F — Hybrid enterprise | 3 | 5 | 5 | 4 | 2 | 5 | Recommended for large accounts |

Recommendation: **Model E for self-service and Model F for enterprise — RECOMMENDED**. Tokens are the cost-aligned allowance; branches/queues/staff express product value; communications remain prepaid/pass-through.

## 14. Recommended Pricing

### Free Trial

**14 days; 1 branch; 2 queues; 250 tokens; 3 staff; 30 sessions; 50 WhatsApp utility credits maximum — RECOMMENDED/ASSUMPTION.** No SMS or voice credit. Require verified email and phone; card optional initially. Trial expiry becomes read-only for historical data, but an active queue session may finish.

### Starter — ₹999/month

**1 branch, 3 queues, 1,000 tokens/month, 3 staff, 40 sessions/month, 100 WhatsApp utility credits, QR, live queue, basic analytics — RECOMMENDED/ASSUMPTION.**

### Growth — ₹2,499/month

**3 branches, 10 queues, 5,000 tokens/month, 10 staff, 120 sessions/month, 300 WhatsApp credits, exports, multi-user operations and standard analytics — RECOMMENDED/ASSUMPTION.**

### Business — ₹6,999/month

**10 branches, 30 queues, 20,000 tokens/month, 30 staff, 400 sessions/month, 1,000 WhatsApp credits, advanced analytics and priority support — RECOMMENDED/ASSUMPTION.**

### Enterprise

**Custom, usually ₹25,000–₹75,000+ per month plus onboarding and usage — RECOMMENDED/ASSUMPTION.** Price from committed branches/tokens, peak concurrency, data retention, SSO/integration, SLA, support hours and dedicated infrastructure. Do not promise an enterprise price without production usage evidence.

### Add-ons and overage

- Extra utility WhatsApp: **₹250/1,000 delivered messages — RECOMMENDED/ASSUMPTION**, prepaid; category/country differences re-rated.
- SMS: **provider cost + 25% — RECOMMENDED/ASSUMPTION**, prepaid; no bundled allowance until a provider/DLT contract exists.
- Voice: **₹1.25/billable minute plus number rental — RECOMMENDED/ASSUMPTION**, prepaid.
- Extra token packs: **₹250/1,000 Starter, ₹200/1,000 Growth, ₹150/1,000 Business — RECOMMENDED/ASSUMPTION**.
- Storage/retention beyond standard: quote by retained GB and retention period after object storage is implemented — **RECOMMENDED; price UNKNOWN**.

Overage policy: alert at **80% and 100% — RECOMMENDED/ASSUMPTION**, allow **10% temporary token grace — RECOMMENDED/ASSUMPTION**, never interrupt an active session, then require a prepaid pack or plan change before new joins/sessions. Do not auto-upgrade or create surprise bills for small businesses. Communications stop at wallet exhaustion except safety-critical messages explicitly contracted.

## 15. Unit Economics

Average utilization assumptions: **Starter 600, Growth 3,000, Business 12,000 and Enterprise 60,000 tokens/month — ASSUMPTION**. Included WhatsApp credits are **100, 300, 1,000 and 5,000 — RECOMMENDED/ASSUMPTION**. Support allowance is **8% of revenue — ASSUMPTION**; payment fee is **2.36% — PROVIDER PRICE + TAX ASSUMPTION**; fixed allocation is **₹56.10 — ASSUMPTION**.

| Plan | Revenue | Fixed | Core variable | Included communication | Support | Payment | Total cost | Gross profit | Gross margin | Evidence |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Starter | ₹999 | ₹56 | ₹4 | ₹12 | ₹80 | ₹24 | ₹175 | ₹824 | 82.5% | ESTIMATED/ASSUMPTION |
| Growth | ₹2,499 | ₹56 | ₹21 | ₹35 | ₹200 | ₹59 | ₹370 | ₹2,129 | 85.2% | ESTIMATED/ASSUMPTION |
| Business | ₹6,999 | ₹56 | ₹84 | ₹115 | ₹560 | ₹165 | ₹980 | ₹6,019 | 86.0% | ESTIMATED/ASSUMPTION |
| Enterprise example | ₹50,000 | ₹56 | ₹420 | ₹575 | ₹4,000 | ₹1,180 | ₹6,231 | ₹43,769 | 87.5% | ESTIMATED/ASSUMPTION |

Enterprise margin excludes dedicated hosts, onboarding, SLA and custom engineering; those must be quoted separately. **IMPORTANT ASSUMPTION.**

Example justification for Growth:

```text
Customer pays                         ₹2,499   RECOMMENDED
Fixed infrastructure allocation          ₹56   ASSUMPTION
Database/compute/bandwidth                 ₹21   ESTIMATED
Included WhatsApp                         ₹35   ESTIMATED RATE + ASSUMPTION
Support/operations                        ₹200   ASSUMPTION
Payment processing                         ₹59   PROVIDER PRICE + ASSUMPTION
Total cost                                ₹370   ESTIMATED
Gross profit                            ₹2,129   ESTIMATED
Gross margin                              85.2%  ESTIMATED
```

## 16. Scale Simulation

Mix: **60% Starter, 30% Growth, 9% Business and 1% Enterprise — ASSUMPTION**. Weighted ARPU is **₹2,479.01 — ESTIMATED**; weighted average tokens are **2,940/month — ESTIMATED**; weighted included WhatsApp is **290 messages/month — ESTIMATED**.

| Paying organisations | MRR | Tokens/month | Infra | Communication | Payment | Support | Gross profit | Gross margin | Likely bottleneck | Evidence |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| 100 | ₹247,901 | 294,000 | ₹7,980 | ₹3,335 | ₹5,850 | ₹19,832 | ₹210,903 | 85.1% | DB/snapshots on current host | ESTIMATED/ASSUMPTION |
| 500 | ₹1,239,505 | 1,470,000 | ₹22,800 | ₹16,675 | ₹29,252 | ₹99,160 | ₹1,071,617 | 86.5% | DB HA, jobs, object storage | ESTIMATED/ASSUMPTION |
| 1,000 | ₹2,479,010 | 2,940,000 | ₹45,600 | ₹33,350 | ₹58,505 | ₹198,321 | ₹2,143,235 | 86.5% | Read scaling/partitions/WebSockets | ESTIMATED/ASSUMPTION |
| 5,000 | ₹12,395,050 | 14,700,000 | ₹182,400 | ₹166,750 | ₹292,523 | ₹991,604 | ₹10,761,773 | 86.8% | Regional HA, analytics pipeline | ESTIMATED/ASSUMPTION |
| 10,000 | ₹24,790,100 | 29,400,000 | ₹342,000 | ₹333,500 | ₹585,046 | ₹1,983,208 | ₹21,546,346 | 86.9% | Multi-node DB/data lifecycle | ESTIMATED/ASSUMPTION |

The apparently rising margin comes from fixed-cost leverage and assumes support remains exactly **8% — ASSUMPTION**. It does not prove operational capacity; each scale step requires the architecture in Section 9.

## 17. Break-Even

Approximate paying organisations needed to cover the **₹5,610 base infrastructure — ESTIMATED** after modeled variable communication, payment and support: **Starter 7; Growth 3; Business 1; Enterprise 1 — ESTIMATED/ASSUMPTION**.

| ARPU | ₹1 lakh MRR | ₹5 lakh MRR | ₹10 lakh MRR | ₹25 lakh MRR | ₹50 lakh MRR | Evidence |
|---:|---:|---:|---:|---:|---:|---|
| ₹500 | 200 | 1,000 | 2,000 | 5,000 | 10,000 | ARITHMETIC / ASSUMPTION |
| ₹1,000 | 100 | 500 | 1,000 | 2,500 | 5,000 | ARITHMETIC / ASSUMPTION |
| ₹2,000 | 50 | 250 | 500 | 1,250 | 2,500 | ARITHMETIC / ASSUMPTION |
| ₹5,000 | 20 | 100 | 200 | 500 | 1,000 | ARITHMETIC / ASSUMPTION |
| ₹10,000 | 10 | 50 | 100 | 250 | 500 | ARITHMETIC / ASSUMPTION |

At the modeled mixed ARPU of **₹2,479 — ESTIMATED**, approximately **41 organisations reach ₹1 lakh MRR and 404 reach ₹10 lakh MRR — ESTIMATED**. These are revenue targets, not profit break-even, and exclude churn, sales cost, salaries, tax and receivables.

## 18. HM Leisure Enterprise Model

HM Leisure/Amoeba's actual consumption cannot be recovered from the repository. Branch assignments may exist in a production database, but production data and invoices are unavailable. **UNKNOWN — NEEDS INPUT.** Do not use any historical/manual price as the product's standard.

Collect a **90-day measurement window — RECOMMENDED/ASSUMPTION** with: active branches/queues/staff, tokens by hour/day, peak simultaneous joins, active sockets, sessions, delivered Meta messages by category, voice minutes, export/backup bytes, database/table/index sizes, support hours, requested retention and SLA.

Enterprise monthly cost formula:

```text
dedicated/shared infrastructure allocation
+ tokens / 1,000 × core unit cost
+ delivered communications × provider rate
+ retained storage and backups
+ payment fee
+ support hours × loaded hourly cost
+ SLA/redundancy risk reserve
= enterprise COGS

minimum price = enterprise COGS / (1 - target gross margin)
```

For an illustrative **60,000-token, 5,000-included-message, ₹50,000/month case — ASSUMPTION**, modeled standard COGS is **₹6,231 and gross margin 87.5% — ESTIMATED** before dedicated infrastructure/custom work. A reasonable initial range is **₹25,000–₹75,000+ monthly — RECOMMENDED/ASSUMPTION**, plus **₹25,000–₹2,00,000 onboarding — RECOMMENDED/ASSUMPTION** depending on integrations, migration and training. A dedicated HA environment/SLA should be passed through with margin, not absorbed.

## 19. Internal Cost Calculator

The accompanying workbook implements editable assumptions, plan unit economics, scale simulation, volume costs, MRR targets and source mapping.

Required inputs:

- Organisations, branches, queues, active sessions, staff and monthly tokens — **INPUT**.
- Peak joins/second, concurrent viewers/sockets and dashboard refresh rate — **INPUT**.
- API requests/token, DB KB/token, backup multiplier and bandwidth MB/token — **ESTIMATED INPUT**.
- Delivered WhatsApp by market/category, SMS segments, voice billable minutes and phone numbers — **PROVIDER INPUT**.
- Hosting, database, Redis, storage, backup, email, monitoring and domain fixed fees — **INVOICE INPUT**.
- Plan mix, ARPU, payment fee, support allowance and target gross margin — **BUSINESS INPUT**.

Exact formulas:

```text
tokens = organisations × average_tokens_per_org
api_requests = tokens × api_requests_per_token
live_db_GB = tokens × DB_KB_per_token / 1,048,576
stored_db_GB = live_db_GB × (1 + backup_multiplier)
bandwidth_GB = tokens × bandwidth_MB_per_token / 1,024

whatsapp_cost = Σ(delivered_messages_by_category_market × current_rate)
sms_cost = billable_segments × route_rate
voice_cost = billable_minutes × sum_of_billed_leg_rates + number_rental

infra_cost = step_function(organisations, peak_load, retained_data)
payment_cost = revenue × payment_rate
support_cost = revenue × support_allowance_rate
total_COGS = infra + communications + storage + payment + support
gross_profit = revenue - total_COGS
gross_margin = gross_profit / revenue
required_price = non_percentage_COGS / (1 - target_margin - payment_rate - support_rate)
```

Guardrails: rate-card effective dates, currency, tax, minimum commitments and confidence label must be stored with every cost input. **RECOMMENDED.** Compare estimates to provider invoices monthly and alert on tenant contribution margin below **70% — RECOMMENDED/ASSUMPTION**.

## 20. Product Changes Required

### Commercial data model

Add `plans`, `plan_entitlements`, `subscriptions`, `usage_ledger`, `usage_counters`, `communication_wallets`, `provider_rate_cards`, `invoices`, `payments`, `billing_events` and `webhook_idempotency` tables. **RECOMMENDED.** Store entitlement versions and billing-period boundaries; never infer historical billing from current plan values.

Enforce `max_branches`, `max_queues`, `max_staff`, `max_sessions`, `max_tokens`, storage, exports, sockets and communication spend in one backend entitlement service. Several limits exist as organisation fields but are not consistently enforced. **VERIFIED GAP FROM CODE.** Enforcement must be atomic with token/queue/session creation to avoid concurrent overrun.

### Trial and subscription lifecycle

Add trial start/end, plan, status (`trialing`, `active`, `past_due`, `grace`, `suspended`, `cancelled`), billing period, gateway customer/subscription IDs and read-only expiry behavior. **RECOMMENDED.** Add signed/idempotent payment webhooks and a reconciliation job. No gateway is currently implemented. **VERIFIED GAP FROM CODE.**

### Usage and customer UX

Record immutable usage events for token-created, message-delivered, SMS segment, voice minute, storage byte-day and export. Roll them into tenant/day counters. **RECOMMENDED.** Show current period, allowance, wallet, forecast and alerts in the dashboard. Add upgrade/top-up flows and admin adjustments with audit trails.

### Reliability, security and privacy

Move notifications/backups/exports/auto-session work to a durable worker with leader election, idempotency, bounded retries and dead-lettering. **RECOMMENDED.** Add multi-dimensional rate limits, signed QR/idempotency keys, bot challenges after risk thresholds, per-tenant spend ceilings and global circuit breakers. Remove PII from the public token response; it currently exposes customer fields despite a comment claiming otherwise. **VERIFIED FROM CODE.**

Add off-site encrypted backups, restore tests, object storage, lifecycle policies, partitioning/retention, secrets rotation, database metrics, error monitoring, cost dashboards and load tests. **RECOMMENDED.** Remove production `--reload`; set explicit worker/pool budgets. **VERIFIED CONFIG GAP.**

## 21. PRIORITY ROADMAP

### P0 — Must do before public launch

1. **VERIFIED GAP:** Implement subscription/trial state and backend-enforced entitlements for branches, queues, staff, sessions and tokens.
2. **VERIFIED GAP:** Create an immutable usage ledger and atomic counters; meter provider delivery callbacks, not send attempts.
3. **VERIFIED GAP:** Add prepaid communication wallets/spend caps; never offer unlimited WhatsApp, SMS or voice.
4. **VERIFIED GAP:** Add payment gateway, signed/idempotent webhooks, invoices and reconciliation.
5. **VERIFIED GAP:** Move background work to a durable single scheduler/worker; eliminate duplicated per-worker jobs.
6. **VERIFIED GAP:** Implement off-site encrypted backup and test restore; add disk alerts.
7. **VERIFIED GAP:** Apply global and tenant-aware abuse controls; protect public joins without penalizing venue NATs.
8. **VERIFIED GAP:** Fix WhatsApp template-version mismatch and remove public token PII.
9. **UNKNOWN — NEEDS INPUT:** Run production-like load tests and capture actual provider/host invoices before publishing capacity promises.

### P1 — Needed soon

1. Consolidate/cached queue snapshots and send WebSocket deltas. **RECOMMENDED.**
2. Replace dashboard polling with event invalidation or cached rollups. **RECOMMENDED.**
3. Add composite token/audit/webhook indexes validated with `EXPLAIN ANALYZE`. **RECOMMENDED.**
4. Implement retention, daily aggregates, partitions and customer data deletion/export. **RECOMMENDED.**
5. Ship customer usage, allowance, wallet and alert UI. **RECOMMENDED.**
6. Build endpoint/tenant cost telemetry and contribution-margin reports. **RECOMMENDED.**

### P2 — Scale optimisation

1. Separate app, worker and database tiers; add pgbouncer/managed PostgreSQL when measured limits require it. **RECOMMENDED.**
2. Use object storage/CDN, HA Redis and replicated/managed database. **RECOMMENDED.**
3. Precompute analytics; archive cold tenant history. **RECOMMENDED.**
4. Horizontal WebSocket routing and autoscaling based on connections/mutations. **RECOMMENDED.**

### P3 — Future

1. Enterprise SSO, regional residency, custom retention and formal SLA. **RECOMMENDED.**
2. Customer-owned provider accounts and automated category/country rate synchronization. **RECOMMENDED.**
3. Forecasting/anomaly detection for queue demand and tenant margins. **RECOMMENDED.**

### Final business answers

1. **Normal customer cost:** about **₹588/month before payment fee — ESTIMATED/ASSUMPTION**, including normal WhatsApp and support; technical-only cost is about **₹438 before support — ESTIMATED**.
2. **High-usage customer cost:** about **₹4,376/month before payment fee — ESTIMATED/ASSUMPTION** at **20,000 tokens — ASSUMPTION**.
3. **Biggest variable cost:** delivered communications, especially WhatsApp/SMS/voice — **VERIFIED ECONOMIC CONCLUSION**.
4. **Current infrastructure support:** plan conservatively for **50–100 normal organisations — ESTIMATED**, pending load tests.
5. **When to scale:** before sustained queue mutation exceeds roughly **3–5/sec**, active sockets exceed roughly **50–150**, or monthly tokens exceed roughly **100,000–200,000 — ESTIMATED**; actual telemetry must decide.
6. **Customers before infrastructure scale:** approximately **50–100 normal organisations — ESTIMATED**.
7. **Free Trial:** **14 days, 1 branch, 2 queues, 250 tokens, 3 staff, 30 sessions and at most 50 WhatsApp credits — RECOMMENDED/ASSUMPTION**.
8. **What to limit:** tokens, branches, queues, staff, sessions, storage, exports, sockets/API rate and support scope — **RECOMMENDED**.
9. **Never unlimited:** WhatsApp, SMS, voice, tokens, storage, backups/exports, sockets/API and contractual support/SLA — **RECOMMENDED**.
10. **Pricing basis:** hybrid subscription with token/queue/branch/staff limits and separate communications — **RECOMMENDED**.
11. **WhatsApp price:** customer-owned WABA or **₹250/1,000 delivered utility messages — RECOMMENDED/ASSUMPTION**, with other categories re-rated.
12. **SMS price:** prepaid provider cost plus **25% — RECOMMENDED/ASSUMPTION**; fixed India price is **UNKNOWN — NEEDS INPUT**.
13. **Voice price:** **₹1.25/billable minute plus number rental — RECOMMENDED/ASSUMPTION**.
14. **Starter:** **₹999/month — RECOMMENDED/ASSUMPTION** because average modeled cost is **₹175 and margin 82.5% — ESTIMATED**.
15. **Growth:** **₹2,499/month — RECOMMENDED/ASSUMPTION** because average modeled cost is **₹370 and margin 85.2% — ESTIMATED**.
16. **Business:** **₹6,999/month — RECOMMENDED/ASSUMPTION** because average modeled cost is **₹980 and margin 86.0% — ESTIMATED**.
17. **Enterprise:** cost-plus floor plus value/complexity premium, normally **₹25,000–₹75,000+ monthly — RECOMMENDED/ASSUMPTION**, with usage, onboarding and dedicated infrastructure separate.
18. **Expected gross margin:** approximately **82–87% — ESTIMATED** at modeled average use; monitor a minimum **70% tenant contribution margin — RECOMMENDED/ASSUMPTION**.
19. **Paying customers for ₹1 lakh MRR:** **41 at modeled ₹2,479 ARPU — ESTIMATED**, or **100 at ₹1,000 ARPU — ARITHMETIC**.
20. **Paying customers for ₹10 lakh MRR:** **404 at modeled ₹2,479 ARPU — ESTIMATED**, or **1,000 at ₹1,000 ARPU — ARITHMETIC**.
21. **Before self-service trials:** entitlement enforcement, trial/subscription state, usage ledger, payments, communication wallets, abuse controls, durable jobs, backups, retention and observability — **VERIFIED GAPS/RECOMMENDED**.
22. **Biggest thing not to build yet:** do not add more communication channels or promise “unlimited” enterprise functionality before usage metering, reliability and per-tenant margins are observable — **RECOMMENDED**.

The pricing simulator is the operating model. Replace every yellow/blue assumption with invoices and production measurements, then re-run margins before launch and monthly thereafter.
