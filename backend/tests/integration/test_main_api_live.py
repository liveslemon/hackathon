"""
Integration test against live Supabase instance.
Skipped by default in CI and local test runs.
Run with: RUN_LIVE_TESTS=1 pytest tests/integration/test_main_api_live.py
"""

import os
import uuid
import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.skipif(
    not os.getenv("RUN_LIVE_TESTS"),
    reason="Live integration tests require RUN_LIVE_TESTS=1 and real SUPABASE credentials",
)

VALID_USER_ID = os.getenv("TEST_USER_ID", "12b91698-43b7-4e68-8a08-82115de1b5e8")


def test_live_supabase_connection():
    from main import app
    client = TestClient(app)
    resp = client.get("/test-supabase")
    assert resp.status_code in (200, 401)
