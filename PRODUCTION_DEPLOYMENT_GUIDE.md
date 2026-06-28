# Q4Queue Production Deployment Guide

This document is the official, step-by-step production deployment manual for Q4Queue. It covers the entire lifecycle from receiving a fresh Ubuntu server to handing over a fully working, secure, and performant system to the customer. 

**Target Audience:** DevOps Engineers, System Administrators, and Deployment Specialists.

> [!IMPORTANT]
> Read this entire guide before beginning your first deployment. Do not skip verification steps.

---

## 1. Server Requirements

To ensure a stable and performant deployment of Q4Queue, the host server must meet the following baseline requirements.

### Hardware & OS Recommendations
- **Operating System:** Ubuntu 22.04 LTS or 24.04 LTS (64-bit).
- **CPU:** 4 vCPUs (Minimum), 8 vCPUs (Recommended for multi-branch/high-traffic).
- **RAM:** 8 GB RAM (Minimum), 16 GB RAM (Recommended).
- **Disk:** 50 GB SSD minimum (100+ GB recommended for database growth and backup retention).
- **Network:** 1 Gbps connection.

### Network Requirements
- **Static Public IP:** The server MUST have a dedicated, static Public IPv4 address.
- **Domain Name:** A registered domain name (e.g., `q4queue.com` or `app.customer.com`) with DNS access to point A-records to the Public IP.

