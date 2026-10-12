from __future__ import annotations

import asyncio
import logging
import uuid as uuid_lib
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from core.security import get_current_user
from core.rate_limit import rate_limit
from services.job_queue import PROFILE_REMATCH, enqueue
from services.supabase_service import supabase

logger = logging.getLogger(__name__)

router = APIRouter(tags=["profiles"])


def _validate_web_url(v: Optional[str]) -> Optional[str]:
    if not v or not v.strip():
        return v
    v = v.strip()
    try:
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("URL must start with http:// or https:// and contain a valid domain.")
    except Exception:
        raise ValueError("Invalid URL format.")
    return v


class CompanyProfileUpdate(BaseModel):
    company_name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    company_description: Optional[str] = Field(default=None, max_length=5000)
    company_website: Optional[str] = Field(default=None, max_length=500)
    company_logo_url: Optional[str] = Field(default=None, max_length=1000)
    company_banner_url: Optional[str] = Field(default=None, max_length=1000)
    industry: Optional[str] = Field(default=None, max_length=200)
    culture: Optional[str] = Field(default=None, max_length=3000)
    notification_preferences: Optional[dict[str, Any]] = Field(default=None)

    @field_validator("company_website", "company_logo_url", "company_banner_url")
    @classmethod
    def validate_urls(cls, v: Optional[str]) -> Optional[str]:
        return _validate_web_url(v)


def _validate_uuid(value: str) -> str:
    """Validate a string is a valid UUID."""
    try:
        uuid_lib.UUID(value)
        return value
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid ID format. Expected UUID.")


@router.patch("/api/employer/profile")
def update_company_profile(payload: CompanyProfileUpdate, current_user=Depends(get_current_user)):
    """Updates the company details on the employer's profile."""
    try:
        res = supabase.table("profiles").select("role").eq("id", current_user.id).single().execute()
        if not res.data or res.data.get("role") != "employer":
            raise HTTPException(status_code=403, detail="Only employers can update company profiles.")

        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            return {"message": "No data to update"}

        update_res = supabase.table("profiles").update(update_data).eq("id", current_user.id).execute()
        return {
            "message": "Company profile updated successfully",
            "profile": update_res.data[0] if update_res.data else {},
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/api/employer/profile] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update company profile.")


@router.get("/api/companies/{employer_id}")
def get_company_profile(employer_id: str):
    """Fetches public company profile details and their internships."""
    _validate_uuid(employer_id)
    try:
        res_profile = (
            supabase.table("profiles")
            .select(
                "id, full_name, company_name, company_description, company_website, "
                "company_logo_url, company_banner_url, industry, culture, role, notification_preferences"
            )
            .eq("id", employer_id)
            .maybe_single()
            .execute()
        )

        if not res_profile or not res_profile.data or res_profile.data.get("role") != "employer":
            raise HTTPException(status_code=404, detail="Company not found.")

        # Query internships posted by employer, checking both poster_id and employer_id
        res_internships = (
            supabase.table("internships")
            .select("id, role, company, category, description, location, deadline, status, poster_id, employer_id")
            .or_(f"poster_id.eq.{employer_id},employer_id.eq.{employer_id}")
            .execute()
        )

        return {
            "company": res_profile.data,
            "internships": res_internships.data or [],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/api/companies/{employer_id}] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch company profile.")


class DeleteAccountRequest(BaseModel):
    confirm: str = Field(..., description='Must be exactly "DELETE"')


# Tables where student-owned rows must be explicitly removed before deleting auth user
_STUDENT_OWNED_ROWS = [
    ("application_stage_history", "changed_by"),
    ("skill_gap_analyses", "user_id"),
    ("match_results", "user_id"),
    ("saved_internships", "user_id"),
    ("notifications", "user_id"),
    ("cv_processing_jobs", "user_id"),
    ("cv_versions", "user_id"),
    ("company_followers", "student_id"),
    ("logbook_entries", "student_id"),
    ("applied_internships", "user_id"),
    ("decision_audit_log", "actor_id"),
    ("audit_log", "actor_id"),
]


def _storage_key_from_url(url: str | None) -> str | None:
    """'.../object/sign/cvs/<key>.pdf?token=...' -> '<key>.pdf'"""
    if not url or "/cvs/" not in url:
        return None
    cleaned = url.split("/cvs/", 1)[1].split("?", 1)[0]
    return cleaned if cleaned else None


