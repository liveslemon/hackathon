# ⚠️ PARTIALLY COMPLETED — Test infrastructure (conftest, fixtures) not yet created. Requires dedicated test sprint.

# 09 — Testing Strategy

## Summary

The backend has several test files (`test_main_api.py`, `test_resend.py`, `test_smtp_diagnostics.py`, etc.) but they appear to be ad-hoc diagnostic scripts rather than a comprehensive test suite. There is no structured testing framework, no CI integration, and critical paths (authentication, authorization, matching) lack test coverage.

---

## Issues

### 1. No Unit Tests for Business Logic

**Files:** `services/matching_service.py`, `services/routing_service.py`, `services/llm_service.py`

**Impact:** Core business logic — match scoring, embedding computation, LLM provider failover — has no automated tests. Bugs in these functions only surface in production.

**Recommended Fix:**

```python
# tests/unit/test_matching_service.py
import pytest
from services.matching_service import compute_cosine_similarity

class TestCosineSimilarity:
    def test_identical_vectors(self):
        vec = [1.0, 0.0, 1.0]
        assert compute_cosine_similarity(vec, vec) == pytest.approx(1.0)

    def test_orthogonal_vectors(self):
        vec1 = [1.0, 0.0]
        vec2 = [0.0, 1.0]
        assert compute_cosine_similarity(vec1, vec2) == pytest.approx(0.0)

    def test_opposite_vectors(self):
        vec1 = [1.0, 0.0]
        vec2 = [-1.0, 0.0]
        assert compute_cosine_similarity(vec1, vec2) == pytest.approx(-1.0)

    def test_empty_vectors_raise(self):
        with pytest.raises(ValueError):
            compute_cosine_similarity([], [1.0])

    def test_dimension_mismatch_raise(self):
        with pytest.raises(ValueError):
            compute_cosine_similarity([1.0, 2.0], [1.0])
```

---

### 2. No Integration Tests for API Endpoints

**Impact:** No tests verify the full request/response cycle. Auth middleware, route handlers, database interactions, and response serialization are untested together.

**Recommended Fix:**

```python
# tests/integration/test_applications.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def auth_headers(test_user_token):
    return {"Authorization": f"Bearer {test_user_token}"}

class TestApplicationsAPI:
    @pytest.mark.asyncio
    async def test_submit_application_success(self, client, auth_headers):
        response = await client.post(
            "/api/applications/submit",
            json={
                "user_id": "test-user-id",
                "internship_id": "test-internship-id",
                "cover_letter": "I am interested in this position...",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

    @pytest.mark.asyncio
    async def test_submit_application_unauthorized(self, client):
        response = await client.post("/api/applications/submit", json={...})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_submit_application_missing_cv(self, client, auth_headers):
        # User without CV should get 400
        response = await client.post(
            "/api/applications/submit",
            json={"user_id": "user-no-cv", "internship_id": "...", "cover_letter": "..."},
            headers=auth_headers,
        )
        assert response.status_code == 400
```

---

### 3. No Authorization Tests

**Impact:** The critical authorization logic (who can update which application, admin-only routes, user data isolation) is completely untested. Authorization bugs are the highest-impact security vulnerabilities.

**Recommended Fix:**

```python
# tests/security/test_authorization.py
class TestAdminAuthorization:
    @pytest.mark.asyncio
    async def test_non_admin_cannot_access_stats(self, client, student_headers):
        response = await client.get("/admin/stats", headers=student_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_access_stats(self, client, admin_headers):
        response = await client.get("/admin/stats", headers=admin_headers)
        assert response.status_code == 200

class TestDataIsolation:
    @pytest.mark.asyncio
    async def test_student_cannot_see_other_applications(self, client, student_a_headers):
        response = await client.get("/applications/student", headers=student_a_headers)
        data = response.json()["applications"]
        # All returned applications should belong to student A
        for app in data:
            assert app["user_id"] == "student-a-id"

    @pytest.mark.asyncio
    async def test_student_cannot_update_others_application(self, client, student_a_headers):
        response = await client.put(
            "/applications/other-student-app-id/status",
            json={"status": "accepted"},
            headers=student_a_headers,
        )
        assert response.status_code == 403
```

---

### 4. No Test Fixtures or Factory Patterns

**Impact:** Each test file would need to set up its own database state, leading to duplication and fragile tests.

**Recommended Fix:**

