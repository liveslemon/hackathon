from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from core.security import get_current_user
from core.db import supabase

router = APIRouter()


@router.get("/")
def home():
    return {"status": "online"}


@router.get("/health")
def health():
    """Lightweight liveness probe."""
    return {"status": "healthy"}


@router.get("/ready")
def readiness():
    """Checks database connectivity."""
    checks = {}
    try:
        supabase.table("profiles").select("id").limit(1).execute()
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "unavailable"

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503

    from fastapi.responses import JSONResponse
    return JSONResponse(
        {"status": "ready" if all_ok else "degraded", "checks": checks},
        status_code=status_code,
    )


@router.get("/health-check")
@router.get("/api/health-check")
def health_check():
    return {"status": "ok"}


@router.get("/test-supabase")
def test_supabase(current_user=Depends(get_current_user)):
    """Test Supabase connection (requires auth)."""
    try:
        res = supabase.table("profiles").select("id").limit(1).execute()
        return {"status": "success", "rows_found": len(res.data) if res.data else 0}
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Supabase test failed: {e}", exc_info=True)
        return {"status": "error", "message": "Database connection failed"}
