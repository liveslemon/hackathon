def test_root_endpoint(client):
    """Test root API metadata endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data or "message" in data or "version" in data
    if "status" in data:
        assert data["status"] in ("healthy", "online", "ok")


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") in ("healthy", "online", "ok", "degraded")


def test_diagnostics_endpoint(client):
    """Test diagnostics endpoint used by frontend connectivity testing."""
    response = client.get("/diagnostics")
    assert response.status_code == 200
    data = response.json()
    assert "environment" in data or "status" in data or "services" in data


def test_cors_preflight(client):
    """Test CORS preflight headers."""
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_unauthorized_cv_route(client):
    """Test that protected CV routes require authorization."""
    response = client.post("/cv/upload")
    # Should be 401 Unauthorized or 403 Forbidden or 422 Unprocessable Entity
    assert response.status_code in (401, 403, 422)
