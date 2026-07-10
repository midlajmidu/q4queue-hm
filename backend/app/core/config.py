"""
app/core/config.py
Application-wide settings loaded from environment / .env file.
Phase 5: Added rate-limiting, CORS, and metrics configuration.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Application ───────────────────────────────────────────────
    APP_NAME: str = "q4queue"
    VERSION: str = "0.5.0"
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "https://amoebaq.com"

    # ── Security ──────────────────────────────────────────────────
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    JWT_ALGORITHM: str = "HS256"

    # ── PostgreSQL ────────────────────────────────────────────────
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # ── Redis ─────────────────────────────────────────────────────
    REDIS_URL: str
    REDIS_POOL_SIZE: int = 20

    # ── Rate Limiting (requests per minute) ───────────────────────
    RATE_LIMIT_LOGIN: int = 10
    RATE_LIMIT_JOIN: int = 30
    RATE_LIMIT_API: int = 120
    RATE_LIMIT_WS: int = 20

    # ── CORS ──────────────────────────────────────────────────────
    CORS_ORIGINS: str = "*"

    # ── Metrics ───────────────────────────────────────────────────
    METRICS_ENABLED: bool = True

    # ── Logging ───────────────────────────────────────────────────
    LOG_LEVEL: str = "info"

    # ── Email / SMTP ──────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Q4Queue System"

    # ── Meta WhatsApp Cloud API ───────────────────────────────────
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_WABA_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "qrq-whatsapp-webhook-secret"
    WHATSAPP_API_VERSION: str = "v21.0"

    # ── Plivo WebRTC ──────────────────────────────────────────────
    PLIVO_WEBRTC_USERNAME: str = ""
    PLIVO_WEBRTC_PASSWORD: str = ""
    PLIVO_SOURCE_PHONE: str = "+918035017361"

    @property
    def whatsapp_configured(self) -> bool:
        """True when all required Meta credentials are present."""
        return bool(
            self.WHATSAPP_ACCESS_TOKEN
            and self.WHATSAPP_PHONE_NUMBER_ID
            and self.WHATSAPP_WABA_ID
        )

    # ── Server ────────────────────────────────────────────────────
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 10000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def database_url_async(self) -> str:
        """Ensures the DATABASE_URL uses the asyncpg driver."""
        if not self.DATABASE_URL:
            return ""
        if self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
        if self.DATABASE_URL.startswith("postgresql://"):
            return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        if "postgresql+asyncpg://" not in self.DATABASE_URL:
            # Fallback/Append approach if it's just a host
            return self.DATABASE_URL
        return self.DATABASE_URL

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS == "*":
            # Wildcard origins cannot be combined with allow_credentials=True
            # Safe default fallback for local dev
            return ["https://amoebaq.com"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
