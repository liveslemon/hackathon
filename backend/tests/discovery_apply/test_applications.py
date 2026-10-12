import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from main import app
from core.security import get_current_user


def test_submit_application_success(client):
    mock_student = {
        "id": "student-123",
        "full_name": "Test Student",
        "cv_text": "Experienced Python and React developer",
        "cv_url": "https://example.com/cv.pdf",
    }
    mock_job = {
        "id": "job-456",
        "role": "Software Engineering Intern",
        "company": "Acme Labs",
        "status": "active",
        "deadline": "2027-01-01",
        "employer_id": "employer-999",
    }

    mock_supabase = MagicMock()
    # Mock internships query
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data=mock_job
    )
    # Mock match_results query
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data={"match_score": 85}
    )
    # Mock existing application check (empty data => not applied yet)
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data=None
    )
    # Mock insert
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "app-101"}]
    )

    with patch("routers.applications.get_user_profile", return_value=mock_student), \
         patch("routers.applications.supabase", mock_supabase):
        res = client.post(
            "/api/submit-application",
            json={
                "user_id": "student-123",
                "internship_id": "job-456",
                "cover_letter": "I am passionate about this role.",
            },
        )
        assert res.status_code == 200
        assert res.json() == {"success": True}


def test_submit_application_wrong_user(client):
    res = client.post(
        "/api/submit-application",
        json={
            "user_id": "different-user-999",
            "internship_id": "job-456",
            "cover_letter": "Test cover letter",
        },
    )
    assert res.status_code == 403
    assert "User ID mismatch" in res.json()["detail"]


def test_submit_application_closed_internship(client):
    mock_student = {
        "id": "student-123",
        "full_name": "Test Student",
        "cv_text": "Experienced Python developer",
    }
    mock_job = {
        "id": "job-456",
        "role": "Software Engineering Intern",
        "status": "closed",
        "deadline": "2027-01-01",
    }

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data=mock_job
    )

    with patch("routers.applications.get_user_profile", return_value=mock_student), \
         patch("routers.applications.supabase", mock_supabase):
        res = client.post(
            "/api/submit-application",
            json={
                "user_id": "student-123",
                "internship_id": "job-456",
                "cover_letter": "Test letter",
            },
        )
        assert res.status_code == 410
        assert "closed" in res.json()["detail"].lower()


def test_submit_application_expired_deadline(client):
    mock_student = {
        "id": "student-123",
        "full_name": "Test Student",
        "cv_text": "Experienced Python developer",
    }
    mock_job = {
        "id": "job-456",
        "role": "Software Engineering Intern",
        "status": "active",
        "deadline": "2025-01-01",
    }

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data=mock_job
    )

    with patch("routers.applications.get_user_profile", return_value=mock_student), \
         patch("routers.applications.supabase", mock_supabase):
        res = client.post(
            "/api/submit-application",
            json={
                "user_id": "student-123",
                "internship_id": "job-456",
                "cover_letter": "Test letter",
            },
        )
        assert res.status_code == 410
        assert "deadline has passed" in res.json()["detail"]


def test_submit_application_duplicate(client):
    mock_student = {
        "id": "student-123",
        "full_name": "Test Student",
        "cv_text": "Experienced developer",
    }
    mock_job = {
        "id": "job-456",
        "role": "Software Engineering Intern",
        "status": "active",
        "deadline": "2027-01-01",
    }

    def table_mock(name):
        table = MagicMock()
        if name == "internships":
            table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=mock_job)
        elif name == "match_results":
            table.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data={"match_score": 90})
        elif name == "applied_internships":
            # Existing application found
            table.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data={"id": "existing-app-1"})
        return table

    mock_supabase = MagicMock()
    mock_supabase.table.side_effect = table_mock

    with patch("routers.applications.get_user_profile", return_value=mock_student), \
         patch("routers.applications.supabase", mock_supabase):
        res = client.post(
            "/api/submit-application",
            json={
                "user_id": "student-123",
                "internship_id": "job-456",
                "cover_letter": "Test letter",
            },
        )
        assert res.status_code == 409
        assert "already applied" in res.json()["detail"].lower()


def test_submit_application_duplicate_race_condition(client):
    mock_student = {
        "id": "student-123",
        "full_name": "Test Student",
        "cv_text": "Experienced developer",
    }
    mock_job = {
        "id": "job-456",
        "role": "Software Engineering Intern",
        "status": "active",
        "deadline": "2027-01-01",
    }

    def table_mock(name):
        table = MagicMock()
        if name == "internships":
            table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=mock_job)
        elif name == "match_results":
            table.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=None)
        elif name == "applied_internships":
            # Select returns None (race window), but insert throws 23505 duplicate key
            table.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=None)
            table.insert.return_value.execute.side_effect = Exception("duplicate key value violates unique constraint 23505")
        return table

    mock_supabase = MagicMock()
    mock_supabase.table.side_effect = table_mock

    with patch("routers.applications.get_user_profile", return_value=mock_student), \
         patch("routers.applications.supabase", mock_supabase):
        res = client.post(
            "/api/submit-application",
            json={
                "user_id": "student-123",
                "internship_id": "job-456",
                "cover_letter": "Test letter",
            },
        )
        assert res.status_code == 409
        assert "already applied" in res.json()["detail"].lower()


