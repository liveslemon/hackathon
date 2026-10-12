from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

import pytest
from core.security import get_current_user
from main import app
from routers.logbook import LAGOS_TZ, get_lagos_today


def create_mock_supabase_response(data):
    mock = MagicMock()
    mock.data = data
    return mock


@pytest.fixture
def mock_supabase():
    with patch("routers.logbook.supabase") as mock_sb:
        yield mock_sb


class TestLogbookEntryRules:
    def test_post_entry_user_id_mismatch(self, client, student_user):
        app.dependency_overrides[get_current_user] = lambda: student_user
        try:
            res = client.post(
                "/api/logbook/entry",
                json={
                    "student_id": "other-student-456",
                    "activities_raw": "Worked on frontend.",
                },
            )
            assert res.status_code == 403
            assert "User ID mismatch" in res.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_post_entry_future_date_rejected(self, client, student_user):
        app.dependency_overrides[get_current_user] = lambda: student_user
        try:
            tomorrow = (
                datetime.now(LAGOS_TZ).date() + timedelta(days=1)
            ).isoformat()
            res = client.post(
                "/api/logbook/entry",
                json={
                    "student_id": student_user.id,
                    "date": tomorrow,
                    "activities_raw": "Working tomorrow.",
                },
            )
            assert res.status_code == 400
            assert "future dates" in res.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()

    def test_post_entry_backfill_window_expired(self, client, student_user, mock_supabase):
        app.dependency_overrides[get_current_user] = lambda: student_user
        try:
            old_date = (
                datetime.now(LAGOS_TZ).date() - timedelta(days=10)
            ).isoformat()

            # Mock placement exists and is active
            mock_app_query = MagicMock()
            mock_app_query.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "app-1",
                        "user_id": student_user.id,
                        "placement_status": "active",
                        "internships": {"employer_id": "emp-1"},
                    }
                ])
            )

            # Mock existing entry: none
            mock_entries_query = MagicMock()
            mock_entries_query.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
                create_mock_supabase_response([])
            )

            mock_supabase.table.side_effect = lambda t: (
                mock_app_query if t == "applied_internships" else mock_entries_query
            )

            res = client.post(
                "/api/logbook/entry",
                json={
                    "student_id": student_user.id,
                    "date": old_date,
                    "activities_raw": "10 days ago activity.",
                },
            )
            assert res.status_code == 400
            assert "7 days" in res.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_post_entry_post_approval_edit_forbidden(
        self, client, student_user, mock_supabase
    ):
        app.dependency_overrides[get_current_user] = lambda: student_user
        try:
            today = get_lagos_today()

            # Mock placement
            mock_app_query = MagicMock()
            mock_app_query.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "app-1",
                        "user_id": student_user.id,
                        "placement_status": "active",
                        "internships": {"employer_id": "emp-1"},
                    }
                ])
            )

            # Mock existing entry that is ALREADY APPROVED
            mock_entries_query = MagicMock()
            mock_entries_query.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "entry-approved-1",
                        "student_id": student_user.id,
                        "date": today,
                        "status": "approved",
                    }
                ])
            )

            mock_supabase.table.side_effect = lambda t: (
                mock_app_query if t == "applied_internships" else mock_entries_query
            )

            res = client.post(
                "/api/logbook/entry",
                json={
                    "student_id": student_user.id,
                    "date": today,
                    "activities_raw": "Trying to edit approved entry.",
                },
            )
            assert res.status_code == 400
            assert "locked" in res.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()

    def test_post_entry_revising_flagged_entry_allowed(
        self, client, student_user, mock_supabase
    ):
        app.dependency_overrides[get_current_user] = lambda: student_user
        try:
            old_date = (
                datetime.now(LAGOS_TZ).date() - timedelta(days=12)
            ).isoformat()

            # Mock placement
            mock_app_query = MagicMock()
            mock_app_query.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "app-1",
                        "user_id": student_user.id,
                        "placement_status": "active",
                        "internships": {"employer_id": "emp-1"},
                    }
                ])
            )

            # Mock existing entry: FLAGGED
            mock_entries_query = MagicMock()
            mock_entries_query.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "entry-flagged-1",
                        "student_id": student_user.id,
                        "date": old_date,
                        "status": "flagged",
                        "feedback_notes": "Please expand on tests.",
                    }
                ])
            )
            mock_entries_query.update.return_value.eq.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "entry-flagged-1",
                        "student_id": student_user.id,
                        "date": old_date,
                        "status": "pending",
                    }
                ])
            )

            mock_supabase.table.side_effect = lambda t: (
                mock_app_query if t == "applied_internships" else mock_entries_query
            )

            res = client.post(
                "/api/logbook/entry",
                json={
                    "student_id": student_user.id,
                    "date": old_date,
                    "activities_raw": "Expanded details with tests.",
                },
            )
            assert res.status_code == 200
            assert res.json()["entry"]["status"] == "pending"
        finally:
            app.dependency_overrides.clear()


