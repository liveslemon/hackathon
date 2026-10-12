"""
Tests for security, CORS normalization, rate limiting, and request limits.
"""

import json
import pytest
from fastapi import HTTPException
from starlette.requests import Request
from core.config import settings
from core.rate_limit import rate_limit, rate_limit_ip
from main import global_exception_handler
from tests.conftest import (
    STUDENT_TOKEN,
    STUDENT_USER_ID,
    make_mock_user,
)


def test_cors_headers_with_allowed_origin(client):
    """CORS middleware returns access-control headers for allowed frontend origin."""
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "access-control-allow-credentials" in response.headers


def test_x_request_id_generated_and_exposed(client):
    """X-Request-ID is generated if not sent, and returned in response."""
    res = client.get("/health")
    assert res.status_code == 200
    assert "X-Request-ID" in res.headers
    assert len(res.headers["X-Request-ID"]) > 0

    custom_id = "custom-req-12345"
    res_custom = client.get("/health", headers={"X-Request-ID": custom_id})
    assert res_custom.status_code == 200
    assert res_custom.headers["X-Request-ID"] == custom_id


def test_payload_too_large_rejection(client):
    """Requests with Content-Length exceeding 15MB are rejected with 413 Payload Too Large."""
    oversized = 20 * 1024 * 1024  # 20 MB
    res = client.post(
        "/health",
        headers={"Content-Length": str(oversized)},
        content=b"x",
    )
    assert res.status_code == 413
    assert "Payload too large" in res.json().get("error", "")


@pytest.mark.asyncio
async def test_rate_limiting_dependency_enforcement(student_user):
    """Exceeding the rate limit raises HTTPException 429 with Retry-After header."""
    limiter = rate_limit("test_bucket", limit=2, window_seconds=10)

    # First 2 calls succeed
    u1 = await limiter(current_user=student_user)
    assert u1.id == student_user.id

    u2 = await limiter(current_user=student_user)
    assert u2.id == student_user.id

    # 3rd call is blocked with 429
    with pytest.raises(HTTPException) as exc:
        await limiter(current_user=student_user)

    assert exc.value.status_code == 429
    assert "Retry-After" in exc.value.headers
    assert exc.value.detail == "Too many requests. Please try again later."


@pytest.mark.asyncio
async def test_rate_limiting_ip_dependency():
    """IP-based rate limiter caps unauthenticated calls."""
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/public",
        "headers": [(b"x-forwarded-for", b"203.0.113.195")],
    }
    req = Request(scope)
    limiter = rate_limit_ip("public_bucket", limit=2, window_seconds=10)

    # First 2 calls succeed
    ip1 = await limiter(request=req)
    assert ip1 == "203.0.113.195"

    ip2 = await limiter(request=req)
    assert ip2 == "203.0.113.195"

    # 3rd call is blocked with 429
    with pytest.raises(HTTPException) as exc:
        await limiter(request=req)

    assert exc.value.status_code == 429
    assert "Retry-After" in exc.value.headers


def test_test_supabase_disabled_in_production(client, student_headers, monkeypatch):
    """The /test-supabase debug endpoint returns 404 in production environment."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert settings.is_production is True

    res = client.get("/test-supabase", headers=student_headers)
    assert res.status_code == 404
    assert "not available in production" in res.json().get("detail", "")


@pytest.mark.asyncio
async def test_unhandled_exception_does_not_leak_traces():
    """Unhandled internal exceptions return generic error with tracking reference and no traceback."""
    scope = {"type": "http", "method": "GET", "path": "/test-crash", "headers": []}
    req = Request(scope)
    exc = RuntimeError("Sensitive internal database connection password leaked!")

    response = await global_exception_handler(req, exc)
    assert response.status_code == 500

    data = json.loads(response.body.decode())
    assert data["error"] == "An unexpected error occurred."
    assert "reference" in data
    # Sensitive error details are not in the response payload
    assert "Sensitive" not in str(data)
    assert "traceback" not in str(data).lower()
