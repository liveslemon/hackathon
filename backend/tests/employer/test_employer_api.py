from unittest.mock import MagicMock, patch
from main import app
from core.security import get_current_user

def test_get_applicants_unauthorized(client):
    """Accessing applicants endpoint without auth header should fail."""
    response = client.get("/api/internships/job-1/applicants")
    assert response.status_code in (401, 403)

def test_get_applicants_cross_employer_forbidden(client, mock_other_user):
    """Employer A cannot fetch applicants for Employer B's internship."""
    app.dependency_overrides[get_current_user] = lambda: mock_other_user
    try:
        with patch("routers.applications.supabase") as mock_supabase:
            # Mock internship lookup returning a different poster_id
            mock_table = MagicMock()
            mock_supabase.table.return_value = mock_table
            
            # select("poster_id").eq("id", ...).maybe_single().execute()
            mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                data={"poster_id": "emp-123"}
            )
            
            # User profile is not admin
            mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                data={"is_admin": False, "role": "employer"}
            )

            response = client.get("/api/internships/job-1/applicants")
            assert response.status_code == 403
            assert "Not authorized" in response.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)

def test_get_applicants_owner_success(client, mock_employer_user):
    """The owner employer can fetch applicants."""
    app.dependency_overrides[get_current_user] = lambda: mock_employer_user
    try:
        with patch("routers.applications.supabase") as mock_supabase:
            mock_table = MagicMock()
            mock_supabase.table.return_value = mock_table

            # Internship ownership check
            mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                data={"poster_id": "emp-123"}
            )

            # Applicants query
            mock_table.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
                data=[
                    {
                        "id": "app-1",
                        "user_id": "stu-1",
                        "status": "pending",
                        "match_score": 85,
                        "cover_letter": "I want to apply",
                        "created_at": "2026-10-12T00:00:00Z",
                        "profiles": {"full_name": "Student One", "course": "CS", "level": "400"},
                    }
                ]
            )

            response = client.get("/api/internships/job-1/applicants")
            assert response.status_code == 200
            data = response.json()
            assert "applicants" in data
            assert len(data["applicants"]) == 1
            assert data["applicants"][0]["match_score"] == 85
    finally:
        app.dependency_overrides.pop(get_current_user, None)

def test_update_application_status_not_found(client, mock_employer_user):
    """Returns 404 when application does not exist."""
    app.dependency_overrides[get_current_user] = lambda: mock_employer_user
    try:
        with patch("routers.applications.supabase") as mock_supabase:
            mock_table = MagicMock()
            mock_supabase.table.return_value = mock_table
            mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
                data=None
            )

            response = client.put(
                "/api/applications/nonexistent/status",
                json={"status": "accepted"}
            )
            assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)

def test_update_application_status_owner_success(client, mock_employer_user):
    """Owner employer can successfully update status."""
    app.dependency_overrides[get_current_user] = lambda: mock_employer_user
    try:
        with patch("routers.applications.supabase") as mock_supabase:
            mock_table = MagicMock()
            mock_supabase.table.return_value = mock_table

            # Application query followed by internship ownership check
            mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.side_effect = [
                MagicMock(data={"id": "app-1", "internship_id": "job-1"}),
                MagicMock(data={"poster_id": "emp-123"}),
            ]

            # Update call
            mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{}])

            response = client.put(
                "/api/applications/app-1/status",
                json={"status": "accepted"}
            )
            assert response.status_code == 200
            assert response.json()["success"] is True
    finally:
        app.dependency_overrides.pop(get_current_user, None)