def _delete_student_account(user_id: str) -> None:
    profile = (
        supabase.table("profiles").select("role, cv_url").eq("id", user_id).maybe_single().execute()
    )
    data = profile.data if profile else None
    if data and data.get("role") not in (None, "student"):
        raise HTTPException(
            status_code=403,
            detail="Only student accounts can be deleted here. Contact an admin to close an employer account.",
        )

    # 1. Clean up storage: primary CV and any previous CV versions
    keys_to_remove: set[str] = set()
    primary_key = _storage_key_from_url((data or {}).get("cv_url"))
    if primary_key:
        keys_to_remove.add(primary_key)

    try:
        cv_versions = (
            supabase.table("cv_versions").select("cv_url").eq("user_id", user_id).execute().data or []
        )
        for row in cv_versions:
            ver_key = _storage_key_from_url(row.get("cv_url"))
            if ver_key:
                keys_to_remove.add(ver_key)
    except Exception as e:
        logger.warning(f"[DeleteAccount] Could not fetch cv_versions for {user_id}: {e}")

    if keys_to_remove:
        try:
            supabase.storage.from_("cvs").remove(list(keys_to_remove))
            logger.info(f"[DeleteAccount] Removed {len(keys_to_remove)} CV storage files for {user_id}")
        except Exception as e:
            logger.warning(f"[DeleteAccount] Could not remove CV files for {user_id}: {e}")

    # 2. Clean up conversations & messages
    try:
        convos = (
            supabase.table("conversations").select("id").eq("student_id", user_id).execute().data or []
        )
        convo_ids = [c["id"] for c in convos]
        if convo_ids:
            supabase.table("messages").delete().in_("conversation_id", convo_ids).execute()
            supabase.table("conversations").delete().in_("id", convo_ids).execute()
        supabase.table("messages").delete().eq("sender_id", user_id).execute()
    except Exception as e:
        logger.warning(f"[DeleteAccount] Skipped conversations/messages cleanup for {user_id}: {e}")

    # 3. Clean up application stage history linked to student's applications
    try:
        apps = (
            supabase.table("applied_internships").select("id").eq("user_id", user_id).execute().data or []
        )
        app_ids = [a["id"] for a in apps]
        if app_ids:
            supabase.table("application_stage_history").delete().in_("application_id", app_ids).execute()
    except Exception as e:
        logger.warning(f"[DeleteAccount] Skipped application stage history for {user_id}: {e}")

    # 4. Clean up student-owned rows in all related tables
    for table, column in _STUDENT_OWNED_ROWS:
        try:
            supabase.table(table).delete().eq(column, user_id).execute()
        except Exception as e:
            logger.warning(f"[DeleteAccount] Skipped table {table}.{column} for {user_id}: {e}")

    # 5. Revoke auth and delete user from Supabase Auth
    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        logger.warning(f"[DeleteAccount] Admin delete_user failed (will attempt profile delete): {e}")

    # 6. Fallback explicit delete from profiles table
    try:
        supabase.table("profiles").delete().eq("id", user_id).execute()
    except Exception as e:
        logger.warning(f"[DeleteAccount] Explicit profiles delete failed: {e}")


@router.post("/api/me/delete")
async def delete_my_account(payload: DeleteAccountRequest, current_user=Depends(get_current_user)):
    """Permanently delete the signed-in student's account and personal data."""
    if payload.confirm != "DELETE":
        raise HTTPException(status_code=400, detail='Type DELETE to confirm.')
    try:
        await asyncio.to_thread(_delete_student_account, current_user.id)
        logger.info(f"[DeleteAccount] Deleted account {current_user.id}")
        return {"deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DeleteAccount] Failed for {current_user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not delete your account. Please try again or contact support.")


@router.post("/api/me/refresh-matches")
async def refresh_my_matches(
    current_user=Depends(rate_limit("refresh_matches", 10, 3600)),
):
    """Re-run matching after the student edits their profile (skills, projects, ...)."""
    await asyncio.to_thread(enqueue, current_user.id, PROFILE_REMATCH, None, "profile")
    return {"status": "processing"}

