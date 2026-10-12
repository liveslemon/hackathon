import os
import sys
import pytest
from unittest.mock import MagicMock

# Ensure backend root is on sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Set test environment variables to satisfy pydantic settings validation
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key-with-sufficient-length-12345")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key-with-sufficient-length-12345")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-with-sufficient-length-12345")

from fastapi.testclient import TestClient
from main import app
from core.security import get_current_user

class MockUser:
    def __init__(self, user_id="employer-123", email="employer@company.com", role="employer", is_admin=False):
        self.id = user_id
        self.email = email
        self.role = role
        self.is_admin = is_admin

@pytest.fixture
def mock_employer_user():
    return MockUser(user_id="emp-123", email="recruiter@pau.edu.ng", role="employer", is_admin=False)

@pytest.fixture
def mock_other_user():
    return MockUser(user_id="other-456", email="other@pau.edu.ng", role="employer", is_admin=False)

@pytest.fixture
def client():
    return TestClient(app)
