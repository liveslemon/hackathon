"""backfill_match_scores.py had no test and called enqueue() with arguments it doesn't accept."""
import inspect
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import backfill_match_scores as backfill
from services import job_queue


def _students_query(mock_supabase, pages):
    q = mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value
    q.range.return_value.execute.side_effect = [SimpleNamespace(data=p) for p in pages]
    return mock_supabase.table.return_value.select


def test_backfill_enqueues_students_with_signal_only():
    students = [
        {"id": "s1", "role": "student", "cv_text": "Python developer", "skills": []},
        {"id": "s2", "role": "student", "cv_text": "", "skills": ["SQL"]},
        {"id": "s3", "role": "student", "cv_text": None, "skills": [], "experience": None, "projects": None},
    ]
    with patch.object(backfill, "supabase") as sb, patch.object(backfill, "enqueue", return_value="job") as enq:
        select = _students_query(sb, [students, []])
        backfill.run_backfill()
    assert [c.kwargs["user_id"] for c in enq.call_args_list] == ["s1", "s2"]
    assert all(c.kwargs["kind"] == job_queue.USER_RESCORE for c in enq.call_args_list)
    # Only real columns are selected (production has cv_embedding/cv_text, not "embedding").
    assert "embedding" not in [c.strip() for c in select.call_args[0][0].split(",")]


def test_backfill_enqueue_kwargs_match_real_signature():
    params = inspect.signature(job_queue.enqueue).parameters
    for kw in ("user_id", "kind", "source", "priority", "payload"):
        assert kw in params
    assert "subject" not in params


def test_backfill_dry_run_enqueues_nothing():
    with patch.object(backfill, "supabase") as sb, patch.object(backfill, "enqueue") as enq:
        _students_query(sb, [[{"id": "s1", "role": "student", "cv_text": "x"}], []])
        backfill.run_backfill(dry_run=True)
    enq.assert_not_called()


def test_worker_cleanup_calls_stale_match_rpc():
    with patch.object(job_queue, "supabase") as sb:
        sb.rpc.return_value.execute.return_value = SimpleNamespace(data=3)
        job_queue._cleanup_stale_matches()
    sb.rpc.assert_called_once_with("cleanup_stale_match_results", {})


def test_worker_cleanup_swallows_errors():
    with patch.object(job_queue, "supabase") as sb:
        sb.rpc.side_effect = RuntimeError("db down")
        job_queue._cleanup_stale_matches()  # must not raise


def test_quota_pause_requeues_without_spending_an_attempt():
    import asyncio
    from datetime import timedelta
    job = {"id": "j1", "kind": job_queue.MATCH_REASONING, "user_id": "u1", "internship_id": "i1", "attempts": 2}
    with patch.object(job_queue, "supabase") as sb, \
         patch.object(job_queue, "_llm_paused", True), \
         patch.object(job_queue, "_llm_pause_until", job_queue._now() + timedelta(minutes=10)):
        asyncio.run(job_queue._run(job))
    payloads = [c.args[0] for c in sb.table.return_value.update.call_args_list]
    requeue = [p for p in payloads if p.get("status") == "queued"]
    assert requeue and requeue[-1]["attempts"] == 1
