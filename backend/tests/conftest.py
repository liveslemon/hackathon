"""
Shared Pytest test harness and fixtures for PAU Interconnect backend.
Owned by Agent 08 (Platform & DB Foundation).
"""

import asyncio
import os
import sys
from pathlib import Path

# Ensure backend root is always on sys.path regardless of invocation directory
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Provide dummy defaults for required environment variables during tests
os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "mock-service-role-key-for-testing-at-least-20-chars")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

from types import SimpleNamespace
from typing import Any, Dict, List, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from core.config import settings
import core.rate_limit as rate_limit_module
from core.security import get_current_user, verify_admin
from main import app


# -----------------------------------------------------------------------------
# Test User Constants & Namespaces
# -----------------------------------------------------------------------------

STUDENT_USER_ID = "student-test-uuid-000000000001"
EMPLOYER_USER_ID = "employer-test-uuid-000000000002"
ADMIN_USER_ID = "admin-test-uuid-000000000003"

STUDENT_TOKEN = "mock-student-token"
EMPLOYER_TOKEN = "mock-employer-token"
ADMIN_TOKEN = "mock-admin-token"


def make_mock_user(user_id: str, email: str, role: str = "student", full_name: str = "Test User") -> SimpleNamespace:
    return SimpleNamespace(
        id=user_id,
        email=email,
        role="authenticated",
        user_metadata={"role": role, "full_name": full_name},
        app_metadata={"role": role},
    )


@pytest.fixture
def student_user() -> SimpleNamespace:
    return make_mock_user(STUDENT_USER_ID, "student@pau.edu.ng", "student", "Student Test")


@pytest.fixture
def employer_user() -> SimpleNamespace:
    return make_mock_user(EMPLOYER_USER_ID, "employer@pau.edu.ng", "employer", "Employer Test")


@pytest.fixture
def admin_user() -> SimpleNamespace:
    return make_mock_user(ADMIN_USER_ID, "admin@pau.edu.ng", "admin", "Admin Test")


@pytest.fixture
def student_headers() -> Dict[str, str]:
    return {"Authorization": f"Bearer {STUDENT_TOKEN}"}


@pytest.fixture
def employer_headers() -> Dict[str, str]:
    return {"Authorization": f"Bearer {EMPLOYER_TOKEN}"}


@pytest.fixture
def admin_headers() -> Dict[str, str]:
    return {"Authorization": f"Bearer {ADMIN_TOKEN}"}


# -----------------------------------------------------------------------------
# Mock Supabase Implementation
# -----------------------------------------------------------------------------

class MockPostgrestResponse:
    def __init__(self, data: Any = None, count: Optional[int] = None):
        self.data = data if data is not None else []
        self.count = count if count is not None else (len(self.data) if isinstance(self.data, list) else 1)


class MockQueryBuilder:
    def __init__(self, table_name: str, client: "MockSupabase"):
        self.table_name = table_name
        self.client = client
        self.selected_columns = "*"
        self.filters: List[Any] = []
        self.is_single = False
        self.is_maybe_single = False
        self.mutation_type: Optional[str] = None
        self.mutation_payload: Any = None
        self._custom_return: Optional[Any] = None

    def select(self, columns: str = "*", count: Optional[str] = None):
        self.selected_columns = columns
        return self

    def insert(self, values: Any):
        self.mutation_type = "insert"
        self.mutation_payload = values
        return self

    def update(self, values: Any):
        self.mutation_type = "update"
        self.mutation_payload = values
        return self

    def upsert(self, values: Any, on_conflict: Optional[str] = None):
        self.mutation_type = "upsert"
        self.mutation_payload = values
        return self

    def delete(self):
        self.mutation_type = "delete"
        return self

    def eq(self, column: str, value: Any):
        self.filters.append(("eq", column, value))
        return self

    def neq(self, column: str, value: Any):
        self.filters.append(("neq", column, value))
        return self

    def in_(self, column: str, values: List[Any]):
        self.filters.append(("in", column, values))
        return self

    def is_(self, column: str, value: Any):
        self.filters.append(("is", column, value))
        return self

    def order(self, column: str, desc: bool = False):
        return self

    def limit(self, count: int):
        return self

    def offset(self, start: int):
        return self

    def range(self, start: int, end: int):
        return self

    def single(self):
        self.is_single = True
        return self

    def maybe_single(self):
        self.is_maybe_single = True
        return self

    def execute(self) -> MockPostgrestResponse:
        # Check if table has configured custom data
        table_rows = self.client.data.get(self.table_name, [])

        if self.mutation_type == "insert":
            payload = self.mutation_payload
            inserted = [dict(payload)] if isinstance(payload, dict) else [dict(p) for p in payload]
            import uuid as uuid_lib
            for row in inserted:
                if "id" not in row:
                    row["id"] = str(uuid_lib.uuid4())
            return MockPostgrestResponse(data=inserted)

        if self.mutation_type in ("update", "upsert"):
            payload = self.mutation_payload
            res = payload if isinstance(payload, list) else [payload]
            if self.is_single:
                return MockPostgrestResponse(data=res[0] if res else {})
            return MockPostgrestResponse(data=res)

        if self.mutation_type == "delete":
            return MockPostgrestResponse(data=[])

        # Filter simulation if table has data and filters
        results = list(table_rows)
        for op, col, val in self.filters:
            if op == "eq":
                results = [r for r in results if isinstance(r, dict) and str(r.get(col)) == str(val)]
            elif op == "in":
                val_strs = [str(v) for v in val]
                results = [r for r in results if isinstance(r, dict) and str(r.get(col)) in val_strs]

        if self.is_single:
            single_data = results[0] if results else (table_rows[0] if table_rows else {})
            return MockPostgrestResponse(data=single_data)

        if self.is_maybe_single:
            single_data = results[0] if results else None
            return MockPostgrestResponse(data=single_data)

        return MockPostgrestResponse(data=results, count=len(results))


