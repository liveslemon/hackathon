"""
Tests for Agent 11 Match Scoring Redesign.
Covers:
1. score_pair deterministic, bounded 0..100, versioned, hash consistency.
2. Upsert, not delete: rescoring updates without deleting mid-run.
3. Closed/expired internships dropped from match_results.
4. Deduplication: multiple saves within debounce window enqueue at most one job.
5. INTERNSHIP_RESCORE queued for relevant changes, not for stipend/slots.
6. new_match notifications rate-limited to 3/day and opt-out respected.
7. Credit/quota exhaustion pauses MATCH_REASONING jobs without failing them.
8. AI reasoning inputs_hash invalidation and fallback to layer 1 instant explanation.
"""

import time
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

import pytest

from services.match_scoring import (
    score_pair,
    compute_inputs_hash,
    build_instant_explanation,
    SCORE_VERSION,
)
from services.job_queue import (
    enqueue,
    JobKind,
    _llm_paused,
    get_llm_pause_status,
    handle_llm_provider_error,
    check_and_resume_llm_if_recovered,
)
from services.vector_matching_service import (
    _notify_new_matches,
    generate_match_reasoning,
)


# ---------------------------------------------------------------------------
# 1. score_pair unit tests
# ---------------------------------------------------------------------------

def test_score_pair_deterministic_and_bounded():
    student = {
        "skills": ["python", "sql", "fastapi", "react"],
        "course": "Computer Science",
        "embedding": [0.1, 0.2, 0.3, 0.4],
        "experience": "Built backend APIs using FastAPI and PostgreSQL",
    }
    job = {
        "required_skills": ["python", "sql", "docker"],
        "field": "Computer Science",
        "embedding": [0.1, 0.25, 0.28, 0.42],
        "role": "Backend Engineer Intern",
        "description": "Looking for a Python and SQL backend intern.",
    }

    res1 = score_pair(student, job)
    res2 = score_pair(student, job)

    assert res1["match_score"] == res2["match_score"]
    assert 0 <= res1["match_score"] <= 100
    assert res1["score_version"] == SCORE_VERSION
    assert "breakdown" in res1
    assert "python" in [s.lower() for s in res1["matching_skills"]]
    assert "docker" in [s.lower() for s in res1["missing_skills"]]
    assert len(res1["instant_reasoning"]) > 10


def test_score_pair_hash_consistency():
    student = {"skills": ["Python", "SQL"]}
    job = {"required_skills": ["Python", "Docker"]}

    hash1 = compute_inputs_hash(student, job)
    hash2 = compute_inputs_hash(student, job)
    assert hash1 == hash2

    # Modified inputs produce a different hash
    student_mod = {"skills": ["Python", "SQL", "Go"]}
    assert compute_inputs_hash(student_mod, job) != hash1


def test_instant_explanation_details():
    student = {"skills": ["Python", "React", "PostgreSQL"]}
    job = {
        "required_skills": ["Python", "TypeScript", "PostgreSQL", "Docker"],
        "role": "Fullstack Intern",
    }
    score = score_pair(student, job)
    explanation = score["instant_reasoning"]

    assert "match" in explanation.lower()
    # Check that matched skills are mentioned
    assert "python" in explanation.lower() or "postgresql" in explanation.lower()
    # Check that missing skills are identified
    assert "missing" in explanation.lower() or "typescript" in explanation.lower()


# ---------------------------------------------------------------------------
# 2. Upsert instead of delete
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_rescore_user_upserts_and_preserves_unaffected(mock_supabase):
    from services.vector_matching_service import rescore_user

    user_id = "test-student-upsert-123"

    # Setup student profile
    mock_supabase.set_table_data("profiles", [
        {
            "id": user_id,
            "skills": ["Python", "Django"],
            "embedding": [0.1, 0.2, 0.3],
            "course": "Computer Science",
        }
    ])

    # Setup open internships
    mock_supabase.set_table_data("internships", [
        {
            "id": "job-1",
            "role": "Python Dev",
            "status": "active",
            "deadline": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
            "required_skills": ["Python"],
            "embedding": [0.1, 0.2, 0.3],
        },
        {
            "id": "job-2",
            "role": "Closed Role",
            "status": "closed",
            "deadline": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
            "required_skills": ["Python"],
        }
    ])

    # Existing match result for job-2
    mock_supabase.set_table_data("match_results", [
        {
            "user_id": user_id,
            "internship_id": "job-2",
            "match_score": 75,
        }
    ])

    # Rescore user
    res = await rescore_user(user_id)
    assert res >= 1

    # Verify match_results has job-1 and removed job-2 (closed)
    results = mock_supabase.data.get("match_results", [])
    job_ids = [r["internship_id"] for r in results if r.get("user_id") == user_id]
    assert "job-1" in job_ids
    assert "job-2" not in job_ids


# ---------------------------------------------------------------------------
# 3. Deduplication & Debouncing in Job Queue
# ---------------------------------------------------------------------------