```python
# tests/conftest.py
import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture
def mock_supabase():
    """Mock Supabase client for unit tests."""
    with patch("core.db.supabase") as mock:
        mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        yield mock

@pytest.fixture
def sample_profile():
    return {
        "id": "test-user-123",
        "full_name": "Test Student",
        "role": "student",
        "course": "Computer Science",
        "level": "300",
        "cv_url": "https://storage.example.com/cvs/test.pdf",
        "cv_text": "Python developer with 2 years experience...",
    }

@pytest.fixture
def sample_internship():
    return {
        "id": "test-internship-456",
        "role": "Backend Developer",
        "company": "Test Corp",
        "requirements": "Python, FastAPI, PostgreSQL",
        "employer_id": "employer-789",
    }

@pytest.fixture
def mock_llm_client():
    """Mock LLM that returns deterministic responses."""
    client = AsyncMock()
    client.generate_text.return_value = '{"skills": ["Python", "FastAPI"]}'
    return client
```

---

### 5. No Load/Performance Tests

**Impact:** No visibility into how the system performs under concurrent load. The first time performance is tested is in production.

**Recommended Fix:**

```python
# tests/load/locustfile.py
from locust import HttpUser, task, between

class InternMatchUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Login and get token
        response = self.client.post("/auth/login", json={
            "email": "load-test@test.com",
            "password": "test123"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def view_applications(self):
        self.client.get("/applications/student", headers=self.headers)

    @task(2)
    def search_internships(self):
        self.client.get("/api/analysis/skill-gap?internship_id=test-id", headers=self.headers)

    @task(1)
    def submit_application(self):
        self.client.post("/api/applications/submit", json={
            "user_id": "load-test-user",
            "internship_id": "test-internship",
            "cover_letter": "Test cover letter for load testing.",
        }, headers=self.headers)
```

Run with: `locust -f tests/load/locustfile.py --host=http://localhost:8000`

---

### 6. No Contract Tests for External Services

**Impact:** Integration with Supabase, LLM providers, and embedding APIs is untested. If their response format changes, the application breaks silently.

**Recommended Fix:**

```python
# tests/contract/test_supabase_contract.py
"""
Verify our assumptions about Supabase response formats.
Run against a test Supabase project.
"""

class TestSupabaseContract:
    def test_profile_select_returns_expected_fields(self, supabase_test_client):
        res = supabase_test_client.table("profiles").select("*").limit(1).execute()
        if res.data:
            profile = res.data[0]
            required_fields = {"id", "full_name", "role", "cv_url", "cv_text"}
            assert required_fields.issubset(set(profile.keys()))

    def test_insert_returns_created_row(self, supabase_test_client):
        data = {"student_id": "test", "date": "2024-01-01", "raw_text": "test"}
        res = supabase_test_client.table("logbook_entries").insert(data).execute()
        assert res.data is not None
        assert len(res.data) == 1
        # Cleanup
        supabase_test_client.table("logbook_entries").delete().eq("student_id", "test").execute()
```

---

### 7. Recommended Test Directory Structure

```
tests/
├── conftest.py              # Shared fixtures
├── unit/
│   ├── test_matching.py     # Cosine similarity, score computation
│   ├── test_cache.py        # Cache hit/miss/expiry
│   └── test_validation.py   # Input validation functions
├── integration/
│   ├── test_cv_upload.py    # Full CV upload flow
│   ├── test_applications.py # Application submission flow
│   └── test_admin.py        # Admin endpoints
├── security/
│   ├── test_auth.py         # Authentication edge cases
│   └── test_authorization.py # Permission checks
├── contract/
│   └── test_supabase.py     # External service contracts
└── load/
    └── locustfile.py        # Performance testing
```

---

### 8. CI/CD Integration

**Recommended `pytest.ini`:**

```ini
[pytest]
testpaths = tests
asyncio_mode = auto
markers =
    unit: Unit tests (no external deps)
    integration: Integration tests (needs test DB)
    security: Security/authorization tests
    slow: Tests that take > 5 seconds
```

**Recommended GitHub Actions workflow:**

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt && pip install pytest pytest-asyncio httpx
      - run: pytest tests/unit -v --tb=short
      - run: pytest tests/security -v --tb=short
```

---

## Priority

| #   | Issue                        | Severity | Effort |
| --- | ---------------------------- | -------- | ------ |
| 1   | No unit tests for core logic | High     | Medium |
| 2   | No integration tests         | High     | High   |
| 3   | No authorization tests       | Critical | Medium |
| 4   | No fixtures/factories        | Medium   | Medium |
| 5   | No load tests                | Medium   | Medium |
| 6   | No contract tests            | Low      | Medium |
| 7   | No test structure            | Medium   | Low    |
| 8   | No CI integration            | High     | Low    |
