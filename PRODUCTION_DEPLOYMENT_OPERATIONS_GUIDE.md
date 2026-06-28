# Q4Queue Production Deployment & Operations Manual

This document is the official deployment and operations manual for Q4Queue. It covers the entire lifecycle from receiving a fresh Ubuntu server to handing over a fully working, secure, and performant system to the customer.

**Target Audience:** DevOps Engineers, System Administrators, and Deployment Specialists.

> [!IMPORTANT]
> Read this entire guide before beginning your first deployment. Do not skip verification steps.

---

## Section 1: Introduction

### What Q4Queue is
Q4Queue is an enterprise-grade, multi-tenant queue management system designed for high availability and real-time operations across multiple branches and organizations. 

### Overall Architecture
The system consists of:
- **Frontend**: Next.js 14+ application serving all dashboards, tracking pages, and display screens.
- **Backend**: FastAPI (Python) driving the REST and WebSocket APIs.
- **Database**: PostgreSQL for relational data and tenant isolation.
- **Cache & Pub/Sub**: Redis for WebSocket broadcasting and temporary state.

### Multi-Tenant Architecture
Q4Queue follows a strict hierarchical multi-tenant structure, enforced via JWT claims and Row-Level Security (RLS) patterns.

```mermaid
graph TD
    SA[Super Admin] --> |Manages| PO
    PO[Parent Organization] --> |Contains| BR
    BR[Branch] --> |Administered by| AD
    AD[Admin] --> |Manages| ST
    ST[Staff] --> |Serves| CU
    CU[Customer] --> |Joins| Q
    BR --> |Hosts| Q[Queue]
```

✅ **Verification Checklist**
- [ ] Understand the role boundaries between Super Admin and Branch Admin.

⚠ **Common Mistakes**
- Logging into a Branch with a Super Admin account. Always use the correct login portal.

💡 **Best Practices**
- Keep the Super Admin portal completely isolated and inaccessible from public domains if possible.

---

## Section 2: Server Requirements

### Hardware Requirements
| Resource | Minimum | Recommended (Multi-branch / High-traffic) |
| :--- | :--- | :--- |
| **OS** | Ubuntu 22.04 LTS (64-bit) | Ubuntu 24.04 LTS (64-bit) |
| **CPU** | 4 vCPUs | 8 vCPUs |
| **RAM** | 8 GB RAM | 16 GB RAM |
| **Disk** | 50 GB SSD | 100+ GB NVMe SSD (for backup retention) |
| **Network**| 1 Gbps connection | 1 Gbps connection |

### Network & Infrastructure Requirements
- **Internet**: Outbound access required for updates, WhatsApp Webhooks, and NTP.
- **Static Public IP**: Required for reliable DNS A-record mapping.
- **Firewall**: Open ports 80 (HTTP), 443 (HTTPS), and 22 (SSH only for authorized IPs).
- **Timezone & NTP**: Crucial for token generation and queue analytics. UTC is strictly required.

✅ **Verification Checklist**
- [ ] Server has a static public IP.
- [ ] `date` command confirms UTC timezone.

⚠ **Common Mistakes**
- Using a dynamic IP which breaks the WhatsApp webhook when the IP changes.

💡 **Best Practices**
- Restrict SSH (port 22) to specific office IPs or a VPN.

---

## Section 3: Pre-Deployment Checklist

Gather the following information **before** starting any deployment:

### Customer Information
- [ ] Customer Name
- [ ] Customer Contact Name & Email
- [ ] Customer Domain / Branding requirements

