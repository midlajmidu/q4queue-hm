# Q4Queue Self-Service SaaS — Production Readiness Prompt and Audit

## Reusable deep-audit prompt

Act as a principal SaaS architect, application-security engineer, SRE, database architect, QA lead, and B2B SaaS operations owner. Inspect the complete Q4Queue repository and running Docker environment before reaching conclusions.

Audit the entire self-service lifecycle:

1. Landing page to signup, email OTP verification, atomic Parent Organisation + first Branch + Branch Admin provisioning, and direct Branch Portal entry.
2. Trial plan creation, entitlement storage, usage accounting, concurrency enforcement, trial expiry, stale-token behavior, data preservation, and later activation.
3. Contact Sales from an active trial and expired login, abuse resistance, request deduplication, email delivery, retries, and customer-visible failure states.
4. Super Admin customer creation, Parent Organisation and Branch assignment, Parent Admin and Branch Admin creation, customer archive/restore/permanent deletion, trial extension, activation, custom limits, and audit history.
5. Legacy safety: prove that organisations without managed subscriptions continue to behave as before.
6. Security: authentication, authorization, tenant isolation, credential exposure, unsafe maintenance routes, OTP storage/attempts, rate limits, secrets, WebSocket authentication, and personally identifiable information.
7. Data integrity: migrations, foreign keys, uniqueness, transactional boundaries, concurrent requests, idempotency, lifecycle state transitions, and Alembic/model drift.
8. Reliability: SMTP failures, durable delivery, scheduler duplication, multi-worker behavior, shutdown handling, Redis/database outages, retries, backups, logs, monitoring, and alerting.
9. Frontend quality: responsive layout, accessibility, loading/empty/error states, confirmation for destructive actions, pagination, accurate limits, trial countdown, expiry messaging, and upgrade/contact-sales clarity.
10. Deployment: production builds, migrations, health checks, Docker command, service health, test data cleanup, and rollback risk.

Do not accept previous audit claims as true. Label findings as VERIFIED, TESTED, INFERRED, or UNKNOWN. Fix verified P0/P1 defects that are within scope and do not add payments, pricing, WhatsApp billing, or redesign the queue engine. Preserve unrelated user changes.

Run at minimum:

- Python compilation.
- TypeScript type checking and targeted ESLint.
- Alembic upgrade and schema-drift check.
- Production frontend/backend image builds.
- Disposable database-backed tests for signup, expiry, credential-protected sales contact, email-routing behavior, deduplication, sales lifecycle transitions, activation, and cleanup.
- Live HTTP checks through Nginx and post-restart log inspection.

Score the result out of 100 using this rubric:

| Category | Weight |
| --- | ---: |
| Security and tenant isolation | 25 |
| Trial/entitlement correctness | 15 |
| Data integrity and migrations | 15 |
| Sales and Super Admin operations | 15 |
| Frontend UX and accessibility | 10 |
| Reliability and observability | 10 |
| Automated testing and deployment safety | 10 |

For every deducted point, state the concrete reason and the production impact. End with: current score, launch recommendation, P0 before launch, P1 soon after launch, and evidence from executed validation.

## Audit result — 8 September 2026

### Final score: 84/100

| Category | Score | Evidence |
| --- | ---: | --- |
| Security and tenant isolation | 21/25 | Removed an unauthenticated cross-tenant token mutation route; expired sales contact now requires valid account credentials; expired managed subscriptions are checked on every normal protected request. |
| Trial/entitlement correctness | 14/15 | Database-backed limits, locked usage consumption, expired-login denial, stale-token denial, and activation preserving data were exercised successfully. “One staff/user” still needs a product definition. |
| Data integrity and migrations | 15/15 | Migrations are at `z014_sales_integrity`; Alembic reports no schema/model drift; one-open-request uniqueness and safe lifecycle transitions are enforced. |
| Sales and Super Admin operations | 14/15 | Separate paginated inbox, multiple recipients, delivery state, retry, audit events, contacted-to-approved workflow, and preserved customer data are implemented. |
| Frontend UX and accessibility | 9/10 | Dedicated responsive UI, clear states, confirmation, status badges, limits, OTP flow, and paging exist. Terms and Privacy text still needs real linked/versioned documents. |
| Reliability and observability | 6/10 | Delivery failures are visible/retryable and scheduler duplication is prevented. Email is not yet backed by a durable job/outbox system, and backups/uploads remain local-volume dependent. |
| Automated testing and deployment safety | 5/10 | Production builds, database smoke tests, live routes, schema checks, and service health passed. The repository test suite is not installed in the production image and lacks committed regression tests for the new lifecycle. |

