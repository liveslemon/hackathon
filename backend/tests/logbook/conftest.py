import os
from unittest.mock import MagicMock

# Set required environment variables before settings instantiation
os.environ["SUPABASE_URL"] = "http://localhost:54321"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock_service_role_key_for_testing_12345"
os.environ["OPENAI_API_KEY"] = "mock_openai_key"

import pytest
from core.security import get_current_user
from fastapi.testclient import TestClient
from main import app


class MockUser:
    def __init__(self, user_id: str, email: str = "user@pau.edu.ng", role: str = "student"):
        self.id = user_id
        self.email = email
        self.role = role


@pytest.fixture
def student_user():
    return MockUser("student-123", "student@pau.edu.ng", "student")


@pytest.fixture
def employer_user():
    return MockUser("employer-456", "employer@acme.com", "employer")


@pytest.fixture
def wrong_employer_user():
    return MockUser("employer-999", "other@corp.com", "employer")


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
