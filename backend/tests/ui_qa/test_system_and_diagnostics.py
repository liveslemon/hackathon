def test_root_endpoint(client):
    """Test root API metadata endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "online"


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "healthy"


def test_readiness_probe(client):
    """Test readiness check with database connectivity."""
    response = client.get("/ready")
    assert response.status_code in (200, 503)
    data = response.json()
    assert data.get("status") in ("ready", "degraded")


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


def test_unauthorized_access_rejected(client):
    """Test that protected endpoints reject unauthenticated requests."""
    res_db = client.get("/test-supabase")
    assert res_db.status_code in (401, 403)

    res_cv = client.post("/upload-and-analyze")
    assert res_cv.status_code in (401, 403, 422)
