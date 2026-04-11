import logging
import asyncio
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from core.security import verify_admin
from core.db import supabase

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/admin/stats")
@router.get("/api/admin/stats")
async def fetch_admin_stats(current_user = Depends(verify_admin)):
    try:
        # Parallelize the count queries using asyncio.to_thread
        tasks = [
            asyncio.to_thread(lambda: supabase.table("profiles").select("id", count="exact").eq("role", "student").execute()),
            asyncio.to_thread(lambda: supabase.table("internships").select("id", count="exact").execute()),
            asyncio.to_thread(lambda: supabase.table("applied_internships").select("id", count="exact").execute())
        ]
        
        results = await asyncio.gather(*tasks)
        
        t_students = results[0].count or 0
        t_jobs = results[1].count or 0
        t_apps = results[2].count or 0
        
        return {
            "total_students": t_students, 
            "total_internships": t_jobs, 
            "total_applications": t_apps,
            "applications_today": 0, # Placeholder or add query
            "new_users_today": 0     # Placeholder or add query
        }
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/admin/analytics")
@router.get("/api/admin/analytics")
async def fetch_admin_analytics(current_user = Depends(verify_admin)):
    try:
        # Parallelize the main queries
        tasks = [
            asyncio.to_thread(lambda: supabase.table("internships").select("id, role, company, category").execute()),
            asyncio.to_thread(lambda: supabase.table("applied_internships").select("id, internship_id").execute())
        ]
        
        results = await asyncio.gather(*tasks)
        
        jobs = results[0].data or []
        apps = results[1].data or []
        
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
        logger.error(f"Error fetching admin analytics: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)
