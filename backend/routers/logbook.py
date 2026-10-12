import asyncio
import logging
import re
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from zoneinfo import ZoneInfo

from core.db import supabase
from core.rate_limit import rate_limit
from core.security import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from services.routing_service import enhance_logbook_entry

logger = logging.getLogger(__name__)

router = APIRouter()

LAGOS_TZ = ZoneInfo("Africa/Lagos")
BACKFILL_DAYS = 7


def get_lagos_today() -> str:
    """Returns today's date in Africa/Lagos (UTC+1) timezone as YYYY-MM-DD."""
    return datetime.now(LAGOS_TZ).date().isoformat()


class EnhanceRequest(BaseModel):
    raw_text: str = Field(..., min_length=1, max_length=10000)


class LogbookStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    FLAGGED = "flagged"


class LogbookEntryRequest(BaseModel):
    student_id: str = Field(..., min_length=1, max_length=128)
    application_id: Optional[str] = Field(default=None, max_length=128)
    date: Optional[str] = Field(default=None)
    activities_raw: str = Field(..., min_length=1, max_length=10000)
    activities_enhanced: Optional[str] = Field(default=None, max_length=15000)


class StatusUpdateRequest(BaseModel):
    status: LogbookStatus
    feedback_notes: Optional[str] = Field(default=None, max_length=2000)


class BulkStatusUpdateRequest(BaseModel):
    entry_ids: list[str] = Field(..., min_length=1)
    status: LogbookStatus
    feedback_notes: Optional[str] = Field(default=None, max_length=2000)


@router.post("/api/logbook/enhance")
async def enhance_entry(
    payload: EnhanceRequest,
    current_user=Depends(rate_limit("logbook_enhance", 20, 3600)),
):
    try:
        enhanced = await enhance_logbook_entry(payload.raw_text)
        return {"enhanced_text": enhanced}
    except Exception as e:
        logger.error(f"Error enhancing logbook entry: {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Failed to enhance logbook entry. AI service may be unavailable.",
        )


