"""GET /api/applications/student had no test after integration."""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from core.security import get_current_user
from main import app


def _client_as(user_id):
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=user_id, email="s@pau.edu.ng")
    return TestClient(app)


@patch("routers.applications.supabase")
def test_student_applications_scoped_to_caller_and_paginated(mock_supabase):
    query = mock_supabase.table.return_value.select.return_value
    query.eq.return_value.order.return_value.range.return_value.execute.return_value = SimpleNamespace(
        data=[{"id": "app-1", "status": "pending"}]
    )
    try:
        res = _client_as("student-42").get("/api/applications/student?page=2&page_size=10")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    body = res.json()
    assert body["applications"] == [{"id": "app-1", "status": "pending"}]
    assert (body["page"], body["page_size"]) == (2, 10)
    query.eq.assert_called_once_with("user_id", "student-42")
    query.eq.return_value.order.return_value.range.assert_called_once_with(10, 19)


def test_student_applications_requires_login():
    app.dependency_overrides.clear()
    res = TestClient(app).get("/api/applications/student")
    assert res.status_code in (401, 403)


@patch("routers.applications.supabase")
def test_student_applications_rejects_oversized_page(mock_supabase):
    try:
        res = _client_as("student-42").get("/api/applications/student?page_size=500")
    finally:
        app.dependency_overrides.clear()
    assert res.status_code == 422
    mock_supabase.table.assert_not_called()
