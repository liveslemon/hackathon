import logging
import asyncio
import re
from datetime import datetime, timezone, timedelta
from functools import partial
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from pydantic import BaseModel, Field

from core.security import verify_admin
from core.config import settings
from core.db import supabase
from services.llm_service import llm_client

router = APIRouter()
logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------------
# Input Sanitization & Helpers
# -----------------------------------------------------------------------------

def sanitize_search_query(q: str) -> str:
    """
    Sanitize search query to prevent PostgREST operator injection and filter syntax breaking.
    Strips PostgREST delimiters (commas, colons, dots, parentheses, quotes) and ILIKE wildcards.
    """
    if not q:
        return ""
    # Remove commas, colons, dots, parens, quotes, backslashes, wildcards
    cleaned = re.sub(r"[^\w\s\-@]", "", q, flags=re.UNICODE).strip()
    return cleaned


def _count_table(table: str, **filters):
    """Count rows in a Supabase table with optional filters using count='exact' and limit(0)."""
    query = supabase.table(table).select("id", count="exact").limit(0)
    for key, value in filters.items():
        query = query.eq(key, value)
    return query.execute()


def _get_utc_midnight_iso() -> str:
    """Return midnight today UTC in ISO format."""
    now = datetime.now(timezone.utc)
    midnight = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    return midnight.isoformat()


