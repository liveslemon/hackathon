"""
Tests verifying the shared test harness (conftest.py), auth fixtures, and mock Supabase.
"""

from core.config import settings
from tests.conftest import (
    ADMIN_TOKEN,
    ADMIN_USER_ID,
    EMPLOYER_TOKEN,
    EMPLOYER_USER_ID,
    STUDENT_TOKEN,
    STUDENT_USER_ID,
)


def test_public_system_endpoints(client):
    """Liveness probe and home endpoint work without auth."""
    res_home = client.get("/")
    assert res_home.status_code == 200
    assert res_home.json() == {"status": "online"}

    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json() == {"status": "healthy"}


def test_ready_endpoint_with_mock_db(client):
    """Readiness probe uses mocked Supabase database."""
    res = client.get("/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["checks"]["database"] == "ok"


def test_auth_fixtures_and_headers(client, student_headers, employer_headers, admin_headers):
    """Authenticated endpoints correctly resolve mocked tokens."""
    # Test-supabase requires auth
    res_unauth = client.get("/test-supabase")
    assert res_unauth.status_code == 401

    res_student = client.get("/test-supabase", headers=student_headers)
    assert res_student.status_code == 200
    assert res_student.json()["status"] == "success"

    res_admin = client.get("/test-supabase", headers=admin_headers)
    assert res_admin.status_code == 200
    assert res_admin.json()["status"] == "success"


def test_mock_supabase_query(mock_supabase):
    """MockSupabase returns seeded table data and handles filters."""
    profiles = mock_supabase.table("profiles").select("*").eq("id", STUDENT_USER_ID).execute()
    assert len(profiles.data) == 1
    assert profiles.data[0]["email"] == "student@pau.edu.ng"

    non_existent = mock_supabase.table("profiles").select("*").eq("id", "non-existent").execute()
    assert len(non_existent.data) == 0


def test_mock_supabase_storage(mock_supabase):
    """MockSupabase storage returns valid mock signed URLs."""
    res = mock_supabase.storage.from_("cvs").create_signed_url("test.pdf", 3600)
    assert "signedURL" in res
    assert res["signedURL"].startswith("https://mock-storage.supabase.co/cvs/test.pdf")