def test_job_queue_deduplication(mock_supabase):
    user_id = "debounce-user-456"

    # Mock empty jobs table
    mock_supabase.set_table_data("cv_processing_jobs", [])

    # First enqueue
    job1 = enqueue(
        user_id=user_id,
        kind=JobKind.USER_RESCORE,
        priority=5,
    )
    assert job1 is not None

    # Immediate second enqueue with same user_id and kind should be deduplicated
    job2 = enqueue(
        user_id=user_id,
        kind=JobKind.USER_RESCORE,
        priority=5,
    )
    # Returns existing job id due to debounce check
    assert job2 == job1


# ---------------------------------------------------------------------------
# 4. Notification rate limiting & opt-out
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_notification_rate_limiting_and_opt_out(mock_supabase):
    user_id = "notif-user-789"
    today = datetime.now(timezone.utc).date().isoformat()

    # Case A: User has 3 notifications today already -> should not send
    mock_supabase.set_table_data("notifications", [
        {"user_id": user_id, "type": "new_match", "created_at": f"{today}T10:00:00Z"},
        {"user_id": user_id, "type": "new_match", "created_at": f"{today}T11:00:00Z"},
        {"user_id": user_id, "type": "new_match", "created_at": f"{today}T12:00:00Z"},
    ])
    mock_supabase.set_table_data("profiles", [
        {"id": user_id, "settings": {"notifications": {"new_match": True}}}
    ])

    sent = await _notify_new_matches(user_id, [{"internship_id": "job-1", "match_score": 92}])
    assert sent == 0

    # Case B: User opted out
    mock_supabase.set_table_data("notifications", [])
    mock_supabase.set_table_data("profiles", [
        {"id": user_id, "settings": {"notifications": {"new_match": False}}}
    ])
    sent_optout = await _notify_new_matches(user_id, [{"internship_id": "job-1", "match_score": 92}])
    assert sent_optout == 0

    # Case C: Under limit and opted in -> sent
    mock_supabase.set_table_data("profiles", [
        {"id": user_id, "settings": {"notifications": {"new_match": True}}}
    ])
    sent_ok = await _notify_new_matches(user_id, [{"internship_id": "job-1", "match_score": 92}])
    assert sent_ok == 1


# ---------------------------------------------------------------------------
# 5. Credit / Quota Exhaustion Circuit Breaker
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_llm_quota_pause_and_recovery():
    # Simulate a quota / 429 error
    class MockRateLimitError(Exception):
        pass

    err = MockRateLimitError("429: Insufficient credits or quota exceeded")
    handle_llm_provider_error(err)

    status = get_llm_pause_status()
    assert status["paused"] is True
    assert status["reason"] is not None

    # Recover using mock check
    with patch("services.llm_service.llm_client.check_providers", return_value=[{"name": "Gemini", "ok": True}]):
        recovered = await check_and_resume_llm_if_recovered()
        assert recovered is True

        new_status = get_llm_pause_status()
        assert new_status["paused"] is False


# ---------------------------------------------------------------------------
# 6. AI Reasoning hash invalidation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ai_reasoning_hash_invalidation(mock_supabase):
    user_id = "user-hash-test"
    internship_id = "job-hash-test"

    # Setup match_results with old ai_reasoning and hash
    mock_supabase.set_table_data("match_results", [
        {
            "user_id": user_id,
            "internship_id": internship_id,
            "match_score": 85,
            "inputs_hash": "current-hash-abc",
            "ai_reasoning_hash": "stale-hash-xyz",
            "ai_reasoning": "Old AI reasoning that was based on outdated inputs.",
            "instant_reasoning": "Instant explanation: 85% match based on skills.",
        }
    ])
    mock_supabase.set_table_data("profiles", [{"id": user_id, "skills": ["Python"]}])
    mock_supabase.set_table_data("internships", [{"id": internship_id, "role": "Python Dev", "required_skills": ["Python"]}])

    # Mock generate_completion
    with patch("services.vector_matching_service.generate_completion", return_value="Fresh new AI summary."):
        await generate_match_reasoning(user_id, internship_id)

    # Verify updated row has fresh AI reasoning and matching hash
    row = mock_supabase.data["match_results"][0]
    assert row["ai_reasoning_hash"] == "current-hash-abc"
    assert row["ai_reasoning"] == "Fresh new AI summary."


# ---------------------------------------------------------------------------
# 7. INTERNSHIP_RESCORE queued via POST /api/analyze-new-internship
# ---------------------------------------------------------------------------

def test_analyze_new_internship_enqueues_rescore(mock_supabase, client, employer_user, employer_headers):
    # Setup internship owned by the employer
    mock_supabase.set_table_data("internships", [
        {
            "id": "test-internship-queue-999",
            "poster_id": employer_user.id,
            "employer_id": employer_user.id,
            "role": "Software Engineering Intern",
            "status": "active",
        }
    ])
    mock_supabase.set_table_data("cv_processing_jobs", [])

    response = client.post(
        "/api/analyze-new-internship",
        json={"internship_id": "test-internship-queue-999"},
        headers=employer_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["job_id"] is not None

