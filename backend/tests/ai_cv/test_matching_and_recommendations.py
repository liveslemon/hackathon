from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from services.embedding_service import EMBEDDING_DIM, get_embedding
from services.matching_service import analyze_skills, compute_cosine_similarity
from services.vector_matching_service import _ensure_vector


def test_cosine_similarity_identical_vectors():
    """Verify identical vectors yield cosine similarity of 1.0."""
    v1 = [1.0, 2.0, 3.0]
    v2 = [1.0, 2.0, 3.0]
    sim = compute_cosine_similarity(v1, v2)
    assert pytest.approx(sim, 0.001) == 1.0


def test_cosine_similarity_orthogonal_vectors():
    """Verify orthogonal vectors yield cosine similarity of 0.0."""
    v1 = [1.0, 0.0, 0.0]
    v2 = [0.0, 1.0, 0.0]
    sim = compute_cosine_similarity(v1, v2)
    assert pytest.approx(sim, 0.001) == 0.0


def test_cosine_similarity_handles_zero_vector_safely():
    """Verify zero vectors return 0.0 without division by zero or NaN."""
    v1 = [0.0, 0.0, 0.0]
    v2 = [1.0, 2.0, 3.0]
    sim = compute_cosine_similarity(v1, v2)
    assert sim == 0.0


def test_cosine_similarity_dimension_mismatch_raises():
    """Verify dimension mismatch raises ValueError."""
    v1 = [1.0, 2.0]
    v2 = [1.0, 2.0, 3.0]
    with pytest.raises(ValueError, match="Vector dimension mismatch"):
        compute_cosine_similarity(v1, v2)


def test_ensure_vector_validation():
    """Verify _ensure_vector parses valid 1024-dim arrays and rejects invalid formats."""
    assert _ensure_vector(None) is None
    assert _ensure_vector("not json") is None
    # Wrong dimension
    assert _ensure_vector([0.1] * 512) is None
    # Correct dimension list
    valid_list = [0.05] * 1024
    assert _ensure_vector(valid_list) is not None
    assert len(_ensure_vector(valid_list)) == 1024
    # Valid JSON string with 1024 floats
    import json
    assert _ensure_vector(json.dumps(valid_list)) is not None


def test_analyze_skills_normalization():
    """Verify analyze_skills extracts matching/missing skills using aliases."""
    text = "We are seeking a developer with python3, react.js, and k8s experience."
    requirements = ["python", "react", "kubernetes", "flutter"]
    matching, missing, ratio = analyze_skills(text, requirements)
    assert "python" in matching
    assert "react" in matching
    assert "kubernetes" in matching
    assert "flutter" in missing
    assert ratio == 0.75


@pytest.mark.anyio
async def test_get_embedding_empty_text_returns_none():
    """Verify empty or whitespace string returns None to prevent zero-vector division issues."""
    assert await get_embedding("") is None
    assert await get_embedding("   \n\t  ") is None


def test_recommendations_requires_authentication(client):
    """Unauthenticated access to recommendations must return 401/403."""
    response = client.get("/api/recommendations")
    assert response.status_code in (401, 403)


def test_recommendations_filters_applied_and_inactive(authed_client, mock_student):
    """Verify recommendations exclude already-applied internships and inactive ones."""
    with patch("routers.cv.supabase") as mock_supabase:
        mock_applied = MagicMock()
        mock_matches = MagicMock()

        def table_selector(name):
            if name == "applied_internships":
                return mock_applied
            return mock_matches

        mock_supabase.table.side_effect = table_selector

        # Applied internships: job-1 is already applied
        mock_applied.select.return_value = mock_applied
        mock_applied.eq.return_value = mock_applied
        mock_applied.execute.return_value = MagicMock(data=[{"internship_id": "job-1"}])

        # Match results contains job-1 (applied), job-2 (inactive), job-3 (active)
        mock_matches.select.return_value = mock_matches
        mock_matches.eq.return_value = mock_matches
        mock_matches.gte.return_value = mock_matches
        mock_matches.order.return_value = mock_matches
        mock_matches.execute.return_value = MagicMock(data=[
            {
                "internship_id": "job-1",
                "match_score": 90,
                "internships": {"id": "job-1", "role": "Frontend Dev", "company": "TechA", "status": "active"},
            },
            {
                "internship_id": "job-2",
                "match_score": 85,
                "internships": {"id": "job-2", "role": "Backend Dev", "company": "TechB", "status": "closed"},
            },
            {
                "internship_id": "job-3",
                "match_score": 80,
                "internships": {"id": "job-3", "role": "AI Engineer", "company": "TechC", "status": "active"},
            },
        ])

        response = authed_client.get("/api/recommendations")
        assert response.status_code == 200
        data = response.json()
        recs = data.get("recommendations", [])
        assert len(recs) == 1
        assert recs[0]["internship_id"] == "job-3"
        assert recs[0]["role"] == "AI Engineer"


def test_recommendations_enforces_company_diversity_cap(authed_client, mock_student):
    """Verify no more than 3 recommendations from the same company are returned."""
    with patch("routers.cv.supabase") as mock_supabase:
        mock_applied = MagicMock()
        mock_matches = MagicMock()

        def table_selector(name):
            if name == "applied_internships":
                return mock_applied
            return mock_matches

        mock_supabase.table.side_effect = table_selector
        mock_applied.select.return_value = mock_applied
        mock_applied.eq.return_value = mock_applied
        mock_applied.execute.return_value = MagicMock(data=[])

        # 5 active jobs all at MegaCorp
        mock_matches.select.return_value = mock_matches
        mock_matches.eq.return_value = mock_matches
        mock_matches.gte.return_value = mock_matches
        mock_matches.order.return_value = mock_matches
        mock_matches.execute.return_value = MagicMock(data=[
            {
                "internship_id": f"job-{i}",
                "match_score": 90 - i,
                "internships": {"id": f"job-{i}", "role": f"Role {i}", "company": "MegaCorp", "status": "active"},
            }
            for i in range(5)
        ])

        response = authed_client.get("/api/recommendations")
        assert response.status_code == 200
        recs = response.json().get("recommendations", [])
        # Only max 3 from MegaCorp
        assert len(recs) == 3
