import asyncio
from unittest.mock import MagicMock, patch

import pytest
from services.job_queue import (
    CV_ANALYSIS,
    MAX_ATTEMPTS,
    PROFILE_REMATCH,
    _claim_next,
    _recover_stale,
    _run,
    enqueue,
)


def test_enqueue_creates_job_when_none_queued():
    """Verify enqueue inserts a fresh queued job when no pending/processing job exists."""
    with patch("services.job_queue.supabase") as mock_supabase, \
         patch("services.job_queue.wake"):
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.in_.return_value = mock_table
        mock_table.limit.return_value = mock_table
        mock_table.insert.return_value = mock_table

        mock_table.execute.side_effect = [
            MagicMock(data=[]),  # select check
            MagicMock(data=[{"id": "new-job-123", "status": "queued"}]),  # insert
        ]

        job_id = enqueue("user-1", CV_ANALYSIS)
        assert job_id == "new-job-123"


def test_enqueue_deduplicates_existing_queued_job():
    """Verify enqueue returns existing job_id without inserting a duplicate."""
    with patch("services.job_queue.supabase") as mock_supabase, \
         patch("services.job_queue.wake"):
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.in_.return_value = mock_table
        mock_table.limit.return_value = mock_table
        mock_table.execute.return_value = MagicMock(
            data=[{"id": "existing-job-999", "status": "queued"}]
        )

        job_id = enqueue("user-1", CV_ANALYSIS)
        assert job_id == "existing-job-999"
        mock_table.insert.assert_not_called()


def test_claim_next_uses_rpc_when_available():
    """Verify _claim_next calls claim_next_cv_job RPC procedure."""
    with patch("services.job_queue.supabase") as mock_supabase:
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(
            data=[{"id": "claimed-job-1", "user_id": "user-1", "kind": CV_ANALYSIS}]
        )

        job = _claim_next()
        assert job is not None
        assert job["id"] == "claimed-job-1"
        assert job["kind"] == CV_ANALYSIS


def test_claim_next_fallback_optimistic_locking():
    """Verify _claim_next falls back to optimistic locking if RPC is unavailable."""
    with patch("services.job_queue.supabase") as mock_supabase:
        mock_supabase.rpc.return_value.execute.side_effect = Exception("function claim_next_cv_job does not exist")

        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.order.return_value = mock_table
        mock_table.limit.return_value = mock_table
        mock_table.update.return_value = mock_table

        mock_table.execute.side_effect = [
            MagicMock(data=[{"id": "candidate-job-2", "user_id": "user-2", "status": "queued", "attempts": 0}]),  # select
            MagicMock(data=[{"id": "candidate-job-2", "status": "processing"}]),  # optimistic update
        ]

        job = _claim_next()
        assert job is not None
        assert job["id"] == "candidate-job-2"


def test_recover_stale_requeues_interrupted_jobs():
    """Verify _recover_stale resets stuck jobs with attempts < MAX_ATTEMPTS back to queued."""
    with patch("services.job_queue.supabase") as mock_supabase:
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.update.return_value = mock_table

        # Return a job that started long ago
        mock_table.execute.side_effect = [
            MagicMock(data=[
                {
                    "id": "stuck-1",
                    "user_id": "user-1",
                    "kind": CV_ANALYSIS,
                    "attempts": 1,
                    "started_at": "2020-01-01T00:00:00Z",
                    "updated_at": "2020-01-01T00:00:00Z",
                }
            ]),
            MagicMock(data=[{"id": "stuck-1"}]),  # update
            MagicMock(data=[{"id": "user-1"}]),  # profiles update
        ]

        _recover_stale()

        # Verify job update set status back to queued with retry_at
        update_call = mock_table.update.call_args_list[0][0][0]
        assert update_call["status"] == "queued"
        assert "retry_at" in update_call


def test_recover_stale_fails_jobs_exceeding_max_attempts():
    """Verify _recover_stale marks jobs failed when attempts >= MAX_ATTEMPTS."""
    with patch("services.job_queue.supabase") as mock_supabase, \
         patch("services.cv_analysis_service.fail_cv_analysis") as mock_fail_analysis:
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.update.return_value = mock_table

        mock_table.execute.side_effect = [
            MagicMock(data=[
                {
                    "id": "stuck-max",
                    "user_id": "user-max",
                    "kind": CV_ANALYSIS,
                    "attempts": MAX_ATTEMPTS,
                    "started_at": "2020-01-01T00:00:00Z",
                    "updated_at": "2020-01-01T00:00:00Z",
                }
            ]),
            MagicMock(data=[{"id": "stuck-max"}]),  # update
        ]

        _recover_stale()

        update_call = mock_table.update.call_args_list[0][0][0]
        assert update_call["status"] == "failed"
        mock_fail_analysis.assert_called_with("user-max")


@pytest.mark.anyio
async def test_run_executes_cv_analysis():
    """Verify _run invokes run_cv_analysis for CV_ANALYSIS kind."""
    with patch("services.job_queue.supabase") as mock_supabase, \
         patch("services.cv_analysis_service.run_cv_analysis") as mock_run_analysis:
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.single.return_value = mock_table
        mock_table.execute.return_value = MagicMock(data={"cv_text": "Sample text"})

        await _run({"id": "job-run-1", "user_id": "user-run-1", "kind": CV_ANALYSIS})

        mock_run_analysis.assert_called_with("user-run-1", "Sample text", "job-run-1")
