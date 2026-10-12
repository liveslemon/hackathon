import os
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Set test environment variables before importing app
os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "mock-service-role-key")
os.environ.setdefault("ADMIN_EMAILS", "admin@pau.edu.ng")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

from core.security import get_current_user, verify_admin
from main import app


@pytest.fixture
def mock_student():
    return SimpleNamespace(
        id="11111111-1111-4111-8111-111111111111",
        email="student@pau.edu.ng",
        user_metadata={"role": "student"},
        app_metadata={},
        role="authenticated",
    )


@pytest.fixture
def mock_employer():
    return SimpleNamespace(
        id="22222222-2222-4222-8222-222222222222",
        email="recruiter@partner.ng",
        user_metadata={"role": "employer"},
        app_metadata={},
        role="authenticated",
    )


@pytest.fixture
def mock_admin():
    return SimpleNamespace(
        id="33333333-3333-4333-8333-333333333333",
        email="admin@pau.edu.ng",
        user_metadata={"role": "admin"},
        app_metadata={},
        role="authenticated",
    )


@pytest.fixture
def client():
    # Clear overrides before test
    app.dependency_overrides.clear()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def authed_client(client, mock_student):
    app.dependency_overrides[get_current_user] = lambda: mock_student
    return client


@pytest.fixture
def admin_client(client, mock_admin):
    app.dependency_overrides[get_current_user] = lambda: mock_admin
    app.dependency_overrides[verify_admin] = lambda: mock_admin
    return client
