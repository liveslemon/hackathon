import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch
import pytest

# Ensure backend root is on sys.path
backend_root = str(Path(__file__).resolve().parent.parent.parent)
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Ensure required environment variables for tests without live Supabase
os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "mock-secret-service-role-key")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000,http://127.0.0.1:3000")
os.environ.setdefault("ENVIRONMENT", "development")

@pytest.fixture(autouse=True)
def mock_supabase():
    """Mock Supabase client calls to avoid any network requests."""
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_client.from_.return_value = mock_table

    with patch("core.db.supabase", mock_client), \
         patch("services.supabase_service.supabase", mock_client):
        yield mock_client

@pytest.fixture
def client(mock_supabase):
    """FastAPI TestClient fixture."""
    from fastapi.testclient import TestClient
    from main import app

    with patch("services.job_queue.worker_loop", new_callable=AsyncMock):
        with TestClient(app, raise_server_exceptions=False) as test_client:
            yield test_client
