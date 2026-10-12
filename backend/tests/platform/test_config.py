"""
Tests for backend configuration validation (core/config.py).
"""

import pytest
from pydantic import ValidationError
from core.config import Environment, Settings, log_startup_diagnostics


def test_valid_settings_creation():
    """Settings instantiate properly with valid configuration."""
    s = Settings(
        SUPABASE_URL="https://myproject.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="valid-secret-key-that-is-long-enough-30-chars",
        ENVIRONMENT=Environment.DEVELOPMENT,
        FRONTEND_URL="http://localhost:3000",
    )
    assert s.SUPABASE_URL == "https://myproject.supabase.co"
    assert s.is_production is False


def test_missing_required_settings():
    """Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY raises ValidationError."""
    with pytest.raises(ValidationError):
        Settings(
            SUPABASE_URL="",
            SUPABASE_SERVICE_ROLE_KEY="",
        )


def test_invalid_supabase_url():
    """Non-HTTP(S) SUPABASE_URL raises ValidationError."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            SUPABASE_URL="not-a-valid-url",
            SUPABASE_SERVICE_ROLE_KEY="valid-secret-key-long-enough-25-chars",
        )
    assert "SUPABASE_URL must be a valid HTTP(S) URL" in str(exc.value)


def test_service_key_too_short():
    """Service role key under 20 characters is rejected."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            SUPABASE_URL="https://myproject.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY="too-short",
        )
    assert "SUPABASE_SERVICE_ROLE_KEY appears invalid or too short" in str(exc.value)


def test_wildcard_cors_rejected_in_production():
    """Setting FRONTEND_URL to '*' in production raises ValueError."""
    with pytest.raises(ValidationError) as exc:
        Settings(
            SUPABASE_URL="https://myproject.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY="valid-secret-key-long-enough-25-chars",
            ENVIRONMENT=Environment.PRODUCTION,
            FRONTEND_URL="*",
        )
    assert "FRONTEND_URL cannot be '*' when ENVIRONMENT is 'production'" in str(exc.value)


def test_startup_diagnostics_runs_cleanly(capsys):
    """log_startup_diagnostics executes without error."""
    log_startup_diagnostics()