class MockStorageBucket:
    def __init__(self, name: str):
        self.name = name

    def create_signed_url(self, path: str, expires_in: int = 3600) -> Dict[str, str]:
        return {
            "signedURL": f"https://mock-storage.supabase.co/{self.name}/{path}?token=mock_signed_token",
            "signedUrl": f"https://mock-storage.supabase.co/{self.name}/{path}?token=mock_signed_token",
        }

    def get_public_url(self, path: str) -> str:
        return f"https://mock-storage.supabase.co/{self.name}/{path}"

    def upload(self, path: str, file: Any, file_options: Optional[Dict] = None) -> Dict[str, str]:
        return {"path": path, "id": "mock-storage-file-id"}

    def download(self, path: str) -> bytes:
        return b"%PDF-1.4 Mock PDF Binary Content"

    def remove(self, paths: List[str]) -> List[Dict[str, str]]:
        return [{"name": p} for p in paths]


class MockStorage:
    def __init__(self):
        self.buckets: Dict[str, MockStorageBucket] = {}

    def from_(self, bucket_name: str) -> MockStorageBucket:
        if bucket_name not in self.buckets:
            self.buckets[bucket_name] = MockStorageBucket(bucket_name)
        return self.buckets[bucket_name]


class MockAuthAdmin:
    def create_user(self, attributes: Dict[str, Any]):
        return SimpleNamespace(
            user=SimpleNamespace(
                id=attributes.get("id", "new-user-id"),
                email=attributes.get("email"),
            )
        )

    def list_users(self):
        return []


class MockAuth:
    def __init__(self):
        self.admin = MockAuthAdmin()

    def get_user(self, token: str):
        if token == STUDENT_TOKEN:
            return SimpleNamespace(user=make_mock_user(STUDENT_USER_ID, "student@pau.edu.ng", "student"))
        if token == EMPLOYER_TOKEN:
            return SimpleNamespace(user=make_mock_user(EMPLOYER_USER_ID, "employer@pau.edu.ng", "employer"))
        if token == ADMIN_TOKEN:
            return SimpleNamespace(user=make_mock_user(ADMIN_USER_ID, "admin@pau.edu.ng", "admin"))
        return None