async def _log_admin_action(actor_id: str, action: str, target_type: str, target_id: str, details: Dict[str, Any] = None):
    """Record an administrative decision in decision_audit_log."""
    try:
        await asyncio.to_thread(
            lambda: supabase.table("decision_audit_log").insert({
                "actor_id": actor_id,
                "action": action,
                "target_type": target_type,
                "target_id": target_id,
                "details": details or {},
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        )
    except Exception as e:
        logger.warning(f"Failed to write admin audit log: {e}")


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------

class StatusUpdatePayload(BaseModel):
    status: str = Field(..., pattern="^(active|closed|expired)$")
    reason: Optional[str] = None


class SuspendUserPayload(BaseModel):
    reason: Optional[str] = None


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.get("/admin/stats")
@router.get("/api/admin/stats")
async def fetch_admin_stats(
    start_date: Optional[str] = Query(None, description="ISO start date filter"),
    end_date: Optional[str] = Query(None, description="ISO end date filter"),
    current_user=Depends(verify_admin),
):
    """
    Fetches real-time platform statistics efficiently using count='exact' queries.
    Returns student, employer, internship, and application counts plus today's additions.
    """
    try:
        midnight_today = _get_utc_midnight_iso()

        # Build count tasks
        tasks = [
            asyncio.to_thread(partial(_count_table, "profiles", role="student")),
            asyncio.to_thread(partial(_count_table, "profiles", role="employer")),
            asyncio.to_thread(partial(_count_table, "internships")),
            asyncio.to_thread(partial(_count_table, "applied_internships")),
            # Applications today
            asyncio.to_thread(
                lambda: supabase.table("applied_internships")
                .select("id", count="exact")
                .gte("created_at", midnight_today)
                .limit(0)
                .execute()
            ),
            # New users today
            asyncio.to_thread(
                lambda: supabase.table("profiles")
                .select("id", count="exact")
                .gte("created_at", midnight_today)
                .limit(0)
                .execute()
            ),
        ]

        # Optional date range counts
        if start_date and end_date:
            tasks.append(
                asyncio.to_thread(
                    lambda: supabase.table("applied_internships")
                    .select("id", count="exact")
                    .gte("created_at", start_date)
                    .lte("created_at", end_date)
                    .limit(0)
                    .execute()
                )
            )

        results = await asyncio.gather(*tasks)

        response = {
            "total_students": results[0].count or 0,
            "total_employers": results[1].count or 0,
            "total_internships": results[2].count or 0,
            "total_applications": results[3].count or 0,
            "applications_today": results[4].count or 0,
            "new_users_today": results[5].count or 0,
        }

        if start_date and end_date and len(results) > 6:
            response["applications_in_range"] = results[6].count or 0

        return response
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch admin stats.",
        )


@router.get("/admin/analytics")
@router.get("/api/admin/analytics")
async def fetch_admin_analytics(
    limit: int = Query(50, ge=5, le=100),
    category: Optional[str] = Query(None),
    current_user=Depends(verify_admin),
):
    """
    Returns analytics data: total counts, avg applications, and top internship stats
    with category and deadline fields for UI rendering, without loading full tables.
    """
    try:
        # 1. Total counts
        count_tasks = [
            asyncio.to_thread(lambda: supabase.table("internships").select("id", count="exact").limit(0).execute()),
            asyncio.to_thread(lambda: supabase.table("applied_internships").select("id", count="exact").limit(0).execute()),
        ]
        count_results = await asyncio.gather(*count_tasks)
        total_internships = count_results[0].count or 0
        total_applications = count_results[1].count or 0

        avg_apps_val = (total_applications / total_internships) if total_internships > 0 else 0.0
        avg_applications = f"{avg_apps_val:.1f}"

        # 2. Fetch internships with pagination
        def _fetch_internships():
            q = supabase.table("internships").select("id, role, company, category, deadline, created_at")
            if category:
                q = q.eq("category", category)
            return q.order("created_at", desc=True).limit(limit).execute()

        internships_res = await asyncio.to_thread(_fetch_internships)
        jobs = internships_res.data or []

        if jobs:
            job_ids = [j["id"] for j in jobs]
            # Fetch application counts for these specific internships only
            def _fetch_app_counts():
                return (
                    supabase.table("applied_internships")
                    .select("id, internship_id")
                    .in_("internship_id", job_ids)
                    .execute()
                )

            apps_res = await asyncio.to_thread(_fetch_app_counts)
            apps = apps_res.data or []

            counts: Dict[str, int] = {}
            for a in apps:
                iid = a.get("internship_id")
                if iid:
                    counts[iid] = counts.get(iid, 0) + 1
        else:
            counts = {}

        stats = [
            {
                "id": j["id"],
                "title": j.get("role") or "Untitled",
                "company": j.get("company") or "Unknown",
                "category": j.get("category") or "General",
                "deadline": j.get("deadline"),
                "applications": counts.get(j["id"], 0),
            }
            for j in jobs
        ]
        stats.sort(key=lambda x: x["applications"], reverse=True)

        return {
            "total_internships": total_internships,
            "total_applications": total_applications,
            "avg_applications": avg_applications,
            "internship_stats": stats,
        }
    except Exception as e:
        logger.error(f"Error fetching admin analytics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch analytics.",
        )


@router.get("/admin/directory")
@router.get("/api/admin/directory")
async def fetch_admin_directory(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    role: Optional[str] = Query(None, pattern="^(student|employer|admin)$"),
    search: Optional[str] = Query(None, max_length=100),
    current_user=Depends(verify_admin),
):
    """
    Fetches registered users with safe pagination, role filtering, and sanitized search.
    Returns both data list and pagination metadata.
    """
    try:
        offset = (page - 1) * page_size
        safe_search = sanitize_search_query(search) if search else ""

        def _count_query():
            q = supabase.table("profiles").select("id", count="exact").limit(0)
            if role:
                q = q.eq("role", role)
            if safe_search:
                q = q.or_(f"full_name.ilike.%{safe_search}%,company_name.ilike.%{safe_search}%,email.ilike.%{safe_search}%")
            return q.execute()

        def _data_query():
            q = supabase.table("profiles").select(
                "id, full_name, email, role, company_name, company_description, course, level, cv_url, is_admin, is_suspended, is_verified, created_at"
            )
            if role:
                q = q.eq("role", role)
            if safe_search:
                q = q.or_(f"full_name.ilike.%{safe_search}%,company_name.ilike.%{safe_search}%,email.ilike.%{safe_search}%")
            return q.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

        count_res, data_res = await asyncio.gather(
            asyncio.to_thread(_count_query),
            asyncio.to_thread(_data_query),
        )

        total = count_res.count or 0
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return {
            "data": data_res.data or [],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
            },
        }
    except Exception as e:
        logger.error(f"Error fetching directory: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch directory.",
        )


