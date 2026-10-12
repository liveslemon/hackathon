import sys
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "mock-service-role-key")
os.environ.setdefault("SUPABASE_ANON_KEY", "mock-anon-key")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

from main import app
from core.security import get_current_user


@pytest.fixture
def mock_user():
    return SimpleNamespace(
        id="student-123",
        email="student@pau.edu.ng",
        role="student",
        user_metadata={"full_name": "Test Student"},
        app_metadata={},
    )


@pytest.fixture
def mock_employer():
    return SimpleNamespace(
        id="employer-999",
        email="employer@company.com",
        role="employer",
        user_metadata={"full_name": "Test Employer"},
        app_metadata={},
    )


@pytest.fixture
def client(mock_user):
    app.dependency_overrides[get_current_user] = lambda: mock_user
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()
