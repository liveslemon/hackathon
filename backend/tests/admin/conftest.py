import os
import sys

# Set mock environment variables for test execution before importing core.config or main
os.environ.setdefault("SUPABASE_URL", "https://mock-project.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "mock-service-role-key-for-unit-testing")
os.environ.setdefault("OPENAI_API_KEY", "mock-openai-key")
os.environ.setdefault("ADMIN_EMAILS", "hillary.ilona@pau.edu.ng,admin@pau.edu.ng")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
from types import SimpleNamespace
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from main import app
from core.security import verify_admin, get_current_user


@pytest.fixture
def mock_admin_user():
    return SimpleNamespace(
        id="admin-uuid-123",
        email="hillary.ilona@pau.edu.ng",
        role="admin",
        is_admin=True,
    )


@pytest.fixture
def mock_regular_user():
    return SimpleNamespace(
        id="student-uuid-456",
        email="student@pau.edu.ng",
        role="student",
        is_admin=False,
    )


@pytest.fixture
def client():
    """Unauthenticated client with no dependency overrides."""
    app.dependency_overrides.clear()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_client(mock_admin_user):
    """Authenticated admin client."""
    app.dependency_overrides.clear()
    app.dependency_overrides[verify_admin] = lambda: mock_admin_user
    app.dependency_overrides[get_current_user] = lambda: mock_admin_user

    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