@router.post("/api/logbook/entry")
async def upsert_entry(
    payload: LogbookEntryRequest, current_user=Depends(get_current_user)
):
    if payload.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")

    today = get_lagos_today()
    entry_date = payload.date or today

    if not re.match(r"^\d{4}-\d{2}-\d{2}$", entry_date):
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    if entry_date > today:
        raise HTTPException(status_code=400, detail="Cannot create logbook entries for future dates.")

    try:
        today_d = datetime.fromisoformat(today).date()
        entry_d = datetime.fromisoformat(entry_date).date()
        days_ago = (today_d - entry_d).days
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date value.")

    try:
        # 1. Resolve and validate the student's active placement
        target_app_id = payload.application_id
        if not target_app_id:
            app_res = await asyncio.to_thread(
                supabase.table("applied_internships")
                .select("id, user_id, placement_status, internship_id, internships(employer_id, poster_id)")
                .eq("user_id", payload.student_id)
                .eq("placement_status", "active")
                .execute
            )
            if app_res.data and len(app_res.data) > 0:
                placement = app_res.data[0]
                target_app_id = placement["id"]
            else:
                raise HTTPException(
                    status_code=400,
                    detail="You must have an active internship placement to record logbook entries.",
                )
        else:
            app_res = await asyncio.to_thread(
                supabase.table("applied_internships")
                .select("id, user_id, placement_status, internship_id, internships(employer_id, poster_id)")
                .eq("id", target_app_id)
                .execute
            )
            if not app_res.data or len(app_res.data) == 0:
                raise HTTPException(status_code=400, detail="Placement not found.")
            placement = app_res.data[0]

        if placement.get("user_id") != payload.student_id:
            raise HTTPException(status_code=403, detail="Placement does not belong to student.")

        # Determine supervisor
        internship_info = placement.get("internships")
        if isinstance(internship_info, list) and len(internship_info) > 0:
            internship_info = internship_info[0]
        employer_id = (
            internship_info.get("employer_id") or internship_info.get("poster_id")
            if isinstance(internship_info, dict)
            else None
        )

        # 2. Check existing entry for this date
        existing = await asyncio.to_thread(
            supabase.table("logbook_entries")
            .select("*")
            .eq("student_id", payload.student_id)
            .eq("date", entry_date)
            .execute
        )

        existing_entry = existing.data[0] if (existing.data and len(existing.data) > 0) else None

        # Lock check: Approved entries can never be edited
        if existing_entry and existing_entry.get("status") == "approved":
            raise HTTPException(
                status_code=400,
                detail="Approved logbook entries are locked and cannot be edited.",
            )

        # Ended placement check: only allowed if revising a flagged entry
        if placement.get("placement_status") != "active":
            if not (existing_entry and existing_entry.get("status") == "flagged"):
                raise HTTPException(
                    status_code=400,
                    detail="This internship placement has ended; its logbook is read-only.",
                )

        # Backfill window check: 7 days window unless correcting flagged
        if days_ago >= BACKFILL_DAYS:
            if not (existing_entry and existing_entry.get("status") == "flagged"):
                raise HTTPException(
                    status_code=400,
                    detail="You can only log or edit entries from the last 7 days.",
                )

        data = {
            "student_id": payload.student_id,
            "application_id": target_app_id,
            "employer_id": employer_id,
            "date": entry_date,
            "activities_raw": payload.activities_raw,
            "activities_enhanced": payload.activities_enhanced,
            "status": "pending",
            "reviewed_by": None,
            "reviewed_at": None,
        }

        if existing_entry:
            res = await asyncio.to_thread(
                supabase.table("logbook_entries")
                .update(data)
                .eq("id", existing_entry["id"])
                .execute
            )
        else:
            res = await asyncio.to_thread(
                supabase.table("logbook_entries").insert(data).execute
            )

        return {
            "message": "Logbook entry saved successfully.",
            "entry": res.data[0] if res.data else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving logbook entry: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save logbook entry.")


@router.get("/api/logbook/student")
async def get_student_entries(
    student_id: str,
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    if student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        offset = (page - 1) * page_size
        res = await asyncio.to_thread(
            supabase.table("logbook_entries")
            .select("*")
            .eq("student_id", student_id)
            .order("date", desc=True)
            .range(offset, offset + page_size - 1)
            .execute
        )
        return {"entries": res.data or [], "page": page, "page_size": page_size}
    except Exception as e:
        logger.error(f"Error fetching student logbook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch logbook entries.")


@router.get("/api/logbook/employer")
async def get_employer_entries(
    employer_id: str,
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    if employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        offset = (page - 1) * page_size
        res = await asyncio.to_thread(
            supabase.table("logbook_entries")
            .select("*, profiles!student_id(full_name, course, level)")
            .eq("employer_id", employer_id)
            .order("date", desc=True)
            .range(offset, offset + page_size - 1)
            .execute
        )
        return {"entries": res.data or [], "page": page, "page_size": page_size}
    except Exception as e:
        logger.error(f"Error fetching employer logbook entries: {e}", exc_info=True)
        # fallback without join if foreign key alias fails
        try:
            offset = (page - 1) * page_size
            res2 = await asyncio.to_thread(
                supabase.table("logbook_entries")
                .select("*")
                .eq("employer_id", employer_id)
                .order("date", desc=True)
                .range(offset, offset + page_size - 1)
                .execute
            )
            return {"entries": res2.data or [], "page": page, "page_size": page_size}
        except Exception:
            raise HTTPException(
                status_code=500, detail="Failed to fetch logbook entries."
            )


@router.patch("/api/logbook/entry/{entry_id}/status")
async def update_entry_status(
    entry_id: str, payload: StatusUpdateRequest, current_user=Depends(get_current_user)
):
    try:
        existing = await asyncio.to_thread(
            supabase.table("logbook_entries").select("*").eq("id", entry_id).execute
        )
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(status_code=404, detail="Entry not found.")

        entry = existing.data[0]

        # Prevent student self-approval
        if entry.get("student_id") == current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Students cannot review or approve their own entries.",
            )

        if entry.get("employer_id") != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Not authorized to update this entry.",
            )

        update_data = {
            "status": payload.status.value,
            "reviewed_by": current_user.id,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }
        if payload.feedback_notes is not None:
            update_data["feedback_notes"] = payload.feedback_notes

        res = await asyncio.to_thread(
            supabase.table("logbook_entries")
            .update(update_data)
            .eq("id", entry_id)
            .execute
        )
        return {
            "message": "Status updated successfully.",
            "entry": res.data[0] if res.data else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating entry status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update entry status.")


@router.post("/api/logbook/bulk-status")
async def bulk_update_status(
    payload: BulkStatusUpdateRequest, current_user=Depends(get_current_user)
):
    if not payload.entry_ids:
        raise HTTPException(status_code=400, detail="entry_ids cannot be empty.")

    try:
        # Fetch entries to verify ownership
        res = await asyncio.to_thread(
            supabase.table("logbook_entries")
            .select("id, student_id, employer_id, date")
            .in_("id", payload.entry_ids)
            .execute
        )
        entries = res.data or []
        if len(entries) == 0:
            raise HTTPException(status_code=404, detail="No matching entries found.")

        for entry in entries:
            if entry.get("student_id") == current_user.id:
                raise HTTPException(
                    status_code=403,
                    detail="Forbidden: Students cannot review or approve their own entries.",
                )
            if entry.get("employer_id") != current_user.id:
                raise HTTPException(
                    status_code=403,
                    detail="Forbidden: You are not authorized to review one or more of these entries.",
                )

        update_data = {
            "status": payload.status.value,
            "reviewed_by": current_user.id,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }
        if payload.feedback_notes is not None:
            update_data["feedback_notes"] = payload.feedback_notes

        update_res = await asyncio.to_thread(
            supabase.table("logbook_entries")
            .update(update_data)
            .in_("id", payload.entry_ids)
            .execute
        )

        return {
            "message": f"Successfully updated {len(entries)} entries.",
            "updated_count": len(entries),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk status update: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to bulk update entries.")

