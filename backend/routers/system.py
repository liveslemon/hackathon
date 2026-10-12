import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from core.config import settings
from core.db import supabase
from core.security import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
def home():
    """Service liveness probe and info."""
    return {"status": "online"}


@router.get("/health")
def health():
    """Lightweight liveness probe."""
    return {"status": "healthy"}


@router.get("/ready")
async def readiness():
    """Checks database connectivity asynchronously without blocking event loop."""
    checks = {}
    try:
        await asyncio.to_thread(
            lambda: supabase.table("profiles").select("id").limit(1).execute()
        )
        checks["database"] = "ok"
    except Exception as e:
        logger.warning(f"Readiness check failed for database: {e}")
        checks["database"] = "unavailable"

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503

    return JSONResponse(
        {"status": "ready" if all_ok else "degraded", "checks": checks},
        status_code=status_code,
    )


@router.get("/health-check")
@router.get("/api/health-check")
def health_check():
    return {"status": "ok"}


@router.get("/test-supabase")
async def test_supabase(current_user=Depends(get_current_user)):
    """Test Supabase connection (requires auth; strictly disabled in production)."""
    if settings.is_production:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint not available in production.",
        )
    try:
        res = await asyncio.to_thread(
            lambda: supabase.table("profiles").select("id").limit(1).execute()
        )
        return {"status": "success", "rows_found": len(res.data) if res.data else 0}
    except Exception as e:
        logger.error(f"Supabase test failed: {e}", exc_info=True)
        return {"status": "error", "message": "Database connection failed"}
