from __future__ import annotations

import asyncio
import logging
import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from core.security import get_current_user
from services.supabase_service import supabase

logger = logging.getLogger(__name__)

router = APIRouter(tags=["profiles"])


class CompanyProfileUpdate(BaseModel):
    company_description: Optional[str] = Field(default=None, max_length=5000)
    company_website: Optional[str] = Field(default=None, max_length=500)
    company_logo_url: Optional[str] = Field(default=None, max_length=1000)
    company_banner_url: Optional[str] = Field(default=None, max_length=1000)
    industry: Optional[str] = Field(default=None, max_length=200)
    culture: Optional[str] = Field(default=None, max_length=3000)


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
        return {"message": "Company profile updated successfully", "profile": update_res.data[0] if update_res.data else {}}
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
            .select("id, full_name, company_description, company_website, company_logo_url, company_banner_url, industry, culture, role")
            .eq("id", employer_id)
            .maybe_single()
            .execute()
        )

        if not res_profile or not res_profile.data or res_profile.data.get("role") != "employer":
            raise HTTPException(status_code=404, detail="Company not found.")

        res_internships = supabase.table("internships").select("id, role, company, category, description").eq("poster_id", employer_id).execute()

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


# Rows owned by the student. Several FKs (messages.sender_id,
# conversations.student_id, stage history) don't cascade, so remove them
# explicitly before deleting the auth user.
_STUDENT_OWNED_ROWS = [
    ("application_stage_history", "changed_by"),
    ("skill_gap_analyses", "user_id"),
    ("match_results", "user_id"),
    ("saved_internships", "user_id"),
    ("notifications", "user_id"),
    ("cv_processing_jobs", "user_id"),
    ("logbook_entries", "student_id"),
    ("applied_internships", "user_id"),
]


def _storage_key_from_url(url: str | None) -> str | None:
    """'.../object/sign/cvs/<key>.pdf?token=...' -> '<key>.pdf'"""
    if not url or "/cvs/" not in url:
        return None
    return url.split("/cvs/", 1)[1].split("?", 1)[0] or None


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

    key = _storage_key_from_url((data or {}).get("cv_url"))
    if key:
        try:
            supabase.storage.from_("cvs").remove([key])
        except Exception as e:
            logger.warning(f"[DeleteAccount] Could not remove CV file for {user_id}: {e}")

    convos = supabase.table("conversations").select("id").eq("student_id", user_id).execute().data or []
    convo_ids = [c["id"] for c in convos]
    if convo_ids:
        supabase.table("messages").delete().in_("conversation_id", convo_ids).execute()
        supabase.table("conversations").delete().in_("id", convo_ids).execute()
    supabase.table("messages").delete().eq("sender_id", user_id).execute()

    apps = supabase.table("applied_internships").select("id").eq("user_id", user_id).execute().data or []
    app_ids = [a["id"] for a in apps]
    if app_ids:
        try:
            supabase.table("application_stage_history").delete().in_("application_id", app_ids).execute()
        except Exception as e:
            logger.warning(f"[DeleteAccount] Skipped stage history: {e}")

    for table, column in _STUDENT_OWNED_ROWS:
        try:
            supabase.table(table).delete().eq(column, user_id).execute()
        except Exception as e:  # table missing in this environment
            logger.warning(f"[DeleteAccount] Skipped {table}: {e}")

    supabase.auth.admin.delete_user(user_id)
    # profiles.id cascades from auth.users; delete explicitly in case it doesn't.
    supabase.table("profiles").delete().eq("id", user_id).execute()


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