def test_submit_application_no_cv(client):
    mock_student = {
        "id": "student-123",
        "full_name": "Test Student",
        # No cv_text, cv_url, or resume_url
    }
    mock_supabase = MagicMock()
    # student_cvs table has no row
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=None)

    with patch("routers.applications.get_user_profile", return_value=mock_student), \
         patch("routers.applications.supabase", mock_supabase):
        res = client.post(
            "/api/submit-application",
            json={
                "user_id": "student-123",
                "internship_id": "job-456",
                "cover_letter": "Test letter",
            },
        )
        assert res.status_code == 400
        assert "No CV found" in res.json()["detail"]


def test_draft_cover_letter_success(client):
    mock_student = {
        "id": "student-123",
        "full_name": "Test Student",
        "cv_text": "Experienced full-stack developer with React and Node.js skills.",
        "phone": "+2348012345678",
    }
    mock_job = {
        "id": "job-456",
        "role": "Frontend Developer",
        "company": "TechCorp",
        "status": "active",
        "deadline": "2027-01-01",
    }

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data=mock_job
    )

    with patch("routers.applications.get_user_profile", return_value=mock_student), \
         patch("routers.applications.supabase", mock_supabase), \
         patch("routers.applications.generate_cover_letter", new=AsyncMock(return_value="Dear Hiring Manager, I am writing to apply...")):
        res = client.post(
            "/api/draft-cover-letter",
            json={
                "user_id": "student-123",
                "internship_id": "job-456",
            },
        )
        assert res.status_code == 200
        assert "cover_letter" in res.json()
        assert "Dear Hiring Manager" in res.json()["cover_letter"]


def test_draft_cover_letter_wrong_user(client):
    res = client.post(
        "/api/draft-cover-letter",
        json={
            "user_id": "other-user-999",
            "internship_id": "job-456",
        },
    )
    assert res.status_code == 403
    assert "User ID mismatch" in res.json()["detail"]


def test_draft_cover_letter_closed_internship(client):
    mock_student = {
        "id": "student-123",
        "full_name": "Test Student",
        "cv_text": "Experienced developer",
    }
    mock_job = {
        "id": "job-456",
        "role": "Frontend Developer",
        "status": "closed",
        "deadline": "2027-01-01",
    }

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data=mock_job
    )

    with patch("routers.applications.get_user_profile", return_value=mock_student), \
         patch("routers.applications.supabase", mock_supabase):
        res = client.post(
            "/api/draft-cover-letter",
            json={
                "user_id": "student-123",
                "internship_id": "job-456",
            },
        )
        assert res.status_code == 410


def test_draft_cover_letter_stream(client):
    mock_student = {
        "id": "student-123",
        "full_name": "Test Student",
        "cv_text": "Experienced developer",
        "phone_number": "+2348099999999",
    }
    mock_job = {
        "id": "job-456",
        "role": "Frontend Developer",
        "status": "active",
        "deadline": "2027-01-01",
    }

    async def mock_stream_gen(*args, **kwargs):
        yield "data: Hello\n\n"
        yield "data: World\n\n"
        yield "data: [DONE]\n\n"

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data=mock_job
    )

    with patch("routers.applications.get_user_profile", return_value=mock_student), \
         patch("routers.applications.supabase", mock_supabase), \
         patch("services.routing_service.generate_cover_letter_stream", side_effect=mock_stream_gen):
        res = client.post(
            "/api/draft-cover-letter-stream",
            json={
                "user_id": "student-123",
                "internship_id": "job-456",
            },
        )
        assert res.status_code == 200
        assert "Hello" in res.text
        assert "World" in res.text


def test_update_status_employer_authorized(mock_employer):
    app.dependency_overrides[get_current_user] = lambda: mock_employer
    mock_app = {"id": "app-101", "internship_id": "job-456"}
    mock_job = {"poster_id": "employer-999", "employer_id": "employer-999"}

    def table_mock(name):
        table = MagicMock()
        if name == "applied_internships":
            table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=mock_app)
            table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{}])
        elif name == "internships":
            table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=mock_job)
        return table

    mock_supabase = MagicMock()
    mock_supabase.table.side_effect = table_mock

    with patch("routers.applications.supabase", mock_supabase):
        from fastapi.testclient import TestClient
        with TestClient(app, raise_server_exceptions=False) as c:
            res = c.put(
                "/api/applications/app-101/status",
                json={"status": "accepted"},
            )
            assert res.status_code == 200
            assert res.json() == {"success": True}
    app.dependency_overrides.clear()


def test_update_status_unauthorized_user(client):
    mock_app = {"id": "app-101", "internship_id": "job-456"}
    # Job owned by someone else
    mock_job = {"poster_id": "other-employer", "employer_id": "other-employer"}
    mock_profile = {"is_admin": False, "role": "student"}

    def table_mock(name):
        table = MagicMock()
        if name == "applied_internships":
            table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=mock_app)
        elif name == "internships":
            table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=mock_job)
        elif name == "profiles":
            table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=mock_profile)
        return table

    mock_supabase = MagicMock()
    mock_supabase.table.side_effect = table_mock

    with patch("routers.applications.supabase", mock_supabase):
        res = client.put(
            "/api/applications/app-101/status",
            json={"status": "accepted"},
        )
        assert res.status_code == 403
        assert "Not authorized" in res.json()["detail"]
