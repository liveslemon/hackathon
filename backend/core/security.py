import asyncio
import logging
from types import SimpleNamespace

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import settings
from .db import supabase

logger = logging.getLogger(__name__)
auth_scheme = HTTPBearer()

# Supabase signs access tokens with asymmetric keys (ES256/RS256) published at
# this JWKS URL, so tokens can be verified locally instead of a network call
# to the Auth server on every request. PyJWKClient caches the keys.
_jwks_client = jwt.PyJWKClient(
    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json",
    cache_keys=True,
    lifespan=3600,
)


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
    signing_key = _jwks_client.get_signing_key_from_jwt(token)
    claims = jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256", "RS256"],
        audience="authenticated",
    )
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
    except jwt.InvalidTokenError:
        # Expired, malformed, bad signature or wrong audience.
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


async def verify_admin(current_user=Depends(get_current_user)):
    """Validates the user has admin role via database lookup (or env-configured admin emails)."""
    # Check environment-configured admin emails (replaces hardcoded email)
    admin_emails = [
        e.strip() for e in settings.ADMIN_EMAILS.split(",") if e.strip()
    ]
    if current_user.email in admin_emails:
        return current_user

    try:
        res = await asyncio.to_thread(
            lambda: supabase.table("profiles")
            .select("role, is_admin")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        if not res or not res.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Admins only",
            )

        is_admin = res.data.get("is_admin") is True or res.data.get("role") == "admin"

        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Admins only",
            )
        return current_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Auth] Admin verification failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admins only",
        )
