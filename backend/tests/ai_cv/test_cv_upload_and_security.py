import io
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from core.security import get_current_user, verify_admin


def _create_fake_pdf(content: bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n") -> bytes:
    """Helper to generate a valid PDF byte sequence starting with %PDF."""
    return content.ljust(150, b" ")


def test_upload_cv_requires_authentication(client):
    """Unauthenticated upload must be rejected with 401/403."""
    response = client.post(
        "/api/upload-and-analyze",
        files={"file": ("resume.pdf", _create_fake_pdf(), "application/pdf")},
        data={"user_id": "11111111-1111-4111-8111-111111111111"},
    )
    assert response.status_code in (401, 403)


def test_upload_cv_rejects_user_id_mismatch(authed_client, mock_student):
    """Student cannot upload CV for another user's ID."""
    other_user_id = "99999999-9999-4999-8999-999999999999"
    response = authed_client.post(
        "/api/upload-and-analyze",
        files={"file": ("resume.pdf", _create_fake_pdf(), "application/pdf")},
        data={"user_id": other_user_id},
    )
    assert response.status_code == 403
    assert "User ID mismatch" in response.json().get("detail", "")


def test_upload_cv_rejects_non_pdf_magic_bytes(authed_client, mock_student):
    """File claiming to be PDF but without %PDF magic bytes must be rejected."""
    fake_content = b"This is plain text pretending to be a PDF file." * 4
    response = authed_client.post(
        "/api/upload-and-analyze",
        files={"file": ("malicious.pdf", fake_content, "application/pdf")},
        data={"user_id": mock_student.id},
    )
    assert response.status_code == 400
    assert "not a valid PDF" in response.json().get("detail", "")


def test_upload_cv_rejects_empty_or_tiny_file(authed_client, mock_student):
    """File smaller than 100 bytes must be rejected."""
    tiny_content = b"%PDF-1.4 empty"
    response = authed_client.post(
        "/api/upload-and-analyze",
        files={"file": ("empty.pdf", tiny_content, "application/pdf")},
        data={"user_id": mock_student.id},
    )
    assert response.status_code == 400
    assert "empty or corrupted" in response.json().get("detail", "")


def test_upload_cv_rejects_oversized_file(authed_client, mock_student):
    """File larger than 5MB must be rejected with 400/413."""
    oversized = b"%PDF-1.4" + (b"0" * (5 * 1024 * 1024 + 100))
    response = authed_client.post(
        "/api/upload-and-analyze",
        files={"file": ("huge.pdf", oversized, "application/pdf")},
        data={"user_id": mock_student.id},
    )
    assert response.status_code in (400, 413)
    assert "File too large" in response.json().get("detail", "")


def test_upload_cv_success_enqueues_job(authed_client, mock_student):
    """Valid upload saves to user-scoped storage path and enqueues job."""
    pdf_bytes = _create_fake_pdf()

    with patch("routers.cv.supabase") as mock_supabase, \
         patch("routers.cv.enqueue") as mock_enqueue, \
         patch("routers.cv.extract_text", return_value="Experienced software engineer proficient in Python, TypeScript, and React with full-stack development history."), \
         patch("routers.cv.save_cv_text_and_url"):

        # Mock storage upload & signed url
        mock_storage = MagicMock()
        mock_supabase.storage.from_.return_value = mock_storage
        mock_storage.upload.return_value = {"Key": f"{mock_student.id}/test.pdf"}
        mock_storage.create_signed_url.return_value = {"signedURL": "https://storage.supabase.co/signed/test.pdf"}

        # Mock profiles table update
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.update.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = MagicMock(data=[{"id": mock_student.id}])

        mock_enqueue.return_value = "job-uuid-123"

        response = authed_client.post(
            "/api/upload-and-analyze",
            files={"file": ("my_resume.pdf", pdf_bytes, "application/pdf")},
            data={"user_id": mock_student.id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "processing"
        assert "CV received" in data.get("message", "")

        # Verify storage destination path was scoped to user_id
        upload_call_args = mock_storage.upload.call_args
        storage_dest = upload_call_args[0][0]
        assert storage_dest.startswith(f"{mock_student.id}/")
        assert storage_dest.endswith(".pdf")


def test_refresh_cv_url_student_can_refresh_own_url(authed_client, mock_student):
    """Student can refresh their own CV signed URL."""
    with patch("routers.cv.supabase") as mock_supabase, \
         patch("routers.cv.get_user_profile") as mock_profile, \
         patch("routers.cv.save_cv_text_and_url"), \
         patch("routers.cv._can_view_student_cv", return_value=True):
        mock_storage = MagicMock()
        mock_supabase.storage.from_.return_value = mock_storage
        mock_storage.create_signed_url.return_value = {
            "signedURL": "https://storage.supabase.co/signed/fresh.pdf"
        }

        mock_profile.return_value = {
            "id": mock_student.id,
            "cv_url": f"https://storage.supabase.co/storage/v1/object/public/cv_uploads/{mock_student.id}/cv.pdf"
        }

        response = authed_client.post(
            "/api/refresh-cv-url",
            json={"user_id": mock_student.id},
        )
        assert response.status_code == 200
        assert "fresh.pdf" in response.json().get("cv_url", "")


def test_refresh_cv_url_unrelated_student_forbidden(client, mock_student):
    """Another student cannot refresh someone else's CV URL."""
    other_student = SimpleNamespace(
        id="99999999-9999-4999-8999-999999999999",
        email="other@pau.edu.ng",
        user_metadata={"role": "student"},
        app_metadata={},
        role="authenticated",
    )
    from main import app
    app.dependency_overrides[get_current_user] = lambda: other_student

    with patch("routers.cv._can_view_student_cv", return_value=False):
        response = client.post(
            "/api/refresh-cv-url",
            json={"user_id": mock_student.id},
        )
        assert response.status_code == 403


def test_refresh_cv_url_admin_allowed(admin_client, mock_student):
    """Admin is authorized to refresh any student's CV URL."""
    with patch("routers.cv.supabase") as mock_supabase, \
         patch("routers.cv.get_user_profile") as mock_profile, \
         patch("routers.cv.save_cv_text_and_url"), \
         patch("routers.cv._can_view_student_cv", return_value=True):
        mock_storage = MagicMock()
        mock_supabase.storage.from_.return_value = mock_storage
        mock_storage.create_signed_url.return_value = {
            "signedURL": "https://storage.supabase.co/signed/admin-fresh.pdf"
        }

        mock_profile.return_value = {
            "id": mock_student.id,
            "cv_url": f"https://storage.supabase.co/storage/v1/object/public/cv_uploads/{mock_student.id}/cv.pdf"
        }

        response = admin_client.post(
            "/api/refresh-cv-url",
            json={"user_id": mock_student.id},
        )
        assert response.status_code == 200
        assert "admin-fresh.pdf" in response.json().get("cv_url", "")


def test_debug_endpoint_secured_against_regular_users(authed_client, mock_student):
    """GET /debug/match-results/{user_id} must reject regular students."""
    response = authed_client.get(f"/debug/match-results/{mock_student.id}")
    assert response.status_code in (401, 403)


def test_debug_endpoint_admin_allowed_with_valid_uuid(admin_client, mock_student):
    """GET /debug/match-results/{user_id} allows admin with valid UUID."""
    with patch("routers.cv.supabase") as mock_supabase:
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = MagicMock(
            data=[{"user_id": mock_student.id, "internship_id": "job-1", "match_score": 85}]
        )

        response = admin_client.get(f"/debug/match-results/{mock_student.id}")
        assert response.status_code == 200
        assert response.json()["user_id"] == mock_student.id
