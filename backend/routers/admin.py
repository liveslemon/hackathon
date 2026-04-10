import logging
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from core.security import verify_admin
from core.db import supabase

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/admin/stats")
@router.get("/api/admin/stats")
def fetch_admin_stats(current_user = Depends(verify_admin)):
    try:
        t_students = supabase.table("profiles").select("id", count="exact").eq("role", "student").execute().count or 0
        t_jobs = supabase.table("internships").select("id", count="exact").execute().count or 0
        t_apps = supabase.table("applied_internships").select("id", count="exact").execute().count or 0
        return {"total_students": t_students, "total_internships": t_jobs, "total_applications": t_apps}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin/search")
@router.get("/api/admin/search")
def run_admin_search(q: str = "", current_user = Depends(verify_admin)):
    if len(q) < 2: return {"students": [], "internships": []}
    try:
        students = supabase.table("profiles").select("*").eq("role", "student").or_(f"full_name.ilike.%{q}%,course.ilike.%{q}%").execute().data or []
        jobs = supabase.table("internships").select("*").or_(f"role.ilike.%{q}%,company.ilike.%{q}%,category.ilike.%{q}%").execute().data or []
        return {"students": students, "internships": jobs}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin/directory")
@router.get("/api/admin/directory")
def fetch_admin_directory(current_user = Depends(verify_admin)):
    try:
        res = supabase.table("profiles").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin/analytics")
@router.get("/api/admin/analytics")
def fetch_admin_analytics(current_user = Depends(verify_admin)):
    try:
        jobs = supabase.table("internships").select("id, role, company, category").execute().data or []
        apps = supabase.table("applied_internships").select("id, internship_id").execute().data or []
        
        stats = []
        counts = {}
        for a in apps:
            iid = a.get("internship_id")
            if iid: counts[iid] = counts.get(iid, 0) + 1
            
        for j in jobs:
            stats.append({
                "id": j["id"],
                "title": j.get("role"),
                "company": j.get("company"),
                "applications": counts.get(j["id"], 0)
            })
        stats.sort(key=lambda x: x["applications"], reverse=True)
        return {"total_internships": len(jobs), "total_applications": len(apps), "internship_stats": stats}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
