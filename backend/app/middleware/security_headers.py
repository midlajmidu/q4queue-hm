"""
app/middleware/security_headers.py
HTTP security headers middleware.

Adds defense-in-depth headers to every response:
  - HSTS (force HTTPS)
  - Anti-clickjacking
  - MIME sniffing protection
  - Referrer policy
  - CSP
  - Permissions policy
"""
import logging
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "connect-src 'self' http: https: ws: wss:; "
        "frame-ancestors 'none'"
    ),
}

# HSTS only in production (breaks localhost with HTTPS)
HSTS_HEADER = "max-age=31536000; includeSubDomains; preload"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)

        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value

        if settings.is_production:
            response.headers["Strict-Transport-Security"] = HSTS_HEADER

        return response
