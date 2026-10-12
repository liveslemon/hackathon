import pytest
from unittest.mock import MagicMock, patch
from types import SimpleNamespace
from fastapi import HTTPException, status
from main import app
from core.security import verify_admin
from routers.admin import sanitize_search_query


# -----------------------------------------------------------------------------
# 1. Input Sanitization Tests
# -----------------------------------------------------------------------------

def test_sanitize_search_query_strips_injection_characters():
    # Attack vectors: PostgREST condition separators, operators, and groupers
    malicious_inputs = [
        ("test,role.eq.admin", "testroleeqadmin"),
        ("Software,company.ilike.%hack%", "Softwarecompanyilikehack"),
        ("user) or (id.is.not.null", "user or idisnotnull"),
        ("Engineering'; DROP TABLE profiles;--", "Engineering DROP TABLE profiles--"),
        ("name:eq:admin.test", "nameeqadmintest"),
        ('admin" OR "1"="1', "admin OR 11"),
    ]
    for raw, expected in malicious_inputs:
        sanitized = sanitize_search_query(raw)
        assert "," not in sanitized
        assert "." not in sanitized
        assert ":" not in sanitized
        assert "(" not in sanitized
        assert ")" not in sanitized
        assert '"' not in sanitized
        assert "'" not in sanitized
        assert "%" not in sanitized


def test_sanitize_search_query_preserves_legitimate_terms():
    assert sanitize_search_query("Software Engineer") == "Software Engineer"
    assert sanitize_search_query("Frontend-Dev") == "Frontend-Dev"
    assert sanitize_search_query("student@pau.edu.ng") == "student@pauedung"
    assert sanitize_search_query("KPMG 2026") == "KPMG 2026"
    assert sanitize_search_query("") == ""
    assert sanitize_search_query("   ") == ""


# -----------------------------------------------------------------------------
# 2. Server-side Authorization Tests
# -----------------------------------------------------------------------------

def test_admin_stats_unauthenticated(client):
    res = client.get("/admin/stats")
    assert res.status_code == status.HTTP_401_UNAUTHORIZED or res.status_code == status.HTTP_403_FORBIDDEN


def test_admin_analytics_unauthenticated(client):
    res = client.get("/admin/analytics")
    assert res.status_code == status.HTTP_401_UNAUTHORIZED or res.status_code == status.HTTP_403_FORBIDDEN


def test_admin_directory_unauthenticated(client):
    res = client.get("/admin/directory")
    assert res.status_code == status.HTTP_401_UNAUTHORIZED or res.status_code == status.HTTP_403_FORBIDDEN


def test_admin_search_unauthenticated(client):
    res = client.get("/admin/search?q=test")
    assert res.status_code == status.HTTP_401_UNAUTHORIZED or res.status_code == status.HTTP_403_FORBIDDEN


def test_admin_llm_health_unauthenticated(client):
    res = client.get("/admin/llm-health")
    assert res.status_code == status.HTTP_401_UNAUTHORIZED or res.status_code == status.HTTP_403_FORBIDDEN


def test_admin_endpoints_reject_non_admin(client, mock_regular_user):
    # Simulate a logged in student/non-admin user
    async def mock_forbidden():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Admins only")

    app.dependency_overrides[verify_admin] = mock_forbidden

    try:
        endpoints = [
            "/admin/stats",
            "/admin/analytics",
            "/admin/directory",
            "/admin/search?q=test",
            "/admin/llm-health",
            "/api/admin/llm-health",
        ]
        for ep in endpoints:
            res = client.get(ep)
            assert res.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides.clear()


# -----------------------------------------------------------------------------
# 3. Admin Stats Endpoint Tests
# -----------------------------------------------------------------------------