class MockSupabase:
    def __init__(self):
        self.data: Dict[str, List[Dict[str, Any]]] = {
            "profiles": [
                {
                    "id": STUDENT_USER_ID,
                    "full_name": "Student Test",
                    "email": "student@pau.edu.ng",
                    "role": "student",
                    "is_admin": False,
                    "course": "Computer Science",
                    "level": "400",
                    "interests": ["Python", "AI"],
                },
                {
                    "id": EMPLOYER_USER_ID,
                    "full_name": "Employer Test",
                    "email": "employer@pau.edu.ng",
                    "role": "employer",
                    "is_admin": False,
                    "company_name": "Acme Corp",
                },
                {
                    "id": ADMIN_USER_ID,
                    "full_name": "Admin Test",
                    "email": "admin@pau.edu.ng",
                    "role": "admin",
                    "is_admin": True,
                },
            ],
            "internships": [
                {
                    "id": "internship-001",
                    "employer_id": EMPLOYER_USER_ID,
                    "poster_id": EMPLOYER_USER_ID,
                    "company": "Acme Corp",
                    "role": "Software Engineering Intern",
                    "status": "active",
                }
            ],
            "applied_internships": [],
            "saved_internships": [],
            "liked_internships": [],
            "match_results": [],
            "cv_processing_jobs": [],
            "notifications": [],
        }
        self.rpc_responses: Dict[str, Any] = {}
        self.storage = MockStorage()
        self.auth = MockAuth()

    def table(self, table_name: str) -> MockQueryBuilder:
        return MockQueryBuilder(table_name, self)

    def rpc(self, fn_name: str, params: Optional[Dict[str, Any]] = None):
        builder = MockQueryBuilder(f"rpc_{fn_name}", self)
        data = self.rpc_responses.get(fn_name, [])
        builder.execute = lambda: MockPostgrestResponse(data=data)
        return builder

    def set_table_data(self, table_name: str, rows: List[Dict[str, Any]]):
        self.data[table_name] = rows

    def set_rpc_response(self, fn_name: str, response: Any):
        self.rpc_responses[fn_name] = response


# -----------------------------------------------------------------------------
# Pytest Fixtures
# -----------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Clear in-memory rate limiter hits before and after each test."""
    rate_limit_module._hits.clear()
    yield
    rate_limit_module._hits.clear()


@pytest.fixture
def mock_supabase() -> MockSupabase:
    """Mocked Supabase client singleton."""
    return MockSupabase()


@pytest.fixture(autouse=True)
def patch_backend_dependencies(mock_supabase: MockSupabase, monkeypatch, request):
    """
    Automatically mock network-bound services (Supabase, local token verifier, LLMs).
    Tests marked `real_auth` keep the real token verifiers so they can exercise core.security.
    """
    # Patch supabase across all modules
    targets = [
        "core.db.supabase",
        "core.security.supabase",
        "services.supabase_service.supabase",
        "services.job_queue.supabase",
        "routers.admin.supabase",
        "routers.applications.supabase",
        "routers.cv.supabase",
        "routers.logbook.supabase",
        "routers.profiles.supabase",
        "routers.system.supabase",
    ]
    for target in targets:
        monkeypatch.setattr(target, mock_supabase, raising=False)

    # Patch token verification in core.security to recognize mock tokens
    def fake_verify_locally(token: str) -> SimpleNamespace:
        if token == STUDENT_TOKEN:
            return make_mock_user(STUDENT_USER_ID, "student@pau.edu.ng", "student", "Student Test")
        if token == EMPLOYER_TOKEN:
            return make_mock_user(EMPLOYER_USER_ID, "employer@pau.edu.ng", "employer", "Employer Test")
        if token == ADMIN_TOKEN:
            return make_mock_user(ADMIN_USER_ID, "admin@pau.edu.ng", "admin", "Admin Test")
        raise Exception("Invalid token")

    def fake_verify_remotely(token: str) -> SimpleNamespace:
        return fake_verify_locally(token)

    if request.node.get_closest_marker("real_auth") is None:
        monkeypatch.setattr("core.security._verify_locally", fake_verify_locally, raising=False)
        monkeypatch.setattr("core.security._verify_remotely", fake_verify_remotely, raising=False)

    # Mock job queue worker loop so it doesn't poll in background during tests
    async def noop_worker():
        return

    monkeypatch.setattr("services.job_queue.worker_loop", noop_worker, raising=False)


@pytest.fixture
def client() -> TestClient:
    """FastAPI TestClient with cleared dependency overrides after test."""
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def override_user():
    """Helper fixture to explicitly override get_current_user with any mock user."""
    def _override(user: SimpleNamespace):
        app.dependency_overrides[get_current_user] = lambda: user
    yield _override
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def override_admin():
    """Helper fixture to explicitly override verify_admin with an admin user."""
    admin = make_mock_user(ADMIN_USER_ID, "admin@pau.edu.ng", "admin", "Admin Test")
    app.dependency_overrides[verify_admin] = lambda: admin
    yield admin
    app.dependency_overrides.pop(verify_admin, None)
