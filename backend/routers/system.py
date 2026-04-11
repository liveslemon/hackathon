from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from core.config import settings
from core.security import get_current_user
from core.db import supabase

router = APIRouter()

@router.get("/")
def home():
    return {
        "status": "online",
        "version": "v4.2-async",
        "ai_enabled": bool(settings.NVIDIA_API_KEY),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/health-check")
@router.get("/api/health-check")
def health():
    return {"status": "ok", "version": "v4.2-async"}

@router.get("/test-supabase")
def test_supabase(current_user = Depends(get_current_user)):
    """Test Supabase connection."""
    try:
        res = supabase.table("profiles").select("*").limit(1).execute()
        return {"status": "success", "example_profile": res.data[0] if res.data else None}
    except Exception as e:
        return {"status": "error", "message": str(e)}
