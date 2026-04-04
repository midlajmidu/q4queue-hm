"""
app/middleware/rate_limiter.py
Pre-built RateLimiter instances for common API tiers.

Tiers:
  login_rate_limit   → IP-only,  5-10 req/min  (brute-force protection)
  join_rate_limit    → IP-only,  20-30 req/min  (public queue join)
  api_rate_limit     → user_id-aware, 100-120 req/min (authenticated admin/staff)
  ws_rate_limit      → IP-only,  20 req/min     (WebSocket handshake)

All limits are configurable via environment variables in Settings.

Usage in routes:
  from app.middleware.rate_limiter import login_rate_limit, api_rate_limit

  @router.post("/login", dependencies=[Depends(login_rate_limit)])
  async def login(...): ...

  @router.post("/{queue_id}/next", dependencies=[Depends(api_rate_limit)])
  async def call_next(...): ...
"""
from app.core.rate_limit import RateLimiter
from app.core.config import get_settings

_s = get_settings()

# ── Auth endpoints (brute-force prevention) ──────────────────────────────────
# IP only — user is not authenticated yet
# Stricter: 10/min sustained + burst of 3/10s
login_rate_limit = RateLimiter(
    limit=_s.RATE_LIMIT_LOGIN,
    window=60,
    prefix="login",
    use_user_id=False,
    burst_limit=3,
    burst_window=10,
)

# ── Public customer join (queue token issuing) ───────────────────────────────
# IP only — customers are unauthenticated
# 30/min sustained + burst of 5/10s
join_rate_limit = RateLimiter(
    limit=_s.RATE_LIMIT_JOIN,
    window=60,
    prefix="join",
    use_user_id=False,
    burst_limit=5,
    burst_window=10,
)

# ── Authenticated admin/staff API actions ─────────────────────────────────────
# User-aware: keys by user_id if JWT present, falls back to IP
# High limit: 120/min — admin dashboards are interactive
api_rate_limit = RateLimiter(
    limit=_s.RATE_LIMIT_API,
    window=60,
    prefix="api",
    use_user_id=True,   # ← USER-AWARE: different users = different counters
)

# ── WebSocket handshake ───────────────────────────────────────────────────────
# IP-only — prevents WS connection flooding
ws_rate_limit = RateLimiter(
    limit=_s.RATE_LIMIT_WS,
    window=60,
    prefix="ws",
    use_user_id=False,
)
