import logging
import asyncio
from functools import partial
from fastapi import APIRouter, Depends, HTTPException, Query
from core.security import verify_admin
from core.db import supabase

router = APIRouter()
logger = logging.getLogger(__name__)


def _count_table(table: str, **filters):
    """Count rows in a Supabase table with optional filters."""
    query = supabase.table(table).select("id", count="exact")
    for key, value in filters.items():
        query = query.eq(key, value)
    return query.execute()


@router.get("/admin/stats")
@router.get("/api/admin/stats")
async def fetch_admin_stats(current_user=Depends(verify_admin)):
    try:
        tasks = [
            asyncio.to_thread(partial(_count_table, "profiles", role="student")),
            asyncio.to_thread(partial(_count_table, "internships")),
            asyncio.to_thread(partial(_count_table, "applied_internships")),
        ]
        results = await asyncio.gather(*tasks)

        return {
            "total_students": results[0].count or 0,
            "total_internships": results[1].count or 0,
            "total_applications": results[2].count or 0,
            "applications_today": 0,
            "new_users_today": 0,
        }
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch admin stats.")


@router.get("/admin/analytics")
@router.get("/api/admin/analytics")
async def fetch_admin_analytics(current_user=Depends(verify_admin)):
    try:
        tasks = [
            asyncio.to_thread(
                lambda: supabase.table("internships")
                .select("id, role, company, category")
                .execute()
            ),
            asyncio.to_thread(
                lambda: supabase.table("applied_internships")
                .select("id, internship_id")
                .execute()
            ),
        ]
        results = await asyncio.gather(*tasks)

        jobs = results[0].data or []
        apps = results[1].data or []

        counts: dict[str, int] = {}
        for a in apps:
            iid = a.get("internship_id")
            if iid:
                counts[iid] = counts.get(iid, 0) + 1

        stats = [
            {
                "id": j["id"],
                "title": j.get("role"),
                "company": j.get("company"),
                "applications": counts.get(j["id"], 0),
            }
            for j in jobs
        ]
        stats.sort(key=lambda x: x["applications"], reverse=True)

        return {
            "total_internships": len(jobs),
            "total_applications": len(apps),
            "internship_stats": stats,
        }
    except Exception as e:
        logger.error(f"Error fetching admin analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch analytics.")


@router.get("/admin/directory")
@router.get("/api/admin/directory")
async def fetch_admin_directory(
    current_user=Depends(verify_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    """Fetches registered users with pagination."""
    try:
        offset = (page - 1) * page_size

        count_res = await asyncio.to_thread(
            lambda: supabase.table("profiles")
            .select("id", count="exact")
            .execute()
        )
        total = count_res.count or 0

        res = await asyncio.to_thread(
            lambda ps=page_size, off=offset: supabase.table("profiles")
            .select(
                "id, full_name, role, company_name, company_description, course, level, cv_url, is_admin"
            )
            .range(off, off + ps - 1)
            .execute()
        )

        return {
            "data": res.data or [],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size,
            },
        }
    except Exception as e:
        logger.error(f"Error fetching directory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch directory.")


@router.get("/admin/search")
@router.get("/api/admin/search")
async def search_platform(
    q: str = Query(..., min_length=1, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user=Depends(verify_admin),
):
    """Global search across internships and student profiles."""
    try:
        # Escape ILIKE wildcards to prevent injection
        safe_q = q.replace("%", "\\%").replace("_", "\\_")
        offset = (page - 1) * page_size

        tasks = [
            asyncio.to_thread(
                lambda sq=safe_q, ps=page_size, off=offset: supabase.table(
                    "internships"
                )
                .select("id, role, company, category")
                .or_(f"role.ilike.%{sq}%,company.ilike.%{sq}%")
                .range(off, off + ps - 1)
                .execute()
            ),
            asyncio.to_thread(
                lambda sq=safe_q, ps=page_size, off=offset: supabase.table(
                    "profiles"
                )
                .select("id, full_name, company_name, role")
                .or_(f"full_name.ilike.%{sq}%,company_name.ilike.%{sq}%")
                .range(off, off + ps - 1)
                .execute()
            ),
        ]
        results = await asyncio.gather(*tasks)

        internships = results[0].data or []
        profiles_data = results[1].data or []

        formatted_results = []
        for i in internships:
            formatted_results.append(
                {
                    "id": i["id"],
                    "title": i.get("role"),
                    "subtitle": i.get("company"),
                    "category": "Internship",
                    "url": f"/internships/{i['id']}",
                }
            )
        for p in profiles_data:
            formatted_results.append(
                {
                    "id": p["id"],
                    "title": p.get("full_name") or p.get("company_name"),
                    "subtitle": (p.get("role") or "User").capitalize(),
                    "category": "Person/Company",
                    "url": "#",
                }
            )

        return {"data": formatted_results, "page": page, "page_size": page_size}
    except Exception as e:
        logger.error(f"Error in global search: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Search failed.")
