# Q4Queue — Production Cost Validation

## Known vs unknown matrix

The evidence date is **2026-09-06**. “Local” means the Docker stack running in this workspace; it must not be treated as the production host. All prior audit estimates remain **PROVISIONAL** until the production evidence below is collected.

| Metric | Current value | Source | Confidence | How to verify |
|---|---|---|---|---|
| Production server cost | **UNKNOWN.** The previous ₹4,560/month value is a market benchmark, not an invoice. | No provider invoice or billing export exists in the repository. | None for actual production cost. | Export the latest 3 monthly server invoices with plan, region, tax, backups, IP and transfer overages. |
| CPU | Root Compose container limits total **5.0 vCPU**. The deployment guide specifies **4 vCPU minimum**. This is oversubscribed by configuration and is not the host's measured capacity. | `docker-compose.yml`, `production/docker-compose.yml`, deployment guide. | High for configuration; none for production utilization. | Run the collector during idle and peak periods. Export 30 days of provider CPU average, p95, peak, steal and load average. |
| RAM | Root Compose limits total **2,432 MiB**. Alternate production Compose limits total **3,200 MiB**. Local observed container use was about **531 MiB** at one low-load snapshot. | Compose files and local `docker stats`. | High locally; none for production peak. | Export 30 days of host/container memory, p95/peak, swap, OOM kills and PostgreSQL working-set behavior. |
| Disk | Deployment guide says **50 GB minimum / 100+ GB recommended**. Local PostgreSQL data directory is **49,988,834 bytes** and local backups are **242,110,835 bytes**. | Deployment guide; read-only local container/filesystem measurements. | High locally; none for production. | Capture `df`, Docker volume use, database bytes, WAL, upload/export/log directories and backup destinations on production. |
| Bandwidth | **UNKNOWN.** Local container counters cover only the current local uptime and double-count internal Docker traffic. | Local `docker stats`; no production transfer report. | None for monthly production bandwidth. | Export provider/CDN ingress, egress and peak Mbps for 30 and 90 days. Measure WebSocket bytes per mutation and connected viewers. |
| PostgreSQL size | Local database is **9,567,591 bytes**; local data directory is **49,988,834 bytes**. The latest retained full dump is **74,103 bytes** and contains a historical small dataset. | Read-only local PostgreSQL queries, filesystem and `pg_restore` metadata. | High for local artifacts; none for current production. | Run `pg_database_size`, `pg_total_relation_size`, row/dead-row statistics and index-size queries on production. Record monthly growth. |
| Redis memory | Local used memory **1.33 MiB**, RSS **8.00 MiB**, configured max **128 MiB**, **5** clients, **0** evictions at the observed instant. | Local `redis-cli INFO memory/stats/clients`. | High locally; none for production peak. | Capture idle and peak production `INFO` output, Pub/Sub clients, operations/sec, evictions, rejected connections and network bytes. |
| Monthly tokens | Current local DB: **0**. Latest retained full dump: **32 tokens in 2026-06**. Latest branch backup: **6 tokens in 2026-08 and 1 in 2026-09**. These artifacts do not establish current total production volume. | Exact aggregate counts from the local DB and retained backup files; no customer data printed. | High for artifacts; low production relevance. | Query production tokens by organisation, queue, session, status and billing month for the latest 12 complete months. |

## What is now measured

The following values replace uncertainty only for the current local stack:

| Observation | Measured value | Interpretation |
|---|---:|---|
| Backend memory | 327 MiB | Idle/light local snapshot; not capacity evidence. |
| Frontend memory | 105 MiB | Idle/light local snapshot. |
| PostgreSQL memory | 72 MiB | Empty local transactional database. |
| Redis container memory | 14 MiB | Redis logical used memory is only 1.33 MiB. |
| Nginx memory | 14 MiB | Idle/light local snapshot. |
| PostgreSQL connections | 9 of configured maximum 100 | Local application footprint; production concurrency unknown. |
| Local database rows | 1 organisation, 0 queues, 0 sessions and 0 tokens | Confirms this is not a usable production workload sample. |
| Retained backups | 155 files totaling 242,110,835 bytes | 144 full dumps plus 11 branch backups; retention behavior is measurable locally. |