### Infrastructure
- [ ] Server IP (Static Public IP)
- [ ] SSH Username & Key (Avoid password auth)
- [ ] Subdomain Assignment (e.g., `ameoba.q4queue.com`)
- [ ] DNS Access (Cloudflare / Route53 / etc.)
- [ ] SSL Administrator Email (for Let's Encrypt)

### Meta & WhatsApp Integration
- [ ] Meta Business Access (Admin)
- [ ] WhatsApp Number to be used
- [ ] Phone Number ID
- [ ] WhatsApp Business Account ID
- [ ] Permanent Access Token
- [ ] Webhook Verify Token (Custom generated)

### Optional Integrations
- [ ] Google Drive Account (for cloud backups)

✅ **Verification Checklist**
- [ ] All checklist items are stored securely in a password manager.

⚠ **Common Mistakes**
- Starting deployment without the WhatsApp Permanent Access Token, leading to stalled handovers.

💡 **Best Practices**
- Generate the Verify Token as a secure random 32-character string before starting.

---

## Section 4: Fresh Ubuntu Server Setup

Follow these exact steps on a fresh Ubuntu server.

### 1. Update Ubuntu
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban unattended-upgrades
```

### 2. Create Deployment User
```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
```

### 3. SSH Security
Copy your SSH key to the deploy user. Disable root login and password authentication in `/etc/ssh/sshd_config`:
```text
PermitRootLogin no
PasswordAuthentication no
```
Restart SSH: `sudo systemctl restart ssh`

### 4. Firewall Configuration
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 5. Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy
```
*(Log out and log back in as `deploy`)*

### 6. Set Timezone to UTC
```bash
sudo timedatectl set-timezone UTC
sudo apt install ntp -y
```

✅ **Verification Checklist**
- [ ] `docker compose version` returns successfully.
- [ ] `sudo ufw status` shows 22, 80, 443 open.

⚠ **Common Mistakes**
- Forgetting to add the `deploy` user to the `docker` group, causing permission denied errors later.

💡 **Best Practices**
- Configure `fail2ban` out-of-the-box to protect SSH from brute-force attacks.

---

## Section 5: Project Deployment

### 1. Clone Repository
```bash
cd /opt
sudo mkdir qrq
sudo chown deploy:deploy qrq
git clone https://github.com/midlajmidu/qrq.git /opt/qrq
cd /opt/qrq
git checkout develop
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill it out (See Section 6).

### 3. Docker Build & Up
```bash
docker compose build
docker compose up -d
```

### 4. Run Migrations & Seed Data
```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python app/scripts/seed_super_admin.py
```

✅ **Verification Checklist**
- [ ] `docker compose ps` shows frontend, backend, postgres, and redis as `Up`.
- [ ] Logs show no crash loops: `docker compose logs -f`

⚠ **Common Mistakes**
- Running migrations before the database container is fully healthy.

💡 **Best Practices**
- If deployment fails, bring containers down `docker compose down -v`, fix `.env`, and start over.

---

## Section 6: Environment Variables

Never commit the `.env` file to version control. Below is the complete guide for `.env`.

### Core URLs
- `FRONTEND_URL`: The URL customers visit (e.g., `https://ameoba.q4queue.com`). Required.
- `BACKEND_URL`: The API URL (e.g., `https://api.ameoba.q4queue.com`). Required.
- `API_BASE_URL`: Same as BACKEND_URL. Used by frontend SSR. Required.
- `CORS_ORIGINS`: Comma separated list of allowed origins (e.g., `https://ameoba.q4queue.com`). Required.

### Database & Cache
- `DATABASE_URL`: `postgresql+asyncpg://postgres:securepassword@postgres:5432/qrq`. Secret. Required.
- `REDIS_URL`: `redis://redis:6379/0`. Required.

### Security
- `SECRET_KEY`: A 64-character random string. Secret. Required. Changes invalidate all sessions.
- `JWT_SECRET`: Same as SECRET_KEY. Used by JS/Frontend. Secret. Required.

### WhatsApp Integration
- `WHATSAPP_PHONE_NUMBER_ID`: From Meta dashboard. Customer specific. Required for messaging.
- `WHATSAPP_BUSINESS_ACCOUNT_ID`: From Meta dashboard. Customer specific.
- `WHATSAPP_TOKEN`: Permanent access token. Secret. Required.
- `WHATSAPP_VERIFY_TOKEN`: Arbitrary secure string for webhook validation. Secret. Required.

✅ **Verification Checklist**
- [ ] Securely backup the `.env` file offline or in a secure secret manager.

⚠ **Common Mistakes**
- Using trailing slashes in URLs (e.g., `https://ameoba.q4queue.com/`). Remove trailing slashes!

💡 **Best Practices**
- If `.env` is lost, immediately rotate `SECRET_KEY` and WhatsApp tokens, as compromised keys can lead to complete system takeover.

---

## Section 7: Customer Domain Configuration

We **DO NOT** use customer-owned domains directly. Every customer receives a subdomain of `q4queue.com`.
Example: `ameoba.q4queue.com`

### 1. DNS Configuration
In Cloudflare or your DNS provider:
- A Record for `ameoba.q4queue.com` pointing to the Server's Static IP.
- A Record for `api.ameoba.q4queue.com` pointing to the Server's Static IP.

### 2. Reverse Proxy & SSL (Nginx / Caddy / Traefik)
Using Nginx + Certbot:
```bash
sudo apt install nginx python3-certbot-nginx
```
Create configurations for both the frontend (port 3000) and backend (port 8000). Ensure WebSocket upgrade headers are passed for the backend.

```bash
sudo certbot --nginx -d ameoba.q4queue.com -d api.ameoba.q4queue.com
```

✅ **Verification Checklist**
- [ ] Visit `https://ameoba.q4queue.com` in a browser. It must load securely with a valid certificate.
- [ ] Visit `https://api.ameoba.q4queue.com/api/v1/health` and verify it returns 200 OK.

⚠ **Common Mistakes**
- Forgetting to configure WebSocket proxy headers for the backend, breaking the live display screens.

💡 **Best Practices**
- Enable automatic renewal for Let's Encrypt certificates via cron.

---

## Section 8: WhatsApp Production Configuration

WhatsApp is critical for tracking.

### 1. Meta Business Configuration
1. Go to developers.facebook.com.
2. Select the App.
3. Add the WhatsApp product.
4. Bind the customer's Phone Number.

### 2. Webhook Setup
Whenever the customer subdomain changes, you MUST update the webhook URL in Meta.
- **Callback URL**: `https://api.ameoba.q4queue.com/api/v1/webhooks/whatsapp`
- **Verify Token**: The exact string placed in `WHATSAPP_VERIFY_TOKEN` in the `.env` file.

Subscribe to the `messages` field.

### 3. Link Verification
Ensure that WhatsApp templates dynamically construct links using the `FRONTEND_URL` from the environment.
Example of sent link: `https://ameoba.q4queue.com/track/tk_123abc`

✅ **Verification Checklist**
- [ ] Webhook validation succeeds in the Meta Dashboard.
- [ ] Test message is successfully delivered to a test device.

⚠ **Common Mistakes**
- Hardcoding `localhost` or development URLs in templates or backend logic.

💡 **Best Practices**
- Monitor the WhatsApp Quality Rating. If it drops to "Low", tracking links might be blocked by Meta.

---

## Section 9: QR Codes

QR Codes are the physical entry point for customers.

- **Generation**: The system generates QR codes pointing to the Join Queue URL.
- **URL Structure**: `https://ameoba.q4queue.com/join/<queueId>`

✅ **Verification Checklist**
- [ ] Scan the generated QR code on a mobile device on LTE/5G (not WiFi). It must open the customer's exact subdomain.

⚠ **Common Mistakes**
- QR codes pointing to IP addresses instead of the configured subdomain.

💡 **Best Practices**
- Print a test QR code and physically scan it to ensure the contrast and URL are valid before handing over to the client.

---

## Section 10: Production Verification

Perform a complete End-to-End test.

1. **Create Parent Organization** via Super Admin.
2. **Create Branch** under the organization.
3. **Create Staff** user.
4. **Create Queue** (e.g., "General Admission").
5. **Create Session** for the day.
6. **Scan QR** using your phone.
7. **Generate Token** and verify you receive it.
8. **Receive WhatsApp** confirmation.
9. **Open Tracking** link from WhatsApp and keep it open.
10. **Call Customer** from the staff dashboard.
11. Verify the Display Screen pulses and plays audio.
12. Verify the Tracking Link updates in real-time.
13. **Complete Customer** transaction.
14. **Verify Analytics** show 1 completed customer.

✅ **Verification Checklist**
- [ ] Entire flow completes without errors in the browser console or Docker logs.

⚠ **Common Mistakes**
- Skipping the display screen verification. WebSockets might fail in production if reverse proxy headers are misconfigured.

---

## Section 11: Updates

To safely update Q4Queue to a new version:

```bash
cd /opt/qrq
# 1. Backup the database first!
docker exec -t queue_postgres pg_dumpall -c -U postgres > dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql

# 2. Pull changes
git pull origin develop

# 3. Rebuild and restart
docker compose build
docker compose up -d

# 4. Run any new migrations
docker compose exec backend alembic upgrade head
```

### Rollback
If the update fails:
```bash
git checkout <previous-commit-hash>
docker compose build
docker compose up -d
cat dump_file.sql | docker exec -i queue_postgres psql -U postgres
```

✅ **Verification Checklist**
- [ ] The application loads and displays the new features.

⚠ **Common Mistakes**
- Forgetting to run `alembic upgrade head` after a git pull, leading to database schema mismatches.

---

## Section 12: Backup & Disaster Recovery

### Automatic Schedule
Set up a cron job to backup the PostgreSQL database daily to the host machine and ideally to a secure cloud bucket (e.g., AWS S3 or Google Drive).

```bash
# Example backup command
docker exec -t queue_postgres pg_dumpall -c -U postgres | gzip > /backups/db_$(date +\%Y-\%m-\%d).sql.gz
```

### Disaster Recovery Scenarios
- **Server Crashes / Hardware Failure**: Provision a new Ubuntu server. Follow Sections 4-7. Copy the latest `.sql.gz` backup. Import it into the fresh database. Restore the `.env` file.
- **Docker Fails**: Restart the docker daemon (`sudo systemctl restart docker`). Data is safe in volumes.
- **Database Corrupted**: Restore from the last known good daily backup.

✅ **Verification Checklist**
- [ ] Perform a dry-run restore of a backup file to a staging environment to prove the backup works.

⚠ **Common Mistakes**
- Storing backups on the same SSD as the database. If the SSD dies, everything is lost.

💡 **Best Practices**
- Keep 30 days of rolling backups locally, and 1 year in cold storage.

---

## Section 13: Database Protection

Q4Queue uses Docker named volumes (`postgres_data`) to protect the database.

- **Why Volumes Survive**: Volumes are managed directly by Docker and sit outside the container's writable layer.
- If a container is recreated, updated, or deleted, the volume remains completely intact.
- **Only Data Loss Vector**: Running `docker compose down -v` (the `-v` flag deletes volumes). **NEVER run this in production unless intentionally wiping the system.**

✅ **Verification Checklist**
- [ ] `docker volume ls` shows `qrq_postgres_data`.

⚠ **Common Mistakes**
- Running `docker system prune --volumes` which can destroy production data if containers are currently stopped.

---

## Section 14: Monitoring

### System Health
Monitor CPU, RAM, and Disk using `htop` or standard monitoring tools (Datadog/NewRelic).

### Container Health
```bash
docker stats
```

### Application Logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

✅ **Verification Checklist**
- [ ] Redis memory usage is stable (not leaking).
- [ ] PostgreSQL connection counts remain within limits.

⚠ **Common Mistakes**
- Letting Docker container logs grow infinitely until the SSD is 100% full. Configure Docker log rotation in `/etc/docker/daemon.json`.

---

## Section 15: Security

### Deployment Security Checklist
- [ ] **HTTPS**: Only port 443 is exposed for web traffic. Port 80 redirects to 443.
- [ ] **SSH**: Disabled password login. Uses SSH keys.
- [ ] **Secrets**: `.env` is locked down (`chmod 600 .env`).
- [ ] **Tenant Isolation**: RLS is fully applied in PostgreSQL.
- [ ] **Rate Limiting**: Nginx limits applied to `/api/` to prevent DDoS.

### WhatsApp Security
Ensure the `WHATSAPP_VERIFY_TOKEN` is complex and not guessable to prevent webhook spoofing.

---

## Section 16: Troubleshooting

- **Containers Unhealthy**: Check `docker compose logs`. Usually an `.env` misconfiguration (e.g., wrong database password).
- **WhatsApp Webhook Failing**: Check Meta dashboard for error codes. Usually a DNS issue or SSL certificate expiration on the server.
- **Tracking Links Wrong**: The `FRONTEND_URL` in `.env` is incorrect. Fix it and restart backend.
- **Display Screen Not Updating**: WebSocket connection failed. Verify Nginx `Upgrade` and `Connection` headers are configured for `/ws/`.

---

## Section 17: Customer Handover

Before handing over credentials to the customer, perform a live demonstration.

### Handover Checklist
- [ ] Demonstrate Super Admin login (if applicable to them) or Organization Admin login.
- [ ] Show how to create a Queue.
- [ ] Show how to generate and print a QR code.
- [ ] Demonstrate the WhatsApp flow on a mobile device.
- [ ] Provide them with their dedicated URLs (`ameoba.q4queue.com`) and default temporary passwords (which they must change immediately).

---

## Section 18: Appendix

### Useful Commands
**Docker**
```bash
docker compose ps           # View status
docker compose restart      # Restart all
docker compose logs --tail=100 -f backend  # Tail backend logs
```

**PostgreSQL**
```bash
docker exec -it queue_postgres psql -U postgres -d qrq
```

**Folder Structure**
```text
/opt/qrq
├── backend/
├── frontend/
├── docker-compose.yml
└── .env
```