class TestEmployerReviewAndTamperProofing:
    def test_student_cannot_self_approve(self, client, student_user, mock_supabase):
        app.dependency_overrides[get_current_user] = lambda: student_user
        try:
            # Mock entry lookup where student_id is current_user.id
            mock_query = MagicMock()
            mock_query.select.return_value.eq.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "entry-1",
                        "student_id": student_user.id,
                        "employer_id": "employer-456",
                        "status": "pending",
                    }
                ])
            )
            mock_supabase.table.return_value = mock_query

            res = client.patch(
                "/api/logbook/entry/entry-1/status",
                json={"status": "approved"},
            )
            assert res.status_code == 403
            assert "cannot review or approve their own" in res.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_wrong_employer_cannot_review(
        self, client, wrong_employer_user, mock_supabase
    ):
        app.dependency_overrides[get_current_user] = lambda: wrong_employer_user
        try:
            mock_query = MagicMock()
            mock_query.select.return_value.eq.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "entry-1",
                        "student_id": "student-123",
                        "employer_id": "employer-456",  # Different employer!
                        "status": "pending",
                    }
                ])
            )
            mock_supabase.table.return_value = mock_query

            res = client.patch(
                "/api/logbook/entry/entry-1/status",
                json={"status": "approved"},
            )
            assert res.status_code == 403
            assert "Not authorized" in res.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_supervising_employer_approve_success(
        self, client, employer_user, mock_supabase
    ):
        app.dependency_overrides[get_current_user] = lambda: employer_user
        try:
            mock_query = MagicMock()
            mock_query.select.return_value.eq.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "entry-1",
                        "student_id": "student-123",
                        "employer_id": employer_user.id,
                        "status": "pending",
                    }
                ])
            )
            mock_query.update.return_value.eq.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "entry-1",
                        "status": "approved",
                        "reviewed_by": employer_user.id,
                    }
                ])
            )
            mock_supabase.table.return_value = mock_query

            res = client.patch(
                "/api/logbook/entry/entry-1/status",
                json={"status": "approved"},
            )
            assert res.status_code == 200
            assert res.json()["entry"]["status"] == "approved"
        finally:
            app.dependency_overrides.clear()

    def test_bulk_approve_supervising_employer_success(
        self, client, employer_user, mock_supabase
    ):
        app.dependency_overrides[get_current_user] = lambda: employer_user
        try:
            mock_query = MagicMock()
            mock_query.select.return_value.in_.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "entry-1",
                        "student_id": "student-123",
                        "employer_id": employer_user.id,
                    },
                    {
                        "id": "entry-2",
                        "student_id": "student-123",
                        "employer_id": employer_user.id,
                    },
                ])
            )
            mock_query.update.return_value.in_.return_value.execute.return_value = (
                create_mock_supabase_response([])
            )
            mock_supabase.table.return_value = mock_query

            res = client.post(
                "/api/logbook/bulk-status",
                json={"entry_ids": ["entry-1", "entry-2"], "status": "approved"},
            )
            assert res.status_code == 200
            assert res.json()["updated_count"] == 2
        finally:
            app.dependency_overrides.clear()

    def test_bulk_approve_wrong_employer_forbidden(
        self, client, wrong_employer_user, mock_supabase
    ):
        app.dependency_overrides[get_current_user] = lambda: wrong_employer_user
        try:
            mock_query = MagicMock()
            mock_query.select.return_value.in_.return_value.execute.return_value = (
                create_mock_supabase_response([
                    {
                        "id": "entry-1",
                        "student_id": "student-123",
                        "employer_id": "employer-456",  # Not wrong_employer_user
                    }
                ])
            )
            mock_supabase.table.return_value = mock_query

            res = client.post(
                "/api/logbook/bulk-status",
                json={"entry_ids": ["entry-1"], "status": "approved"},
            )
            assert res.status_code == 403
            assert "not authorized" in res.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()


class TestAIEnhance:
    @patch("routers.logbook.enhance_logbook_entry")
    def test_enhance_logbook_entry_success(self, mock_enhance, client, student_user):
        mock_enhance.return_value = "Detailed professional summary of SIWES tasks."
        app.dependency_overrides[get_current_user] = lambda: student_user
        try:
            res = client.post(
                "/api/logbook/enhance",
                json={"raw_text": "Did some react coding"},
            )
            assert res.status_code == 200
            assert res.json()["enhanced_text"] == "Detailed professional summary of SIWES tasks."
        finally:
            app.dependency_overrides.clear()

    @patch("routers.logbook.enhance_logbook_entry")
    def test_enhance_logbook_entry_handles_llm_failure(
        self, mock_enhance, client, student_user
    ):
        mock_enhance.side_effect = RuntimeError("All LLM providers failed")
        app.dependency_overrides[get_current_user] = lambda: student_user
        try:
            res = client.post(
                "/api/logbook/enhance",
                json={"raw_text": "Did some react coding"},
            )
            assert res.status_code == 502
            assert "AI service may be unavailable" in res.json()["detail"]
        finally:
            app.dependency_overrides.clear()