No production unit cost can yet be calculated responsibly from these local readings. The sample has no live queue traffic, while host price and external provider invoices are missing.

## Production evidence required

Collect one evidence pack with aligned dates:

1. Host invoices for the latest 3 months and monitoring exports for at least 30 days.
2. Production SQL aggregates for the latest 12 complete months.
3. Meta WABA Insights and invoices for at least 90 days, broken down by market, category, delivered/failed status and organisation.
4. Plivo usage and invoice exports for at least 90 days, including both call legs, billed duration, number rental, failed calls and tax.
5. Payment-gateway settlements/fees, email invoice, domain invoice and any backup/object-storage invoice.
6. Support time by organisation for at least 8 representative weeks.
7. A controlled load test reporting requests/sec, queue mutations/sec, active WebSockets, p50/p95/p99 latency, errors, DB CPU/IOPS/connections and network bytes.

## Safe collection method

Run the read-only collector from the deployed Q4Queue Compose directory:

```bash
./tools/q4queue-audit/collect_production_metrics.sh > q4queue-production-metrics.txt
```

The script prints aggregate operational metrics and does not select customer names, phone numbers or message bodies. Review the output before sharing because it includes the host name and internal organisation identifiers in per-organisation aggregate lines.

## Effect on the previous financial model

The previous prices and margins are still scenarios, not actual unit economics. The workbook now marks the model **PROVISIONAL** and includes a `Production Validation` sheet ahead of the assumptions and pricing calculations.

Do not approve plan prices until these inputs have actual values:

| Financial driver | Required actual | Calculation unlocked |
|---|---|---|
| Monthly fixed infrastructure | Invoices excluding recoverable tax | True fixed cost per active paying organisation. |
| Token volume by tenant/month | Production SQL export | Actual infrastructure and communication intensity per tenant. |
| Database/backup monthly growth | Repeated byte measurements | Storage cost per 1,000 tokens and retention cost. |
| API/WebSocket traffic and response bytes | APM/proxy metrics | Compute and bandwidth per token lifecycle. |
| Delivered WhatsApp by category | Meta export/invoice | Actual WhatsApp cost per token and per tenant. |
| Voice billed minutes/legs | Plivo export/invoice | Actual cost per call and minute. |
| Support hours | Time tracking | Fully loaded support COGS per plan. |
| Payment fees | Gateway statement | Net realized gross margin. |

## Actual-cost formulas

Once the evidence periods align:

```text
fixed_infrastructure_per_org
= actual_monthly_fixed_infrastructure / active_paying_organisations

core_variable_cost_per_1,000_tokens
= (incremental_compute + database + storage + bandwidth + backup cost) / tokens × 1,000

communication_cost_per_token
= (Meta invoice + SMS invoice + Plivo variable invoice) / tokens

true_customer_COGS
= fixed allocation
 + core variable usage
 + communication usage
 + payment fees
 + allocated support/operations

gross_margin
= (recognized revenue - true_customer_COGS) / recognized revenue
```

Use invoice cost net of recoverable input tax for accounting gross margin, while also modeling cash paid including tax. Accounting treatment is **UNKNOWN — REQUIRES FOUNDER/ACCOUNTANT INPUT**.

## Immediate conclusions

- The previous **₹4,560 server cost**, **₹7 core cost per 1,000 tokens**, **10 KB/token**, **1 MB/token**, **1.6 WhatsApp messages/token** and all capacity thresholds remain **PROVISIONAL**.
- The Compose CPU limits exceed the deployment guide's minimum host CPU, so the containers can contend even when every individual limit looks valid.
- The local runtime is useful for validating the collection process but is too empty to validate performance or customer unit economics.
- Backup proliferation is observable: 155 local files occupy more space than the live local PostgreSQL data directory. Production retention and off-site durability still require verification.
- Communication pricing cannot be converted to true customer cost until delivered message categories and billed voice legs are matched to provider invoices.

The next financially meaningful step is to run the collector on the production host and import the provider exports. Until then, retain the recommended plans only as test prices and do not publish “unlimited” communication or capacity commitments.
