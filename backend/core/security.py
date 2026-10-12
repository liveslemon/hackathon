import asyncio
import logging
from types import SimpleNamespace
from typing import Iterable, Sequence

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .config import settings
from .db import supabase

logger = logging.getLogger(__name__)
auth_scheme = HTTPBearer()

# Supabase signs access tokens with asymmetric keys (ES256/RS256) published at
# this JWKS URL, so tokens can be verified locally instead of a network call
# to the Auth server on every request. PyJWKClient caches the keys.
_jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json" if settings.SUPABASE_URL else None
_jwks_client = jwt.PyJWKClient(
    _jwks_url,
    cache_keys=True,
    lifespan=3600,
) if _jwks_url else None


def _user_from_claims(claims: dict) -> SimpleNamespace:
    """Shape JWT claims like the supabase User object the routes expect."""
    return SimpleNamespace(
        id=claims["sub"],
        email=claims.get("email"),
        user_metadata=claims.get("user_metadata") or {},
        app_metadata=claims.get("app_metadata") or {},
        role=claims.get("role"),
    )


def _verify_locally(token: str) -> SimpleNamespace:
    if not _jwks_client:
        raise jwt.PyJWKClientError("JWKS client not configured")
    signing_key = _jwks_client.get_signing_key_from_jwt(token)

    expected_issuer = (
        f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1"
        if settings.SUPABASE_URL
        else None
    )

    decode_kwargs = {
        "algorithms": ["ES256", "RS256"],
        "audience": "authenticated",
        "leeway": 30,
        "options": {
            "require": ["exp", "sub"],
            "verify_exp": True,
            "verify_aud": True,
        },
    }

    if expected_issuer:
        decode_kwargs["issuer"] = expected_issuer
        decode_kwargs["options"]["verify_iss"] = True
    else:
        decode_kwargs["options"]["verify_iss"] = False

    claims = jwt.decode(token, signing_key.key, **decode_kwargs)
    return _user_from_claims(claims)


def _verify_remotely(token: str):
    res = supabase.auth.get_user(token)
    if not res or not res.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )
    return res.user


async def get_current_user(token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    """Validates the Supabase JWT and returns the user."""
    try:
        return _verify_locally(token.credentials)
    except jwt.PyJWKClientError as e:
        # No matching key (legacy HS256 token, rotated key) or JWKS unreachable:
        # let the Auth server decide.
        logger.info(f"[Auth] No local key for token ({e}); checking with Auth server")
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.InvalidTokenError:
        # Malformed, bad signature, wrong issuer or wrong audience.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )

    try:
        return await asyncio.to_thread(_verify_remotely, token.credentials)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"[Auth] Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
        )


async def _get_user_profile(user_id: str) -> dict:
    try:
        res = await asyncio.to_thread(
            lambda: supabase.table("profiles")
            .select("role, is_admin")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if res and res.data:
            return res.data
    except Exception as e:
        logger.error(f"[Auth] Failed to load profile for user {user_id}: {e}", exc_info=True)
    return {}


async def verify_admin(current_user=Depends(get_current_user)):
    """Validates the user has admin role via database lookup (or env-configured admin emails)."""
    admin_emails = [
        e.strip() for e in settings.ADMIN_EMAILS.split(",") if e.strip()
    ]
    if current_user.email and current_user.email in admin_emails:
        return current_user

    profile = await _get_user_profile(current_user.id)
    is_admin = profile.get("is_admin") is True or profile.get("role") == "admin"

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admins only",
        )
    return current_user


def require_role(allowed_roles: Sequence[str] | Iterable[str]):
    """Returns a FastAPI dependency that verifies the user has one of the specified roles or is an admin."""
    roles_set = set(allowed_roles)

    async def _role_verifier(current_user=Depends(get_current_user)):
        admin_emails = [
            e.strip() for e in settings.ADMIN_EMAILS.split(",") if e.strip()
        ]
        if current_user.email and current_user.email in admin_emails:
            return current_user

        profile = await _get_user_profile(current_user.id)
        is_admin = profile.get("is_admin") is True or profile.get("role") == "admin"
        if is_admin:
            return current_user

        user_role = profile.get("role")
        if user_role not in roles_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: requires role in {sorted(roles_set)}",
            )
        return current_user

    return _role_verifier


verify_student = require_role(["student"])
verify_employer = require_role(["employer"])
