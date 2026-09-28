# 🧪 Q4Queue Production Integration Test Matrix

This document provides the exhaustive testing procedure for validating external integrations, real-time protocols, database operations, and background services on `https://app.q4queue.com`.

---

## 📋 Integration Test Matrix Overview

| Subsystem | Test Objective | Test Endpoint / Command | Verification Method | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **Meta WhatsApp** | Webhook Verification (GET) | `GET /api/v1/webhooks/whatsapp` | Meta Hub Challenge Verification | 200 OK returning `hub.challenge` string |
| **Meta WhatsApp** | Incoming Message (POST) | `POST /api/v1/webhooks/whatsapp` | Send simulated customer query | 200 OK, message acknowledged without duplicates |
| **Meta WhatsApp** | Message Status Event (POST)| `POST /api/v1/webhooks/whatsapp` | Send delivery status `sent`, `delivered`, `read` | 200 OK, delivery status updated idempotently |
| **Meta WhatsApp** | Outgoing Message Dispatch | Backend Message Service | Trigger token creation / call next | WhatsApp notification delivered to customer |
| **Plivo Voice** | Answer Callback | `POST /api/v1/plivo/answer` | Inbound call dispatch | Valid XML with Speak / Dial instructions |
| **Plivo Voice** | Hangup Callback | `POST /api/v1/plivo/hangup` | Call termination logging | 200 OK, call session duration recorded |
| **SMTP Mail** | Email Delivery | `POST /api/v1/auth/forgot-password` | Trigger password reset | Email delivered with `https://app.q4queue.com` reset link |
| **WebSocket** | Real-Time Connection | `wss://app.q4queue.com/api/v1/ws/{queueId}` | WSS upgrade via NGINX | 101 Switching Protocols, heartbeat ping/pong |
| **WebSocket** | Queue Event Broadcast | `POST /api/v1/queues/{queueId}/tokens` | Advance / add token | Event received by active WebSocket clients within 100ms |
| **PostgreSQL** | Transactional CRUD & Locking | Database CRUD test suite | Concurrent `call_next` operations | Strict sequential token increment; no duplicates |
| **Redis** | Pub/Sub & Distributed Locks | Background Tasks | Multi-worker execution test | Single worker acquires lock; 0 duplicate executions |
| **Uploads** | Media Upload & Retrieval | `POST /api/v1/organizations/{id}/logo` | Upload brand image & fetch `/uploads/{file}` | 200 OK, correct Content-Type, file served via NGINX |
| **Database Backup** | Automated pg_dump | `production/scripts/backup.sh` | Run backup script | Non-empty `.sql` archive generated in `backups/` |
| **Database Restore**| Database Restoration | `production/scripts/restore.sh` | Restore from archive | Tables and records intact with 0 data corruption |

---

## 🔬 Detailed Step-by-Step Test Procedures

### 1. Meta WhatsApp Webhook Verification
**Endpoint:** `GET https://app.q4queue.com/api/v1/webhooks/whatsapp`

```bash
curl -i -X GET "https://app.q4queue.com/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test_challenge_code_12345"
```
**Expected Response:**
```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8

test_challenge_code_12345
```

---

### 2. Meta WhatsApp Incoming Event (Idempotency Test)
**Endpoint:** `POST https://app.q4queue.com/api/v1/webhooks/whatsapp`

Send payload twice with identical message ID:
```bash
curl -i -X POST "https://app.q4queue.com/api/v1/webhooks/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "1763277594858055",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "15551234567",
            "phone_number_id": "1133376783201582"
          },
          "messages": [{
            "from": "919876543210",
            "id": "wamid.HBgLMjE2OTg3NjU0MzIxMBIA...",
            "timestamp": "1720000000",
            "text": { "body": "STATUS" },
            "type": "text"
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```
**Expected Outcome:**
- First request returns `200 OK` and processes queue status.
- Second request returns `200 OK` and detects duplicate `wamid` event without repeating notifications or token creations.

---

### 3. Plivo Voice Callbacks
**Answer URL:** `POST https://app.q4queue.com/api/v1/plivo/answer`
```bash
curl -i -X POST "https://app.q4queue.com/api/v1/plivo/answer" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallUUID=c2a3e9b1-0000-4b6e-8512-4f3b1e7b219a&From=919876543210&To=918035017361&Direction=inbound"
```
**Expected Response:**
```xml
HTTP/1.1 200 OK
Content-Type: application/xml

<Response>
    <Speak>Welcome to Q4Queue. Your token number is currently being called.</Speak>
</Response>
```

**Hangup URL:** `POST https://app.q4queue.com/api/v1/plivo/hangup`
```bash
curl -i -X POST "https://app.q4queue.com/api/v1/plivo/hangup" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallUUID=c2a3e9b1-0000-4b6e-8512-4f3b1e7b219a&Duration=45&HangupCause=NORMAL_CLEARING"
```
**Expected Response:**
`HTTP/1.1 200 OK`

---

### 4. WebSocket Real-Time Connection
**Endpoint:** `wss://app.q4queue.com/api/v1/ws/{queueId}`

Using `wscat` or browser DevTools console:
```javascript
const ws = new WebSocket("wss://app.q4queue.com/api/v1/ws/queue_12345");
ws.onopen = () => console.log("Connected to Q4Queue live updates!");
ws.onmessage = (event) => console.log("Live Event:", JSON.parse(event.data));
```
**Verification:**
- Perform an action on the dashboard (e.g. `call_next`).
- Verify immediate message received on WebSocket client containing updated `serving_token`.

---

### 5. Health & Readiness Verification
**Liveness:** `GET https://app.q4queue.com/health`
```bash
curl -i https://app.q4queue.com/health
```
**Readiness:** `GET https://app.q4queue.com/ready`
```bash
curl -i https://app.q4queue.com/ready
```
**Expected Response:**
```json
{
  "status": "ready",
  "database": "connected",
  "redis": "connected",
  "environment": "production"
}
```

---

### 6. Media Upload & Safe Retrieval
1. Upload an organization logo:
```bash
curl -i -X POST "https://app.q4queue.com/api/v1/organizations/org_123/logo" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@brand_logo.png;type=image/png"
```
2. Verify response contains safe path (e.g. `/uploads/org_123/logo.png`).
3. Fetch image through NGINX:
```bash
curl -i "https://app.q4queue.com/uploads/org_123/logo.png"
```
**Expected Outcome:**
- Image served with `Content-Type: image/png` and caching header `Cache-Control: public, no-transform`.
- Path traversal requests (`/uploads/../../etc/passwd`) return `400 Bad Request` or `404 Not Found`.

---

### 7. Database Backup & Disaster Recovery Verification
```bash
# Execute backup
./production/scripts/backup.sh

# Verify output
ls -lh production/backups/
```
Verify that the generated `.sql` file contains complete schema and table data for organizations, queues, users, and tokens.
