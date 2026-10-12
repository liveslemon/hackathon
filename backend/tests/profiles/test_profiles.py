import pytest
from unittest.mock import MagicMock, patch


# ==============================================================================
# 1. Employer Profile Update (PATCH /api/employer/profile)
# ==============================================================================

def test_update_company_profile_success(employer_client):
    with patch("routers.profiles.supabase") as mock_supabase:
        # Mock role check
        mock_select = MagicMock()
        mock_select.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"role": "employer"}
        )
        # Mock update
        mock_update = MagicMock()
        mock_update.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "22222222-2222-2222-2222-222222222222", "company_name": "Paystack Inc"}]
        )
        mock_supabase.table.side_effect = lambda t: mock_select if t == "profiles" and mock_select.call_count == 0 else mock_update

        payload = {
            "company_name": "Paystack Inc",
            "company_website": "https://paystack.com",
            "company_description": "Modern online and offline payments for Africa.",
            "industry": "Fintech",
        }
        res = employer_client.patch("/api/employer/profile", json=payload)
        assert res.status_code == 200
        assert res.json()["message"] == "Company profile updated successfully"


def test_update_company_profile_forbidden_for_student(student_client):
    with patch("routers.profiles.supabase") as mock_supabase:
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"role": "student"}
        )
        mock_supabase.table.return_value = mock_table

        payload = {"company_description": "We are a tech firm."}
        res = student_client.patch("/api/employer/profile", json=payload)
        assert res.status_code == 403
        assert "Only employers" in res.json()["detail"]


def test_update_company_profile_invalid_url(employer_client):
    payload = {
        "company_website": "not-a-valid-url-format",
    }
    res = employer_client.patch("/api/employer/profile", json=payload)
    assert res.status_code == 422  # Pydantic validation error


def test_update_company_profile_empty_payload(employer_client):
    with patch("routers.profiles.supabase") as mock_supabase:
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"role": "employer"}
        )
        mock_supabase.table.return_value = mock_table

        res = employer_client.patch("/api/employer/profile", json={})
        assert res.status_code == 200
        assert res.json()["message"] == "No data to update"


# ==============================================================================
# 2. Public Company Profile (GET /api/companies/{employer_id})
# ==============================================================================

def test_get_company_profile_success(employer_client):
    employer_id = "22222222-2222-2222-2222-222222222222"
    with patch("routers.profiles.supabase") as mock_supabase:
        mock_profile_table = MagicMock()
        mock_profile_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data={
                "id": employer_id,
                "role": "employer",
                "company_name": "Paystack",
                "company_description": "Payments for Africa",
            }
        )

        mock_internships_table = MagicMock()
        mock_internships_table.select.return_value.or_.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "job-1", "role": "Backend Intern", "company": "Paystack"}
            ]
        )

        def table_router(table_name):
            if table_name == "profiles":
                return mock_profile_table
            return mock_internships_table

        mock_supabase.table.side_effect = table_router

        res = employer_client.get(f"/api/companies/{employer_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["company"]["company_name"] == "Paystack"
        assert len(data["internships"]) == 1
        assert data["internships"][0]["role"] == "Backend Intern"


def test_get_company_profile_not_found(employer_client):
    employer_id = "33333333-3333-3333-3333-333333333333"
    with patch("routers.profiles.supabase") as mock_supabase:
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data=None
        )
        mock_supabase.table.return_value = mock_table

        res = employer_client.get(f"/api/companies/{employer_id}")
        assert res.status_code == 404


def test_get_company_profile_invalid_uuid(employer_client):
    res = employer_client.get("/api/companies/invalid-uuid-format")
    assert res.status_code == 400
    assert "Invalid ID format" in res.json()["detail"]


# ==============================================================================
# 3. Student Account Deletion (POST /api/me/delete)
# ==============================================================================

def test_delete_account_success(student_client):
    with patch("routers.profiles.supabase") as mock_supabase:
        # Mock profile query
        mock_profile = MagicMock()
        mock_profile.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data={
                "role": "student",
                "cv_url": "https://xyz.supabase.co/storage/v1/object/sign/cvs/test-cv-uuid.pdf?token=abc",
            }
        )

        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.delete.return_value.eq.return_value.execute.return_value = MagicMock()

        def table_side_effect(t):
            if t == "profiles":
                return mock_profile
            return mock_table

        mock_supabase.table.side_effect = table_side_effect
        mock_supabase.storage.from_.return_value.remove.return_value = None
        mock_supabase.auth.admin.delete_user.return_value = None

        res = student_client.post("/api/me/delete", json={"confirm": "DELETE"})
        assert res.status_code == 200
        assert res.json() == {"deleted": True}
        # Check storage deletion was invoked
        mock_supabase.storage.from_.assert_called_with("cvs")
        # Check auth admin deletion was invoked
        mock_supabase.auth.admin.delete_user.assert_called_once()


def test_delete_account_missing_confirm(student_client):
    res = student_client.post("/api/me/delete", json={"confirm": "no"})
    assert res.status_code == 400
    assert "Type DELETE to confirm" in res.json()["detail"]


def test_delete_account_employer_forbidden(employer_client):
    with patch("routers.profiles.supabase") as mock_supabase:
        mock_profile = MagicMock()
        mock_profile.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data={"role": "employer"}
        )
        mock_supabase.table.return_value = mock_profile

        res = employer_client.post("/api/me/delete", json={"confirm": "DELETE"})
        assert res.status_code == 403
        assert "Only student accounts can be deleted here" in res.json()["detail"]


# ==============================================================================
# 4. Refresh Matches (POST /api/me/refresh-matches)
# ==============================================================================

def test_refresh_matches_enqueues_job(student_client):
    with patch("routers.profiles.enqueue") as mock_enqueue:
        mock_enqueue.return_value = "job-123"
        res = student_client.post("/api/me/refresh-matches")
        assert res.status_code == 200
        assert res.json() == {"status": "processing"}
        mock_enqueue.assert_called_once()