@router.get("/admin/search")
@router.get("/api/admin/search")
async def search_platform(
    q: str = Query(..., min_length=1, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user=Depends(verify_admin),
):
    """
    Global search across internships and student/employer profiles with sanitized input.
    Returns keyed results (students, employers, internships) matching SearchOverlay.tsx,
    as well as formatted unified data.
    """
    try:
        safe_q = sanitize_search_query(q)
        if not safe_q:
            return {
                "students": [],
                "employers": [],
                "internships": [],
                "data": [],
                "page": page,
                "page_size": page_size,
            }

        offset = (page - 1) * page_size

        tasks = [
            asyncio.to_thread(
                lambda: supabase.table("internships")
                .select("id, role, company, category")
                .or_(f"role.ilike.%{safe_q}%,company.ilike.%{safe_q}%")
                .range(offset, offset + page_size - 1)
                .execute()
            ),
            asyncio.to_thread(
                lambda: supabase.table("profiles")
                .select("id, full_name, company_name, role, course")
                .or_(f"full_name.ilike.%{safe_q}%,company_name.ilike.%{safe_q}%")
                .range(offset, offset + page_size - 1)
                .execute()
            ),
        ]
        results = await asyncio.gather(*tasks)

        internships_data = results[0].data or []
        profiles_data = results[1].data or []

        # Categorize profiles for SearchOverlay.tsx
        students = [
            {"id": p["id"], "full_name": p.get("full_name"), "course": p.get("course")}
            for p in profiles_data
            if p.get("role") == "student" or (not p.get("role") and p.get("full_name"))
        ]
        employers = [
            {"id": p["id"], "company_name": p.get("company_name"), "full_name": p.get("full_name")}
            for p in profiles_data
            if p.get("role") == "employer" or p.get("company_name")
        ]
        internships_list = [
            {"id": i["id"], "role": i.get("role"), "company": i.get("company")}
            for i in internships_data
        ]

        # Formatted results for generic search consumers
        formatted_results = []
        for i in internships_data:
            formatted_results.append({
                "id": i["id"],
                "title": i.get("role"),
                "subtitle": i.get("company"),
                "category": "Internship",
                "url": f"/internships/{i['id']}",
            })
        for p in profiles_data:
            formatted_results.append({
                "id": p["id"],
                "title": p.get("full_name") or p.get("company_name"),
                "subtitle": (p.get("role") or "User").capitalize(),
                "category": "Person/Company",
                "url": "#",
            })

        return {
            "students": students,
            "employers": employers,
            "internships": internships_list,
            "data": formatted_results,
            "page": page,
            "page_size": page_size,
        }
    except Exception as e:
        logger.error(f"Error in global search: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed.",
        )


@router.get("/admin/llm-health")
@router.get("/api/admin/llm-health")
async def llm_health(current_user=Depends(verify_admin)):
    """Report which LLM providers are reachable with the deployed keys (Admin only)."""
    from services.job_queue import get_llm_pause_status
    try:
        res = llm_client.check_providers()
        results = await res if asyncio.iscoroutine(res) or hasattr(res, "__await__") else res
        return {
            "working": sum(r.get("ok", False) for r in results),
            "providers": results,
            "reasoning_queue": get_llm_pause_status(),
        }
    except Exception as e:
        logger.error(f"Error checking LLM health: {e}", exc_info=True)
        return {"working": 0, "providers": [], "error": str(e), "reasoning_queue": get_llm_pause_status()}


# -----------------------------------------------------------------------------
# Platform Management Actions (Audited)
# -----------------------------------------------------------------------------

@router.post("/admin/users/{user_id}/suspend")
@router.post("/api/admin/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    payload: Optional[SuspendUserPayload] = Body(None),
    current_user=Depends(verify_admin),
):
    """
    Suspend a user account. Cannot target administrators or oneself.
    Audited in decision_audit_log.
    """
    if user_id == getattr(current_user, "id", None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot suspend your own account.",
        )

    # Check target user
    res = await asyncio.to_thread(
        lambda: supabase.table("profiles").select("id, email, role, is_admin").eq("id", user_id).maybe_single().execute()
    )
    target = res.data if res else None
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    admin_emails = [e.strip() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]
    if target.get("is_admin") is True or target.get("role") == "admin" or target.get("email") in admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot suspend an administrator account.",
        )

    reason = payload.reason if payload else None
    now_iso = datetime.now(timezone.utc).isoformat()

    await asyncio.to_thread(
        lambda: supabase.table("profiles").update({
            "is_suspended": True,
            "suspended_at": now_iso,
            "suspended_by": current_user.id,
            "suspension_reason": reason,
        }).eq("id", user_id).execute()
    )

    await _log_admin_action(
        actor_id=current_user.id,
        action="suspend_user",
        target_type="profile",
        target_id=user_id,
        details={"reason": reason},
    )

    return {"success": True, "message": "User suspended successfully."}


