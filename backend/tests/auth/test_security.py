import asyncio
import time
from types import SimpleNamespace
from unittest.mock import MagicMock
import pytest
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from fastapi import HTTPException

from core import security
from core.security import (
    _verify_locally,
    get_current_user,
    verify_admin,
    verify_student,
    verify_employer,
)

pytestmark = pytest.mark.real_auth


def test_valid_token_local_verification(make_token):
    token = make_token(
        sub="student-123",
        email="ada@pau.edu.ng",
        user_metadata={"full_name": "Ada Lovelace"},
    )
    user = _verify_locally(token)
    assert user.id == "student-123"
    assert user.email == "ada@pau.edu.ng"
    assert user.user_metadata == {"full_name": "Ada Lovelace"}


def test_expired_token_rejected(make_token):
    token = make_token(exp_delta=-60)  # Expired 60s ago (beyond 30s leeway)
    with pytest.raises(jwt.ExpiredSignatureError):
        _verify_locally(token)


def test_leeway_allows_minor_clock_skew(make_token):
    token = make_token(exp_delta=-10)  # Expired 10s ago, but within 30s leeway window
    user = _verify_locally(token)
    assert user.id == "test-user-id"


def test_forged_token_rejected(make_token):
    different_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    different_pem = different_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    forged_token = make_token(custom_key=different_pem)
    with pytest.raises(jwt.InvalidSignatureError):
        _verify_locally(forged_token)


def test_wrong_audience_rejected(make_token):
    token = make_token(aud="anon")
    with pytest.raises(jwt.InvalidAudienceError):
        _verify_locally(token)


def test_wrong_issuer_rejected(make_token):
    token = make_token(iss="https://evil-issuer.com/auth/v1")
    with pytest.raises(jwt.InvalidIssuerError):
        _verify_locally(token)


def test_missing_exp_rejected(make_token):
    token = make_token(omit_exp=True)
    with pytest.raises(jwt.MissingRequiredClaimError):
        _verify_locally(token)


def test_remote_verification_fallback_success(monkeypatch):
    mock_user = SimpleNamespace(id="remote-user", email="remote@pau.edu.ng")
    mock_res = SimpleNamespace(user=mock_user)

    monkeypatch.setattr(security, "_verify_locally", MagicMock(side_effect=jwt.PyJWKClientError("Key not in JWKS")))
    monkeypatch.setattr(security.supabase.auth, "get_user", MagicMock(return_value=mock_res))

    creds = SimpleNamespace(credentials="remote.jwt.token")
    user = asyncio.run(get_current_user(creds))
    assert user.id == "remote-user"
    assert user.email == "remote@pau.edu.ng"


def test_remote_verification_fallback_failure(monkeypatch):
    monkeypatch.setattr(security, "_verify_locally", MagicMock(side_effect=jwt.PyJWKClientError("Key not in JWKS")))
    monkeypatch.setattr(security.supabase.auth, "get_user", MagicMock(return_value=None))

    creds = SimpleNamespace(credentials="invalid.remote.token")
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_user(creds))
    assert exc_info.value.status_code == 401


def test_admin_via_env_email(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_EMAILS", "admin@pau.edu.ng, supervisor@pau.edu.ng")
    admin_user = SimpleNamespace(id="admin-1", email="admin@pau.edu.ng")
    result = asyncio.run(verify_admin(current_user=admin_user))
    assert result.id == "admin-1"


def test_admin_via_db_is_admin(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_EMAILS", "")
    mock_profile = {"is_admin": True, "role": "staff"}

    async def fake_get_profile(uid):
        return mock_profile

    monkeypatch.setattr(security, "_get_user_profile", fake_get_profile)
    user = SimpleNamespace(id="admin-db-1", email="staff@pau.edu.ng")
    result = asyncio.run(verify_admin(current_user=user))
    assert result.id == "admin-db-1"


def test_non_admin_rejected_403(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_EMAILS", "")
    mock_profile = {"is_admin": False, "role": "student"}

    async def fake_get_profile(uid):
        return mock_profile

    monkeypatch.setattr(security, "_get_user_profile", fake_get_profile)
    user = SimpleNamespace(id="student-1", email="student@pau.edu.ng")
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(verify_admin(current_user=user))
    assert exc_info.value.status_code == 403
    assert "Forbidden" in exc_info.value.detail


def test_role_student_allowed_and_employer_denied(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_EMAILS", "")

    async def fake_student_profile(uid):
        return {"role": "student", "is_admin": False}

    monkeypatch.setattr(security, "_get_user_profile", fake_student_profile)
    student_user = SimpleNamespace(id="stu-1", email="stu@pau.edu.ng")
    allowed = asyncio.run(verify_student(current_user=student_user))
    assert allowed.id == "stu-1"

    async def fake_employer_profile(uid):
        return {"role": "employer", "is_admin": False}

    monkeypatch.setattr(security, "_get_user_profile", fake_employer_profile)
    employer_user = SimpleNamespace(id="emp-1", email="emp@company.com")
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(verify_student(current_user=employer_user))
    assert exc_info.value.status_code == 403


def test_admin_bypasses_student_and_employer_guards(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_EMAILS", "superadmin@pau.edu.ng")
    admin_user = SimpleNamespace(id="super-1", email="superadmin@pau.edu.ng")

    res_stu = asyncio.run(verify_student(current_user=admin_user))
    res_emp = asyncio.run(verify_employer(current_user=admin_user))
    assert res_stu.id == "super-1"
    assert res_emp.id == "super-1"


def test_fastapi_client_unauthenticated_request(client):
    res = client.get("/user")
    assert res.status_code == 401 or res.status_code == 403


def test_fastapi_client_endpoints_with_valid_token(client, make_token, monkeypatch):
    token = make_token(sub="user-999", email="student@pau.edu.ng")
    headers = {"Authorization": f"Bearer {token}"}

    # User endpoint
    res = client.get("/user", headers=headers)
    assert res.status_code == 200
    assert res.json() == {"id": "user-999", "email": "student@pau.edu.ng"}


def test_fastapi_client_role_forbidden(client, make_token, monkeypatch):
    token = make_token(sub="student-abc", email="student@pau.edu.ng")
    headers = {"Authorization": f"Bearer {token}"}

    # Student tries to access employer endpoint
    async def fake_profile(uid):
        return {"role": "student", "is_admin": False}

    monkeypatch.setattr(security, "_get_user_profile", fake_profile)
    monkeypatch.setattr(security.settings, "ADMIN_EMAILS", "")

    res = client.get("/employer", headers=headers)
    assert res.status_code == 403

    # Student accesses student endpoint
    res_student = client.get("/student", headers=headers)
    assert res_student.status_code == 200
    assert res_student.json() == {"id": "student-abc", "role": "student"}
