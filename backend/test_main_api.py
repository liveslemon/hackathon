"""
Mocked API tests for PAU Interconnect backend.
Converted by Agent 08 (Platform & DB Foundation) from legacy live test to mocked harness.
"""

import io
import uuid
import pytest
from tests.conftest import STUDENT_TOKEN, STUDENT_USER_ID, make_mock_user


def test_happy_path_upload_and_fetch(client, student_headers, mock_supabase, monkeypatch):
    """Tests the upload and analysis endpoint followed by matching fetch."""
    # Mock text extraction from PDF
    monkeypatch.setattr("routers.cv.extract_text", lambda path: "Skills: Python, FastAPI, SQL, Web Development and Software Engineering.")

    # Seed match results for student
    mock_supabase.data["match_results"] = [
        {
            "user_id": STUDENT_USER_ID,
            "internship_id": "internship-001",
            "match_score": 85,
            "matching_skills": ["Python", "FastAPI"],
            "missing_skills": ["Docker"],
            "reasoning": "Strong match based on Python and FastAPI skills.",
        }
    ]

    # Create dummy PDF in memory
    dummy_pdf = io.BytesIO(b"%PDF-1.4 1 0 obj << /Length 50 >> stream\nSkills: Python, FastAPI, SQL, Web Development.\nendstream\nendobj\ntrailer << /Root 1 0 R >>")
    files = {"file": ("resume.pdf", dummy_pdf, "application/pdf")}
    data = {"user_id": STUDENT_USER_ID}

    resp = client.post("/upload-and-analyze", data=data, files=files, headers=student_headers)
    assert resp.status_code == 200
    res_json = resp.json()
    assert res_json["status"] == "processing"
    assert "cv_url" in res_json

    # Step 2: Fetch my matches
    resp_matches = client.get("/my-matches", params={"user_id": STUDENT_USER_ID}, headers=student_headers)
    assert resp_matches.status_code == 200
    matches_json = resp_matches.json()
    assert "matches" in matches_json
    assert len(matches_json["matches"]) >= 1


def test_upload_invalid_file_type(client, student_headers):
    """Tests that the server rejects non-PDF files with 400 Bad Request."""
    invalid_file = io.BytesIO(b"This is a plain text file, not a PDF.")
    files = {"file": ("dummy.txt", invalid_file, "text/plain")}
    data = {"user_id": STUDENT_USER_ID}

    resp = client.post("/upload-and-analyze", data=data, files=files, headers=student_headers)
    assert resp.status_code == 400
    assert "Only PDFs are supported" in resp.json().get("detail", "")


def test_upload_with_mismatched_user_id(client, student_headers):
    """Tests that the server rejects uploads for a user_id different from the authenticated token."""
    different_user_id = str(uuid.uuid4())
    dummy_pdf = io.BytesIO(b"%PDF-1.4 minimal test content")
    files = {"file": ("resume.pdf", dummy_pdf, "application/pdf")}
    data = {"user_id": different_user_id}

    resp = client.post("/upload-and-analyze", data=data, files=files, headers=student_headers)
    assert resp.status_code == 403
    assert "Forbidden" in resp.json().get("detail", "")


def test_supabase_connection_endpoint(client, student_headers):
    """Tests the /test-supabase endpoint with authenticated user."""
    resp = client.get("/test-supabase", headers=student_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"


def test_ready_endpoint(client):
    """Tests the /ready readiness probe used by Render and CI keep-alive."""
    resp = client.get("/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ready"
    assert data["checks"]["database"] == "ok"