@router.post("/admin/users/{user_id}/reinstate")
@router.post("/api/admin/users/{user_id}/reinstate")
async def reinstate_user(
    user_id: str,
    current_user=Depends(verify_admin),
):
    """Reinstate a suspended user account. Audited in decision_audit_log."""
    res = await asyncio.to_thread(
        lambda: supabase.table("profiles").select("id").eq("id", user_id).maybe_single().execute()
    )
    if not res or not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    await asyncio.to_thread(
        lambda: supabase.table("profiles").update({
            "is_suspended": False,
            "suspended_at": None,
            "suspended_by": None,
            "suspension_reason": None,
        }).eq("id", user_id).execute()
    )

    await _log_admin_action(
        actor_id=current_user.id,
        action="reinstate_user",
        target_type="profile",
        target_id=user_id,
    )

    return {"success": True, "message": "User reinstated successfully."}


@router.post("/admin/employers/{employer_id}/verify")
@router.post("/api/admin/employers/{employer_id}/verify")
async def verify_employer(
    employer_id: str,
    current_user=Depends(verify_admin),
):
    """Mark an employer as verified. Audited in decision_audit_log."""
    res = await asyncio.to_thread(
        lambda: supabase.table("profiles").select("id, role").eq("id", employer_id).maybe_single().execute()
    )
    if not res or not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employer not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    await asyncio.to_thread(
        lambda: supabase.table("profiles").update({
            "is_verified": True,
            "verified_at": now_iso,
            "verified_by": current_user.id,
        }).eq("id", employer_id).execute()
    )

    await _log_admin_action(
        actor_id=current_user.id,
        action="verify_employer",
        target_type="profile",
        target_id=employer_id,
    )

    return {"success": True, "message": "Employer verified successfully."}


@router.post("/admin/employers/{employer_id}/unverify")
@router.post("/api/admin/employers/{employer_id}/unverify")
async def unverify_employer(
    employer_id: str,
    current_user=Depends(verify_admin),
):
    """Remove employer verification. Audited in decision_audit_log."""
    res = await asyncio.to_thread(
        lambda: supabase.table("profiles").select("id").eq("id", employer_id).maybe_single().execute()
    )
    if not res or not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employer not found.")

    await asyncio.to_thread(
        lambda: supabase.table("profiles").update({
            "is_verified": False,
            "verified_at": None,
            "verified_by": None,
        }).eq("id", employer_id).execute()
    )

    await _log_admin_action(
        actor_id=current_user.id,
        action="unverify_employer",
        target_type="profile",
        target_id=employer_id,
    )

    return {"success": True, "message": "Employer verification removed."}


@router.post("/admin/internships/{internship_id}/status")
@router.post("/api/admin/internships/{internship_id}/status")
async def update_internship_status(
    internship_id: str,
    payload: StatusUpdatePayload,
    current_user=Depends(verify_admin),
):
    """Update internship status (e.g., active, closed). Audited in decision_audit_log."""
    res = await asyncio.to_thread(
        lambda: supabase.table("internships").select("id, status").eq("id", internship_id).maybe_single().execute()
    )
    if not res or not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internship not found.")

    await asyncio.to_thread(
        lambda: supabase.table("internships").update({
            "status": payload.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", internship_id).execute()
    )

    await _log_admin_action(
        actor_id=current_user.id,
        action="update_internship_status",
        target_type="internship",
        target_id=internship_id,
        details={"new_status": payload.status, "reason": payload.reason},
    )

    return {"success": True, "status": payload.status}