### Firewall Configuration (Inbound Rules)
Open the following ports on the server's firewall (e.g., AWS Security Group, UFW, or Azure NSG):
- `22` (TCP): SSH access (Restrict to your administration IP addresses).
- `80` (TCP): HTTP traffic (for ACME Let's Encrypt verification & redirect).
- `443` (TCP): HTTPS traffic (Main application access).
- *(Optional)* `8000`, `3000`: Only if debugging locally. **Do not expose these to the public internet in production.**

---

## 2. Initial Server Setup

Start by connecting to your fresh Ubuntu server via SSH.

### Update & Upgrade
Keep the system packages up to date.
```bash
sudo apt-get update -y
sudo apt-get upgrade -y
```

### Security Hardening (UFW)
Enable the Uncomplicated Firewall (UFW) to enforce network security.
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Create Deployment User
Do not deploy as `root`. Create a dedicated user for deployment.
```bash
sudo adduser q4deploy
sudo usermod -aG sudo q4deploy
su - q4deploy
```

### Required Packages Installation
Install Docker, Docker Compose, Git, and other essential utilities.
```bash
# Install Git and Curl
sudo apt-get install -y git curl ufw

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker q4deploy

# Install Docker Compose plugin
sudo apt-get install docker-compose-plugin -y
```
> [!NOTE]
> Log out and log back in as `q4deploy` to apply the Docker group membership, allowing you to run docker commands without `sudo`.

---

## 3. Project Deployment

### Clone Repository
Navigate to the deployment directory and clone the Q4Queue codebase.
```bash
mkdir -p ~/deployments
cd ~/deployments
git clone https://github.com/your-org/q4queue.git
cd q4queue
```

### Configure Project
You must configure the `.env` files before starting the containers. See **Section 4: Environment Variables** for a detailed explanation.
```bash
# Generate secure secrets
openssl rand -hex 32 # Use this for NEXTAUTH_SECRET and SECRET_KEY

# Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Edit the files using `nano backend/.env` and `nano frontend/.env`.

### Docker Build & Start
Use Docker Compose to build and start the infrastructure.
```bash
# Build the containers
docker compose build

# Start the services in detached mode
docker compose up -d
```

### Verify Health
Check that all containers are running successfully.
```bash
docker compose ps
docker compose logs -f backend
```

### Database Migration & Seed
Run Alembic migrations to construct the database schema, then seed the initial super admin data.
```bash
# Run migrations
docker compose exec backend alembic upgrade head

# Seed super admin
docker compose exec backend python -m scripts.seed_super_admin
```

> **Checkpoint:** Navigate to `http://<SERVER_IP>:3000` to verify the frontend loads (Wait for Domain setup for full HTTPS functionality).

---

## 4. Environment Variables

Environment variables are critical for security and functionality. Keep them secure. **Never commit `.env` files to version control.**

### Backend `.env`

| Variable | Purpose | Example Value | Changes per Customer? | Secret? | Backup? |
|----------|---------|---------------|-----------------------|---------|---------|
| `ENVIRONMENT` | Defines deployment mode. | `production` | No | No | Yes |
| `DATABASE_URL` | PostgreSQL connection string. | `postgresql://q4queue:secure_password@db:5432/q4queue` | Yes (Password) | Yes | Yes |
| `REDIS_URL` | Redis connection string. | `redis://redis:6379/0` | No | No | Yes |
| `SECRET_KEY` | JWT and cryptographic signing key. | `<32_byte_hex_string>` | Yes | **Yes** | Yes |
| `FRONTEND_URL` | Allowed CORS origin (production domain). | `https://q4queue.customer.com` | Yes | No | Yes |
| `META_ACCESS_TOKEN` | Permanent WhatsApp API token. | `EAABw...` | Yes | **Yes** | Yes |
| `META_PHONE_NUMBER_ID` | WhatsApp Business Phone ID. | `123456789012345` | Yes | No | Yes |
| `META_WEBHOOK_VERIFY_TOKEN` | Token to verify Meta webhooks. | `my_secure_webhook_token` | Yes | Yes | Yes |

### Frontend `.env`

| Variable | Purpose | Example Value | Changes per Customer? | Secret? | Backup? |
|----------|---------|---------------|-----------------------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Public backend URL for client-side fetches. | `https://api.q4queue.customer.com` | Yes | No | Yes |
| `NEXTAUTH_URL` | Base URL for NextAuth callbacks. | `https://q4queue.customer.com` | Yes | No | Yes |
| `NEXTAUTH_SECRET` | Secret used to encrypt NextAuth session cookies. | `<32_byte_hex_string>` | Yes | **Yes** | Yes |
| `BACKEND_INTERNAL_URL` | Internal Docker network URL for SSR calls. | `http://backend:8000` | No | No | Yes |

> [!TIP]
> Recommended Folder Structure for Secrets Backup: Store encrypted copies of `.env` files in a secured cloud vault (e.g., AWS Secrets Manager, 1Password, Vault) labeled by customer name.

---

## 5. Domain & DNS Configuration

Q4Queue requires HTTPS for secure data transmission and PWA functionality.

### DNS Records Setup
In your domain registrar (e.g., Cloudflare, Route53, GoDaddy), create the following `A` records pointing to your server's Static Public IP:
1. `q4queue.customer.com` (Frontend) -> `198.51.100.1`
2. `api.q4queue.customer.com` (Backend) -> `198.51.100.1`

### Reverse Proxy & SSL (Nginx / Caddy / Traefik)
It is highly recommended to use a reverse proxy like **Nginx** or **Caddy** outside of the application stack, or integrate **Traefik** in your docker-compose.

**Example Caddyfile:**
```text
q4queue.customer.com {
    reverse_proxy localhost:3000
}

api.q4queue.customer.com {
    reverse_proxy localhost:8000
}
```
*Caddy automatically provisions Let's Encrypt SSL certificates.*

### CORS Verification
Ensure `FRONTEND_URL` in the backend `.env` matches the exact frontend domain (`https://q4queue.customer.com`). Test CORS by logging into the frontend and ensuring API requests do not throw CORS errors in the browser console.

---

## 6. WhatsApp Production Setup

To send automated WhatsApp messages, Q4Queue integrates with the Meta Cloud API.

### Meta App Configuration
1. Go to **Meta for Developers** -> Create App -> Business -> WhatsApp.
2. Link to the customer's **Business Manager**.
3. Add a verified **Phone Number** to the WhatsApp Account (WABA).

### Tokens and Webhooks
1. **Permanent Access Token:** Generate a system user access token in Business Manager Settings with `whatsapp_business_messaging` permissions. Set as `META_ACCESS_TOKEN`.
2. **Phone Number ID:** Extract from the WhatsApp API setup page. Set as `META_PHONE_NUMBER_ID`.
3. **Webhook Setup:**
   - URL: `https://api.q4queue.customer.com/api/v1/webhooks/whatsapp`
   - Verify Token: Enter the value you set for `META_WEBHOOK_VERIFY_TOKEN`.
   - Subscribe to the `messages` webhook field.

### Template Verification
Production requires approved message templates. Submit the exact template structures used in `backend/app/services/whatsapp.py` to Meta for approval.

### Troubleshooting WhatsApp
- **Error 131030:** Customer number is invalid or not on WhatsApp.
- **Error 132001:** Template does not exist or is not approved.
- **No Messages Received:** Check webhook logs in the backend container (`docker compose logs -f backend`).

---

## 7. QR Code & Customer Flow Testing

Verify the complete customer joining experience.

1. **Queue Join:** Scan a queue QR code with a mobile device.
2. **Phone Number Entry:** Submit a valid phone number.
3. **Duplicate Join Protection:** Attempt to join the *same* queue again with the *same* phone number. The system must redirect to the existing tracking link instead of creating a new token.
4. **Tracking Link Generation:** Verify the generated link opens the tracking UI.
5. **Real-time Refresh:** Open the tracking link on mobile, then process the token on the admin dashboard. The mobile UI must update via WebSocket instantly.
6. **WhatsApp Link Flow:** Verify the WhatsApp consent modal works, and if opted-in, the user receives their WhatsApp notification.

---

## 8. Multi-Branch Configuration

Verify tenant isolation and structural integrity.

1. **Parent Organization:** Log in as `super_admin` -> Create an Organization (e.g., "MegaHealth").
2. **Branches:** Navigate to the Organization -> Create multiple branches (e.g., "Downtown Clinic", "Uptown Clinic").
3. **Roles:** Create an `organization_admin` for MegaHealth. Log in as this user and verify they can only see Downtown and Uptown clinics.
4. **Staff:** Impersonate "Downtown Clinic", create a `staff` user. Log in as the staff user and verify they can only manage queues for Downtown Clinic.
5. **Tenant Isolation:** Ensure a staff member from Downtown Clinic cannot access `/api/v1/queues` belonging to Uptown Clinic.

---

## 9. Reports & Analytics Testing

Verify business intelligence tools.

1. **Dashboard:** Check the "Live Analytics" widgets for accurate real-time queue counts.
2. **Cross Branch Analytics:** Log in as `organization_admin`. Go to Analytics. Verify data aggregates from all branches.
3. **Customer Reports:** Filter reports by date range (e.g., "Last 7 Days").
4. **Exports:** 
   - Click **Export CSV**. Verify the downloaded file contains accurate tabular data.
   - Click **Export PDF**. Verify the layout is intact and data matches the UI.

---

## 10. Backup & Disaster Recovery

Q4Queue includes built-in SQLite/PostgreSQL logical backup routines, but infrastructure-level backups are mandatory.

### Backup Strategy
- **Location:** Automated cron job saving dumps to AWS S3, Google Cloud Storage, or an external secure NAS.
- **Schedule:** Daily full database dumps at 02:00 AM local time.
- **Retention:** 30 days of daily backups, 12 months of monthly backups.

### Database Dump Command
```bash
# Create a backup
docker compose exec -t db pg_dumpall -c -U q4queue > dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql
```

### Restore Workflow (Disaster Recovery)
In the event of a catastrophic failure:
1. Provision a new server and follow Sections 1-3.
2. Start the database container ONLY: `docker compose up -d db`.
3. Restore the dump:
```bash
cat dump_file.sql | docker compose exec -T db psql -U q4queue -d q4queue
```
4. Start remaining containers: `docker compose up -d`
5. Verify integrity.

---

## 11. Security Checklist

Before Go-Live, explicitly verify:

- [ ] **JWT:** Secret key is complex, random, and at least 32 characters.
- [ ] **HTTPS Only:** HTTP traffic successfully redirects to HTTPS.
- [ ] **Role Isolation:** Staff cannot access `/organization-admin` or `/super-admin` endpoints.
- [ ] **Branch Isolation:** Data leakage between branches does not occur in API responses.
- [ ] **Export Authorization:** Only authorized roles (Admins) can trigger CSV/PDF exports.
- [ ] **Database Exposure:** Port 5432 is NOT mapped to the host (`ports: - "5432:5432"` is removed or restricted to `127.0.0.1`).

---

## 12. Performance Verification

Monitor the system under a synthetic load to ensure stability.

- **Docker:** `docker stats` (Verify RAM usage is stable, no memory leaks).
- **PostgreSQL:** Ensure indexes are functioning. Query response times should be < 50ms.
- **WebSockets:** Connect multiple tracking links simultaneously. Ensure Redis pub/sub handles the broadcasting without CPU spikes.

---

## 13. Customer Acceptance Testing (UAT)

Walk the customer through this checklist:

- [ ] Customer can log in as Organization Admin.
- [ ] Customer can create a new branch.
- [ ] Customer can create a Queue.
- [ ] Customer can scan QR and join Queue.
- [ ] Customer receives WhatsApp notification (if configured).
- [ ] Tracking UI updates when the Queue Admin calls the next token.
- [ ] Queue Admin can close the Queue.
- [ ] Customer can generate a PDF report for the day.

---

## 14. Go-Live Checklist

- [ ] Server provisioned and secured.
- [ ] DNS propagated.
- [ ] SSL certificates active.
- [ ] Environment variables configured securely.
- [ ] Database migrated and seeded.
- [ ] WhatsApp Webhook verified.
- [ ] UAT signed off by the customer.
- [ ] Backup cron jobs activated.
- [ ] Monitoring/Alerting configured (e.g., UptimeRobot, Datadog).

---

## 15. Troubleshooting Guide

### Docker Issues
- **Container keeps restarting:** Check logs `docker compose logs backend`. Usually indicates a missing `.env` variable or database connection failure.
### PostgreSQL Issues
- **Connection Refused:** Ensure the `backend` is connecting to the `db` host (Docker DNS), not `localhost`. Ensure passwords match in `backend/.env` and `docker-compose.yml`.
### WhatsApp Webhook Issues
- **Verification fails:** Check that the `META_WEBHOOK_VERIFY_TOKEN` exactly matches what you enter in the Meta portal. Ensure your proxy is passing the `hub.challenge` query parameters correctly.
### WebSocket / Tracking Issues
- **Tracking UI doesn't update:** Ensure `REDIS_URL` is correct. The backend uses Redis to broadcast WebSocket messages across workers.

---

## 16. Maintenance Guide

- **Daily:** Verify automated database backup succeeded.
- **Weekly:** Review system logs for unusual error rates.
- **Monthly:** Apply OS security updates (`sudo apt-get update && sudo apt-get upgrade -y`).
- **Yearly:** Rotate JWT secret keys (Requires forcing all users to log in again).

---

## 17. Future Upgrade Guide

To deploy updates to Q4Queue:

1. **Backup First:** Always create a database dump before pulling new code.
2. **Pull Code:** `git pull origin main`
3. **Rebuild:** `docker compose build`
4. **Migrate Database:** `docker compose run --rm backend alembic upgrade head`
5. **Restart Services:** `docker compose up -d`
6. **Rollback:** If migration fails, restore the database dump and revert git to the previous tag.

---

## 18. Appendix

### Important File Locations
- **Backend Logs:** Available via `docker compose logs backend`
- **Nginx/Caddy Config:** Usually located in `/etc/nginx/sites-available/` or `/etc/caddy/Caddyfile`
- **Application Code:** `/home/q4deploy/deployments/q4queue/`

### Useful Commands
- **View Live Logs:** `docker compose logs -f --tail=100`
- **Restart Specific Service:** `docker compose restart frontend`
- **Access Database Shell:** `docker compose exec db psql -U q4queue -d q4queue`
- **Run Python Shell:** `docker compose exec backend python`
