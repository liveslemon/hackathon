# test_main_api.py
import os
import uuid

import pytest
from fastapi.testclient import TestClient
from fpdf import FPDF

from main import app

client = TestClient(app)

# --- Test Configuration ---
# This user ID must exist in your Supabase 'profiles' table
# NOTE: This ID must correspond to a real user in your Supabase 'profiles' table.
# Using the ID from the successful 'test_storage_upload.py' script.
VALID_USER_ID = "12b91698-43b7-4e68-8a08-82115de1b5e8"
DUMMY_CV_PATH = "dummy_cv.pdf"


@pytest.fixture(scope="module")
def dummy_cv():
    """Pytest fixture to create and clean up the dummy CV for all tests in this file."""
    # --- Setup ---
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.multi_cell(0, 10, txt="Skills: Python, FastAPI, SQL.")
    pdf.output(DUMMY_CV_PATH)

    yield DUMMY_CV_PATH  # This provides the file path to the tests

    # --- Teardown ---
    if os.path.exists(DUMMY_CV_PATH):
        os.remove(DUMMY_CV_PATH)


def test_happy_path_upload_and_fetch(dummy_cv):
    """Tests the main success workflow for uploading and fetching matches."""
    # Step 1: Upload CV and analyze
    with open(dummy_cv, "rb") as f:
        files = {"file": (os.path.basename(dummy_cv), f, "application/pdf")}
        data = {"user_id": VALID_USER_ID}
        resp = client.post("/upload-and-analyze", data=data, files=files)

    assert resp.status_code == 200
    response_json = resp.json()
    assert response_json["message"] == "CV uploaded and matches computed successfully"
    # Verify that a valid URL is returned, confirming storage success.
    assert "cv_url" in response_json
    assert response_json["cv_url"].startswith("https://")

    # Step 2: Fetch my matches
    resp_matches = client.get("/my-matches", params={"user_id": VALID_USER_ID})

    assert resp_matches.status_code == 200
    assert "matches" in resp_matches.json()


def test_upload_invalid_file_type():
    """Tests that the server rejects a non-PDF file."""
    invalid_file_path = "dummy.txt"
    with open(invalid_file_path, "w") as f:
        f.write("this is not a pdf")

    try:
        with open(invalid_file_path, "rb") as f:
            files = {"file": (invalid_file_path, f, "text/plain")}
            data = {"user_id": VALID_USER_ID}
            resp = client.post("/upload-and-analyze", data=data, files=files)

            assert (
                resp.status_code == 200
            )  # Your endpoint returns 200 even for user errors
            assert "Only PDF files are allowed" in resp.json().get("error", "")
    finally:
        if os.path.exists(invalid_file_path):
            os.remove(invalid_file_path)


def test_upload_with_nonexistent_user_id(dummy_cv):
    """Tests that the server handles a user_id that is not in the database."""
    non_existent_user_id = str(uuid.uuid4())

    with open(dummy_cv, "rb") as f:
        files = {"file": (os.path.basename(dummy_cv), f, "application/pdf")}
        data = {"user_id": non_existent_user_id}
        resp = client.post("/upload-and-analyze", data=data, files=files)

    assert resp.status_code == 200
    response_json = resp.json()
    assert "error" in response_json
    # Check for the new, earlier validation error.
    assert "Profile not found" in response_json["error"]


def test_supabase_connection_endpoint():
    """Tests the /test-supabase endpoint."""
    resp = client.get("/test-supabase")
    assert resp.status_code == 200
    response_json = resp.json()
    assert response_json["status"] == "success"


def test_dummy_ai_mode_when_api_key_is_missing(dummy_cv, monkeypatch):
    """Tests that the dummy AI mode is triggered when the API key is not set."""
    # This patch temporarily sets the NVIDIA_API_KEY variable inside your
    # main.py module to None just for the duration of this test.
    monkeypatch.setattr("main.NVIDIA_API_KEY", None)

    with open(dummy_cv, "rb") as f:
        files = {"file": (os.path.basename(dummy_cv), f, "application/pdf")}
        data = {"user_id": VALID_USER_ID}
        resp = client.post("/upload-and-analyze", data=data, files=files)

    assert resp.status_code == 200
    assert resp.json()["message"] == "CV uploaded and matches computed successfully"

    # Fetch the results and verify they came from the dummy logic
    resp_matches = client.get("/my-matches", params={"user_id": VALID_USER_ID})
    assert resp_matches.status_code == 200

    matches = resp_matches.json()["matches"]
    # Check if any of the results for this user have the dummy reasoning
    dummy_match_found = any("Dummy AI mode" in match["reasoning"] for match in matches)
    assert dummy_match_found, "Did not find a match result from the dummy AI mode"