### Production blockers fixed during this audit

- Removed the unauthenticated `/auth/fix-tokens` endpoint that could mutate token data across tenants.
- Removed fixed Super Admin credentials and password logging from bootstrap. A fresh installation now requires explicit `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` values, with a 14-character minimum.
- Enforced subscription status on protected requests, including calling and Plivo token routes, so a JWT issued before trial expiry cannot continue normal operation.
- Required the correct account password before an expired-login visitor can submit a sales request.
- Added five-minute per-request email-notification suppression to prevent repeated clicks from spamming the sales team.
- Added email delivery state (`sent`, `partial`, `failed`, or `not_configured`) and a Super Admin retry action.
- Added pagination and validated status filters for the sales inbox.
- Added audit events for sales-recipient additions, removals, and notification retries.
- Fixed the sales state machine so a contacted lead can later be approved or rejected, while approved/rejected states are terminal.
- Added database protection against concurrent duplicate pending sales requests.
- Aligned SQLAlchemy metadata with PostgreSQL and included audit metadata in Alembic drift detection.
- Removed Gunicorn hot reload from Docker and added Redis per-minute scheduler leadership so two web workers cannot run automatic sessions/backups twice.
- Added graceful cancellation of scheduler tasks during shutdown.

### Remaining P0 before an unrestricted public launch

1. Rotate the existing Super Admin password before production. The insecure bootstrap source is removed, but automatically changing an existing administrator credential would lock out the owner and was intentionally not attempted.
2. Replace JWTs in WebSocket query strings. They currently risk appearing in proxy/access logs; use a secure cookie or short-lived one-purpose WebSocket ticket.
3. Move internal sales email sending to a durable outbox/worker with retry policy and alerting. The database request is safe, but a process crash can still lose the immediate email alert.
4. Move backups, exports, and uploads from local Docker volumes to encrypted object storage with tested off-host restore procedures.
5. Commit automated integration tests for trial limits, expiry, Contact Sales, approval, legacy compatibility, and concurrent usage enforcement, and run them in CI.

### P1

- Persist email verification time, accepted Terms/Privacy version, acceptance time, and signup IP for compliance evidence.
- Harden the older forgot-password OTP flow with hashed OTPs, bounded attempts, cooldown, generic account-discovery responses, and delivery-failure handling.
- Add metrics and alerts for trial signups, expirations, limit denials, pending sales requests, SMTP failures, approval latency, and scheduler failures.
- Decide whether “1 staff/user” means one administrator total or one additional staff member; the current behavior is one Branch Admin plus one Staff account.
- Add a configurable retention policy for expired trials and a documented deletion/export process.

### Executed evidence

- Python compilation: passed.
- TypeScript check: passed.
- Targeted ESLint: passed.
- Next.js optimized production build: passed; `/signup` and `/super-admin/sales-requests` were generated.
- Alembic: `z014_sales_integrity (head)`.
- Alembic schema drift: no new upgrade operations detected.
- Database-backed hostile-path test: expired access blocked; invalid sales credentials ignored; delivery tracked; repeat notification suppressed; pagination verified; cleanup passed.
- Lifecycle test: pending to contacted to approved passed; access restored after approval; duplicate approval blocked; cleanup passed.
- Live routes: health `200`, signup `200`, Sales Requests `200`, removed unsafe endpoint `404`.
- Multi-worker scheduler log: two workers started, but only one scheduler execution occurred per minute.
- Disposable test customer/recipient rows remaining: zero.
- SMTP configuration completeness: verified without exposing secrets.
- Active sales notification recipients: one.
- The currently running local stack identifies itself as `development`; the score evaluates implementation readiness, not a completed production deployment.

### Launch recommendation

The self-service trial and Super Admin commercial workflow are suitable for a controlled beta with real customers. Do not call the whole platform fully production-ready for an unrestricted public launch until the four remaining P0 items are closed.
