import sys
import os
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = str(Path(__file__).resolve().parent.parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set test environment defaults before core.config is imported
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key-12345")
os.environ.setdefault("SUPABASE_KEY", "test-anon-key-12345")

import time
from types import SimpleNamespace
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import jwt
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

from core.config import settings
from core.security import (
    get_current_user,
    verify_admin,
    verify_student,
    verify_employer,
)


@pytest.fixture(scope="session")
def rsa_keypair():
    """Generates an RSA keypair for signing and verifying test JWTs."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return {"private_key": private_pem, "public_key": public_pem}


@pytest.fixture(autouse=True)
def mock_jwks(monkeypatch, rsa_keypair):
    """Mocks _jwks_client in security to return our public test key."""
    class MockSigningKey:
        def __init__(self, key):
            self.key = key

    def fake_get_signing_key(token):
        return MockSigningKey(rsa_keypair["public_key"])

    from core import security
    if security._jwks_client:
        monkeypatch.setattr(security._jwks_client, "get_signing_key_from_jwt", fake_get_signing_key)


@pytest.fixture
def make_token(rsa_keypair):
    """Factory for creating RS256 signed JWTs with customizable claims."""
    def _generator(
        sub="test-user-id",
        email="test@pau.edu.ng",
        role="authenticated",
        user_metadata=None,
        app_metadata=None,
        aud="authenticated",
        iss=None,
        exp_delta=3600,
        custom_key=None,
        omit_exp=False,
    ):
        now = int(time.time())
        issuer = iss if iss is not None else f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1"
        claims = {
            "sub": sub,
            "email": email,
            "aud": aud,
            "iss": issuer,
            "iat": now,
            "role": role,
            "user_metadata": user_metadata or {},
            "app_metadata": app_metadata or {},
        }
        if not omit_exp:
            claims["exp"] = now + exp_delta

        key = custom_key if custom_key is not None else rsa_keypair["private_key"]
        return jwt.encode(claims, key, algorithm="RS256")

    return _generator


@pytest.fixture
def test_app():
    """FastAPI app exposing routes for each role guard."""
    app = FastAPI()

    @app.get("/public")
    def public_route():
        return {"status": "public"}

    @app.get("/user")
    def user_route(user=Depends(get_current_user)):
        return {"id": user.id, "email": user.email}

    @app.get("/admin")
    def admin_route(user=Depends(verify_admin)):
        return {"id": user.id, "role": "admin"}

    @app.get("/student")
    def student_route(user=Depends(verify_student)):
        return {"id": user.id, "role": "student"}

    @app.get("/employer")
    def employer_route(user=Depends(verify_employer)):
        return {"id": user.id, "role": "employer"}

    return app


@pytest.fixture
def client(test_app):
    return TestClient(test_app)
