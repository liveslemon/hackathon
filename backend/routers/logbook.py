import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import datetime

from core.db import supabase
from core.security import get_current_user
from services.routing_service import enhance_logbook_entry

logger = logging.getLogger(__name__)

router = APIRouter()


class EnhanceRequest(BaseModel):
    raw_text: str = Field(..., min_length=1, max_length=10000)


class LogbookEntryRequest(BaseModel):
    student_id: str = Field(..., min_length=1, max_length=128)
    employer_id: str = Field(..., min_length=1, max_length=128)
    activities_raw: str = Field(..., min_length=1, max_length=10000)
    activities_enhanced: Optional[str] = Field(default=None, max_length=15000)


class LogbookStatus(str, __import__("enum").Enum):
    APPROVED = "approved"
    FLAGGED = "flagged"


class StatusUpdateRequest(BaseModel):
    status: LogbookStatus
    feedback_notes: Optional[str] = Field(default=None, max_length=2000)

@router.post("/api/logbook/enhance")
async def enhance_entry(payload: EnhanceRequest, current_user=Depends(get_current_user)):
    try:
        enhanced = await enhance_logbook_entry(payload.raw_text)
        return {"enhanced_text": enhanced}
    except Exception as e:
        logger.error(f"Error enhancing logbook entry: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail="Failed to enhance logbook entry. AI service may be unavailable.")

@router.post("/api/logbook/entry")
async def upsert_entry(payload: LogbookEntryRequest, current_user = Depends(get_current_user)):
    if payload.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    
    today = datetime.now().date().isoformat()
    
    # We upsert to allow them to edit today's entry until it's approved.
    try:
        # First check if today's entry exists
        existing = supabase.table("logbook_entries").select("*").eq("student_id", payload.student_id).eq("date", today).execute()
        
        data = {
            "student_id": payload.student_id,
            "employer_id": payload.employer_id,
            "date": today,
            "activities_raw": payload.activities_raw,
            "activities_enhanced": payload.activities_enhanced,
            "status": "pending" 
        }

        if existing.data and len(existing.data) > 0:
            if existing.data[0].get("status") == "approved":
                 raise HTTPException(status_code=400, detail="Today's entry is already approved and cannot be edited.")
                 
            res = supabase.table("logbook_entries").update(data).eq("id", existing.data[0]["id"]).execute()
        else:
            res = supabase.table("logbook_entries").insert(data).execute()

        return {"message": "Logbook entry saved successfully.", "entry": res.data[0] if res.data else None}
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
        res = (
            supabase.table("logbook_entries")
            .select("*")
            .eq("student_id", student_id)
            .order("date", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
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
        res = (
            supabase.table("logbook_entries")
            .select("*, profiles!logbook_entries_student_id_fkey(full_name, course, level)")
            .eq("employer_id", employer_id)
            .order("date", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        return {"entries": res.data or [], "page": page, "page_size": page_size}
    except Exception as e:
        logger.error(f"Error fetching employer logbook entries: {e}", exc_info=True)
        # fallback without join if foreign key alias fails
        try:
            offset = (page - 1) * page_size
            res2 = (
                supabase.table("logbook_entries")
                .select("*")
                .eq("employer_id", employer_id)
                .order("date", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            return {"entries": res2.data or [], "page": page, "page_size": page_size}
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to fetch logbook entries.")

@router.patch("/api/logbook/entry/{entry_id}/status")
async def update_entry_status(entry_id: str, payload: StatusUpdateRequest, current_user=Depends(get_current_user)):
    try:
        # Verify ownership
        existing = supabase.table("logbook_entries").select("*").eq("id", entry_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Entry not found.")
        
        if existing.data[0]["employer_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden: Not authorized to update this entry.")
            
        update_data = {"status": payload.status.value}
        if payload.feedback_notes is not None:
            update_data["feedback_notes"] = payload.feedback_notes
            
        res = supabase.table("logbook_entries").update(update_data).eq("id", entry_id).execute()
        return {"message": "Status updated successfully.", "entry": res.data[0] if res.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating entry status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update entry status.")
