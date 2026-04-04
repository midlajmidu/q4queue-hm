"""
app/core/rate_limit.py
Production-grade Redis-backed rate limiter for multi-tenant SaaS.

Algorithm: Sliding Window Counter using Redis Sorted Sets.
  - O(log n) per request — fast even under load
  - Atomic via Redis pipeline — no race conditions
  - Dual-key strategy: user_id for authenticated, IP for public

Key design:
  Authenticated  →  rate:{prefix}:user:{user_id}
  Unauthenticated →  rate:{prefix}:ip:{client_ip}

Features:
  - Graceful Redis failure (passes request through)
  - X-RateLimit-Limit / X-RateLimit-Remaining headers
  - Retry-After header on 429
  - Structured logging on violations
  - Prometheus counter for monitoring
  - Optional burst limit (per-second sub-window)
"""
import logging
import time
import uuid
from typing import Optional

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.redis.client import get_redis

logger = logging.getLogger(__name__)

# Optional: JWT bearer (auto_error=False so it never raises on its own)
_bearer = HTTPBearer(auto_error=False)


def _extract_user_id(credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    """
    Decode the JWT and return user_id (sub) if valid.
    Returns None on any failure — just falls back to IP keying.
    """
    if credentials is None:
        return None
    try:
        from app.core.security import decode_access_token
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        return str(user_id) if user_id else None
    except (JWTError, Exception):
        return None


class RateLimiter:
    """
    Reusable FastAPI dependency for Redis sliding-window rate limiting.

    Usage:
        # IP-only (public endpoint)
        limiter = RateLimiter(limit=10, window=60, prefix="join")

        # User-aware (prefers user_id over IP when authenticated)
        limiter = RateLimiter(limit=100, window=60, prefix="api", use_user_id=True)

        @router.post("/login", dependencies=[Depends(limiter)])
        async def login(...): ...
    """

    def __init__(
        self,
        limit: int,
        window: int = 60,
        prefix: str = "default",
        use_user_id: bool = False,
        burst_limit: Optional[int] = None,
        burst_window: int = 10,
    ):
        """
        Args:
            limit:        Max requests allowed in the window.
            window:       Window size in seconds.
            prefix:       Identifier for this limiter (e.g. 'login', 'api').
            use_user_id:  If True, prefer user_id from JWT over IP.
            burst_limit:  Optional hard cap within a shorter burst_window.
            burst_window: Burst sub-window in seconds (default: 10s).
        """
        self.limit = limit
        self.window = window
        self.prefix = prefix
        self.use_user_id = use_user_id
        self.burst_limit = burst_limit
        self.burst_window = burst_window

    async def __call__(
        self,
        request: Request,
        response: Response,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    ) -> None:
        # ── Resolve rate-limit key ────────────────────────────────────────────
        user_id: Optional[str] = None
        if self.use_user_id:
            user_id = _extract_user_id(credentials)

        client_ip = (request.client.host if request.client else "unknown")

        if user_id:
            key = f"rate:{self.prefix}:user:{user_id}"
            key_type = "user"
        else:
            key = f"rate:{self.prefix}:ip:{client_ip}"
            key_type = "ip"

        # ── Sliding window check ─────────────────────────────────────────────
        try:
            redis = get_redis()
        except RuntimeError:
            logger.warning("Rate limiter skipped — Redis unavailable")
            return

        try:
            now = time.time()
            window_start = now - self.window

            pipe = redis.pipeline()
            # Remove expired timestamps outside current window
            pipe.zremrangebyscore(key, 0, window_start)
            # Count requests still inside window (BEFORE adding current)
            pipe.zcard(key)
            # Add this request with its timestamp as score
            pipe.zadd(key, {f"{now}:{uuid.uuid4().hex[:8]}": now})
            # Auto-expire key to avoid orphan keys
            pipe.expire(key, self.window + 5)
            # Get oldest entry for Retry-After calculation
            pipe.zrange(key, 0, 0, withscores=True)
            results = await pipe.execute()

            current_count = results[1]  # count BEFORE this request
            remaining = max(0, self.limit - current_count - 1)

            # Attach informational headers on every response
            response.headers["X-RateLimit-Limit"] = str(self.limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Window"] = str(self.window)

            if current_count >= self.limit:
                # Calculate when the oldest entry in the window expires
                oldest_entries = results[4]
                if oldest_entries:
                    oldest_ts = oldest_entries[0][1]
                    retry_after = max(1, int(self.window - (now - oldest_ts)) + 1)
                else:
                    retry_after = self.window

                logger.warning(
                    "Rate limit exceeded | prefix=%s key_type=%s key=%s count=%d limit=%d retry_after=%ds",
                    self.prefix, key_type, key, current_count, self.limit, retry_after,
                )

                # Prometheus metric (low-cardinality: only prefix label)
                try:
                    from app.monitoring.metrics import RATE_LIMIT_HITS
                    RATE_LIMIT_HITS.labels(prefix=self.prefix).inc()
                except Exception:
                    pass

                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please slow down.",
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(self.limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Window": str(self.window),
                    },
                )

            # ── Optional burst check (secondary sub-window) ───────────────────
            if self.burst_limit is not None:
                burst_key = f"{key}:burst"
                burst_start = now - self.burst_window

                burst_pipe = redis.pipeline()
                burst_pipe.zremrangebyscore(burst_key, 0, burst_start)
                burst_pipe.zcard(burst_key)
                burst_pipe.zadd(burst_key, {f"{now}:{uuid.uuid4().hex[:8]}": now})
                burst_pipe.expire(burst_key, self.burst_window + 2)
                burst_results = await burst_pipe.execute()

                burst_count = burst_results[1]
                if burst_count >= self.burst_limit:
                    logger.warning(
                        "Burst limit exceeded | prefix=%s key_type=%s burst=%d/%d",
                        self.prefix, key_type, burst_count, self.burst_limit,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Request rate too high. Please slow down.",
                        headers={"Retry-After": str(self.burst_window)},
                    )

        except HTTPException:
            raise
        except Exception as exc:
            # Redis failure — fail open (allow request, log error)
            logger.error("Rate limiter Redis error: %s", exc, exc_info=True)
