import logging
import warnings
from enum import Enum

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_logger = logging.getLogger(__name__)


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    # --- Required ---
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # --- Environment ---
    ENVIRONMENT: Environment = Environment.DEVELOPMENT
    DEBUG: bool = False

    # --- AI Provider Keys (at least one LLM key recommended) ---
    NVIDIA_API_KEY: str = ""
    COHERE_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    TOGETHER_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""

    # --- Email ---
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "PAU Interconnect <onboarding@resend.dev>"

    # --- Security ---
    FRONTEND_URL: str = "http://localhost:3000"
    ADMIN_EMAILS: str = ""  # Comma-separated list of admin emails

    # --- Infrastructure ---
    REDIS_URL: str = "redis://localhost:6379"

    # --- Timeouts (seconds) ---
    LLM_TIMEOUT: float = 30.0
    EMBEDDING_TIMEOUT: float = 30.0
    DB_TIMEOUT: float = 15.0
    STORAGE_TIMEOUT: float = 30.0

    # --- Concurrency ---
    CV_PROCESSING_CONCURRENCY: int = 5
    MAX_CONCURRENT_STREAMS: int = 50

    # --- Cache ---
    EMBEDDING_CACHE_SIZE: int = 2000
    EMBEDDING_CACHE_TTL: int = 86400
    MATCH_CACHE_SIZE: int = 5000
    MATCH_CACHE_TTL: int = 3600

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("SUPABASE_URL")
    @classmethod
    def validate_supabase_url(cls, v: str) -> str:
        if not v or not v.strip().startswith("http"):
            raise ValueError("SUPABASE_URL must be a valid HTTP(S) URL")
        return v.strip()

    @field_validator("SUPABASE_SERVICE_ROLE_KEY")
    @classmethod
    def validate_service_key(cls, v: str) -> str:
        if not v or len(v.strip()) < 20:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY appears invalid or too short")
        return v.strip()

    @field_validator("FRONTEND_URL")
    @classmethod
    def validate_frontend_url(cls, v: str) -> str:
        if v == "*":
            warnings.warn(
                "FRONTEND_URL is set to '*'. This is insecure for production.",
                stacklevel=2,
            )
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == Environment.PRODUCTION


settings = Settings()


def log_startup_diagnostics() -> None:
    """Log which features are available based on configured keys."""
    llm_keys = [
        settings.GROQ_API_KEY,
        settings.OPENROUTER_API_KEY,
        settings.TOGETHER_API_KEY,
        settings.NVIDIA_API_KEY,
    ]
    llm_count = sum(1 for k in llm_keys if k)
    embed_ok = bool(settings.COHERE_API_KEY or settings.NVIDIA_API_KEY)
    email_ok = bool(settings.RESEND_API_KEY)

    _logger.info("=== PAU Interconnect Startup ===")
    _logger.info(f"Environment  : {settings.ENVIRONMENT.value}")
    _logger.info(f"Database     : configured")
    _logger.info(f"LLM providers: {llm_count} configured")
    _logger.info(f"Embedding    : {'yes' if embed_ok else 'NO — matching will fail'}")
    _logger.info(f"Email        : {'yes' if email_ok else 'disabled'}")
    _logger.info(f"CORS origins : {settings.FRONTEND_URL}")

    if not llm_keys:
        _logger.warning("No LLM API keys configured. AI features unavailable.")
    if not embed_ok:
        _logger.warning("No embedding API key. Matching will not work.")
    if settings.FRONTEND_URL == "*":
        _logger.warning("CORS allows all origins — NOT SAFE FOR PRODUCTION")
