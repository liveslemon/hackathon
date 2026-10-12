from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from routers.analysis import _compute_ats_score, parse_json_from_llm


def test_compute_ats_score_heuristic():
    """Verify ATS score gives reasonable scores for realistic and empty CVs."""
    assert _compute_ats_score("") == 0
    assert _compute_ats_score(None) == 0

    good_cv = """
    Jane Doe
    jane.doe@pau.edu.ng | +234 801 234 5678
    Summary: Computer Science student at Pan-Atlantic University.
    Education: B.Sc. Computer Science (2022 - 2026)
    Experience: Software Engineer Intern (2024)
    - Developed and designed RESTful APIs using Python and FastAPI
    - Built responsive frontend with React, increasing active users by 35%
    Skills: Python, React, PostgreSQL, Docker, Git
    Projects: E-commerce Web Application for 500+ users
    """
    score = _compute_ats_score(good_cv)
    assert score >= 60
    assert score <= 100


def test_parse_json_from_llm():
    """Verify parse_json_from_llm handles plain JSON, code fences, and surrounding prose."""
    raw = '{"match_percentage": 85, "missing_skills": []}'
    assert parse_json_from_llm(raw)["match_percentage"] == 85

    fenced = '```json\n{"match_percentage": 90}\n```'
    assert parse_json_from_llm(fenced)["match_percentage"] == 90

    with_prose = 'Here is the analysis:\n{"match_percentage": 75}\nHope this helps!'
    assert parse_json_from_llm(with_prose)["match_percentage"] == 75

    with pytest.raises(Exception):
        parse_json_from_llm("No JSON here")


def test_metrics_requires_authentication(client):
    """Unauthenticated call to metrics must return 401/403."""
    response = client.get("/api/analysis/metrics")
    assert response.status_code in (401, 403)


def test_metrics_calculates_scores(authed_client, mock_student):
    """Verify /api/analysis/metrics computes career and ATS scores for student."""
    with patch("routers.analysis.supabase") as mock_supabase, \
         patch("routers.analysis._fetch_match_scores", return_value=[80, 90]):
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table

        # Profile with CV, and 2 applications
        mock_table.maybe_single.return_value.execute.return_value = MagicMock(
            data={"cv_text": "Sample valid resume text with education and experience."}
        )
        mock_table.execute.return_value = MagicMock(data=[{"id": "app-1"}, {"id": "app-2"}])

        response = authed_client.get("/api/analysis/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "career_score" in data
        assert "ats_score" in data
        assert data["applications_sent"] == 2
        assert data["avg_match_rate"] == 85


def test_metrics_empty_profile_graceful_fallback(authed_client, mock_student):
    """Verify /api/analysis/metrics returns zero metrics when profile has no CV without 500 error."""
    with patch("routers.analysis.supabase") as mock_supabase, \
         patch("routers.analysis._fetch_match_scores", return_value=[]):
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.maybe_single.return_value.execute.return_value = MagicMock(data=None)
        mock_table.execute.return_value = MagicMock(data=[])

        response = authed_client.get("/api/analysis/metrics")
        assert response.status_code == 200
        data = response.json()
        assert data["career_score"] == 0
        assert data["applications_sent"] == 0
        assert data["avg_match_rate"] == 0


def test_skill_gap_rejects_invalid_uuid(authed_client, mock_student):
    """Verify /api/analysis/skill-gap returns 400 for malformed internship UUID."""
    response = authed_client.get("/api/analysis/skill-gap?internship_id=not-a-uuid")
    assert response.status_code == 400
    assert "Invalid internship ID" in response.json().get("detail", "")


def test_skill_gap_returns_cached_or_heuristic_analysis(authed_client, mock_student):
    """Verify /api/analysis/skill-gap returns structured skill gap analysis."""
    valid_uuid = "44444444-4444-4444-8444-444444444444"

    cached_result = {
        "match_percentage": 80,
        "strengths_summary": "Strong core background in Python.",
        "missing_skills": [{"skill": "Docker", "priority": "High"}],
        "recommendations": ["Learn containerization."],
    }

    with patch("routers.analysis._skill_gap_cache_get", return_value=cached_result), \
         patch("routers.analysis.supabase") as mock_supabase:
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.maybe_single.return_value.execute.side_effect = [
            MagicMock(data={"cv_text": "Sample student CV with Python.", "skills": ["Python"]}),
            MagicMock(data={"role": "Backend Engineer", "company": "TechHub", "description": "Backend dev", "requirements": "Python, Docker"}),
            MagicMock(data={"match_score": 80}),
        ]

        response = authed_client.get(f"/api/analysis/skill-gap?internship_id={valid_uuid}")
        assert response.status_code == 200
        data = response.json()
        assert data["match_percentage"] == 80
        assert len(data["missing_skills"]) == 1
