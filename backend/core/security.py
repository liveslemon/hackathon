import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
    except Exception as e:
        logger.error(f"[Auth] Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
        )

async def verify_admin(current_user = Depends(get_current_user)):
    """Validates the user has admin role."""
    try:
        res = supabase.table("profiles").select("role").eq("id", current_user.id).single().execute()
        if not res or not res.data or res.data.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Admins only",
            )
        return current_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Auth] Admin verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admins only",
        )