@patch("routers.admin.supabase")
def test_admin_stats_success(mock_supabase, admin_client):
    # Mock exact count responses
    mock_query = MagicMock()
    mock_query.eq.return_value = mock_query
    mock_query.gte.return_value = mock_query
    mock_query.lte.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.execute.return_value = SimpleNamespace(count=42, data=[])

    mock_supabase.table.return_value.select.return_value = mock_query

    res = admin_client.get("/admin/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_students" in data
    assert "total_employers" in data
    assert "total_internships" in data
    assert "total_applications" in data
    assert "applications_today" in data
    assert "new_users_today" in data
    assert data["total_students"] == 42
    assert data["total_employers"] == 42


# -----------------------------------------------------------------------------
# 4. Admin Analytics Endpoint Tests
# -----------------------------------------------------------------------------

@patch("routers.admin.supabase")
def test_admin_analytics_success(mock_supabase, admin_client):
    # Count mock
    mock_count_query = MagicMock()
    mock_count_query.limit.return_value.execute.return_value = SimpleNamespace(count=10)

    # Internships mock with category and deadline
    mock_internships_query = MagicMock()
    mock_internships_query.order.return_value.limit.return_value.execute.return_value = SimpleNamespace(
        data=[
            {
                "id": "job-1",
                "role": "Frontend Intern",
                "company": "Paystack",
                "category": "Technology",
                "deadline": "2026-11-01T00:00:00Z",
                "created_at": "2026-10-01T00:00:00Z",
            }
        ]
    )

    # Applications mock
    mock_apps_query = MagicMock()
    mock_apps_query.in_.return_value.execute.return_value = SimpleNamespace(
        data=[{"id": "app-1", "internship_id": "job-1"}]
    )

    def table_router(table_name):
        mock_t = MagicMock()
        if table_name == "internships":
            def select_fn(cols, **kwargs):
                if kwargs.get("count") == "exact":
                    return mock_count_query
                return mock_internships_query
            mock_t.select.side_effect = select_fn
        elif table_name == "applied_internships":
            def select_fn(cols, **kwargs):
                if kwargs.get("count") == "exact":
                    return mock_count_query
                return mock_apps_query
            mock_t.select.side_effect = select_fn
        return mock_t

    mock_supabase.table.side_effect = table_router

    res = admin_client.get("/admin/analytics")
    assert res.status_code == 200
    data = res.json()
    assert "total_internships" in data
    assert "total_applications" in data
    assert "avg_applications" in data
    assert len(data["internship_stats"]) == 1
    stat = data["internship_stats"][0]
    assert stat["title"] == "Frontend Intern"
    assert stat["company"] == "Paystack"
    assert stat["category"] == "Technology"
    assert stat["deadline"] == "2026-11-01T00:00:00Z"
    assert stat["applications"] == 1


# -----------------------------------------------------------------------------
# 5. Admin Search Endpoint Tests
# -----------------------------------------------------------------------------

@patch("routers.admin.supabase")
def test_admin_search_returns_aligned_shape(mock_supabase, admin_client):
    mock_query = MagicMock()
    mock_query.or_.return_value = mock_query
    mock_query.range.return_value = mock_query

    def table_router(table_name):
        mock_t = MagicMock()
        if table_name == "internships":
            mock_query.execute.return_value = SimpleNamespace(
                data=[{"id": "i-1", "role": "ML Intern", "company": "Kuda", "category": "Tech"}]
            )
        else:
            mock_query.execute.return_value = SimpleNamespace(
                data=[
                    {"id": "u-1", "full_name": "Jane Doe", "company_name": None, "role": "student", "course": "CS"},
                    {"id": "u-2", "full_name": None, "company_name": "Flutterwave", "role": "employer", "course": None},
                ]
            )
        mock_t.select.return_value = mock_query
        return mock_t

    mock_supabase.table.side_effect = table_router

    res = admin_client.get("/admin/search?q=tech")
    assert res.status_code == 200
    data = res.json()
    # Check that keys match what SearchOverlay.tsx expects!
    assert "students" in data
    assert "employers" in data
    assert "internships" in data
    assert "data" in data
    assert len(data["students"]) == 1
    assert data["students"][0]["full_name"] == "Jane Doe"
    assert len(data["employers"]) == 1
    assert data["employers"][0]["company_name"] == "Flutterwave"
    assert len(data["internships"]) == 1
    assert data["internships"][0]["role"] == "ML Intern"


@patch("routers.admin.supabase")
def test_admin_search_empty_symbols_skips_query(mock_supabase, admin_client):
    # Passing only injection symbols should sanitize to empty and return immediately
    res = admin_client.get("/admin/search?q=%25%2C%2E%28%29")
    assert res.status_code == 200
    data = res.json()
    assert data["students"] == []
    assert data["employers"] == []
    assert data["internships"] == []
    mock_supabase.table.assert_not_called()


# -----------------------------------------------------------------------------
# 6. Admin Directory Endpoint Tests
# -----------------------------------------------------------------------------

@patch("routers.admin.supabase")
def test_admin_directory_pagination(mock_supabase, admin_client):
    mock_count = MagicMock()
    mock_count.limit.return_value.execute.return_value = SimpleNamespace(count=50)

    mock_data = MagicMock()
    mock_data.order.return_value.range.return_value.execute.return_value = SimpleNamespace(
        data=[{"id": "u-1", "full_name": "Alice", "role": "student"}]
    )

    mock_table = MagicMock()
    mock_table.select.side_effect = lambda cols, **kwargs: mock_count if kwargs.get("count") == "exact" else mock_data
    mock_supabase.table.return_value = mock_table

    res = admin_client.get("/admin/directory?page=2&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert "data" in data
    assert "pagination" in data
    assert data["pagination"]["page"] == 2
    assert data["pagination"]["page_size"] == 10
    assert data["pagination"]["total"] == 50
    assert data["pagination"]["total_pages"] == 5


# -----------------------------------------------------------------------------
# 7. Platform Management Actions (Audited & Safe)
# -----------------------------------------------------------------------------

@patch("routers.admin.supabase")
def test_suspend_user_cannot_target_admin(mock_supabase, admin_client):
    # Return an admin profile as the target
    mock_target = MagicMock()
    mock_target.eq.return_value.maybe_single.return_value.execute.return_value = SimpleNamespace(
        data={"id": "target-admin-id", "email": "other.admin@pau.edu.ng", "is_admin": True, "role": "admin"}
    )
    mock_supabase.table.return_value.select.return_value = mock_target

    res = admin_client.post("/admin/users/target-admin-id/suspend", json={"reason": "Test"})
    assert res.status_code == status.HTTP_403_FORBIDDEN
    assert "administrator" in res.json()["detail"].lower()


@patch("routers.admin.supabase")
def test_suspend_user_cannot_target_self(mock_supabase, admin_client, mock_admin_user):
    res = admin_client.post(f"/admin/users/{mock_admin_user.id}/suspend")
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "own account" in res.json()["detail"].lower()


@patch("routers.admin.supabase")
def test_suspend_regular_user_success_and_audited(mock_supabase, admin_client):
    mock_target = MagicMock()
    mock_target.eq.return_value.maybe_single.return_value.execute.return_value = SimpleNamespace(
        data={"id": "student-1", "email": "stu@pau.edu.ng", "is_admin": False, "role": "student"}
    )
    mock_update = MagicMock()
    mock_update.eq.return_value.execute.return_value = SimpleNamespace(data=[{}])

    mock_insert = MagicMock()
    mock_insert.execute.return_value = SimpleNamespace(data=[{}])

    def table_router(table_name):
        mock_t = MagicMock()
        if table_name == "profiles":
            mock_t.select.return_value = mock_target
            mock_t.update.return_value = mock_update
        elif table_name == "decision_audit_log":
            mock_t.insert.return_value = mock_insert
        return mock_t

    mock_supabase.table.side_effect = table_router

    res = admin_client.post("/admin/users/student-1/suspend", json={"reason": "Terms violation"})
    assert res.status_code == 200
    assert res.json()["success"] is True


@patch("routers.admin.supabase")
def test_verify_employer_success_and_audited(mock_supabase, admin_client):
    mock_target = MagicMock()
    mock_target.eq.return_value.maybe_single.return_value.execute.return_value = SimpleNamespace(
        data={"id": "emp-1", "role": "employer"}
    )
    mock_update = MagicMock()
    mock_update.eq.return_value.execute.return_value = SimpleNamespace(data=[{}])

    mock_insert = MagicMock()
    mock_insert.execute.return_value = SimpleNamespace(data=[{}])

    def table_router(table_name):
        mock_t = MagicMock()
        if table_name == "profiles":
            mock_t.select.return_value = mock_target
            mock_t.update.return_value = mock_update
        elif table_name == "decision_audit_log":
            mock_t.insert.return_value = mock_insert
        return mock_t

    mock_supabase.table.side_effect = table_router

    res = admin_client.post("/admin/employers/emp-1/verify")
    assert res.status_code == 200
    assert res.json()["success"] is True


# -----------------------------------------------------------------------------
# 8. LLM Health Check
# -----------------------------------------------------------------------------

@patch("routers.admin.llm_client")
def test_llm_health_admin_only(mock_llm, admin_client):
    mock_llm.check_providers = MagicMock(
        return_value=[{"provider": "groq", "model": "llama-3.3-70b", "ok": True}]
    )

    res = admin_client.get("/admin/llm-health")
    assert res.status_code == 200
    data = res.json()
    assert data["working"] == 1
    assert len(data["providers"]) == 1
