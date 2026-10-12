import os
import pytest
from types import SimpleNamespace
from unittest.mock import MagicMock

os.environ.setdefault("SUPABASE_URL", "https://mock-test-project.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "mock-test-service-role-key-12345")
os.environ.setdefault("SUPABASE_ANON_KEY", "mock-test-anon-key-12345")

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.profiles import router as profiles_router
from core.security import get_current_user


@pytest.fixture
def mock_student_user():
    return SimpleNamespace(
        id="11111111-1111-1111-1111-111111111111",
        email="student@pau.edu.ng",
        role="authenticated",
    )


@pytest.fixture
def mock_employer_user():
    return SimpleNamespace(
        id="22222222-2222-2222-2222-222222222222",
        email="hr@paystack.com",
        role="authenticated",
    )


@pytest.fixture
def test_app():
    app = FastAPI()
    app.include_router(profiles_router)
    return app


@pytest.fixture
def student_client(test_app, mock_student_user):
    test_app.dependency_overrides[get_current_user] = lambda: mock_student_user
    client = TestClient(test_app)
    yield client
    test_app.dependency_overrides.clear()


@pytest.fixture
def employer_client(test_app, mock_employer_user):
    test_app.dependency_overrides[get_current_user] = lambda: mock_employer_user
    client = TestClient(test_app)
    yield client
    test_app.dependency_overrides.clear()


@pytest.fixture
def unauth_client(test_app):
    test_app.dependency_overrides.clear()
    return TestClient(test_app)
