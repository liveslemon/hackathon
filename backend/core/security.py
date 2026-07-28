import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import settings
from .db import supabase

logger = logging.getLogger(__name__)
auth_scheme = HTTPBearer()


async def get_current_user(token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    """Validates the Supabase JWT and returns the user object."""
    try:
        res = supabase.auth.get_user(token.credentials)
        if not res or not res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session.",
            )
        return res.user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Auth] Token verification failed: {e}", exc_info=True)
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
        res = (
            supabase.table("profiles")
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
