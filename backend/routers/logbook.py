import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime, date

from backend.core.db import supabase
from backend.core.security import get_current_user
from backend.services.routing_service import enhance_logbook_entry

logger = logging.getLogger(__name__)

router = APIRouter()

class EnhanceRequest(BaseModel):
    raw_text: str

class LogbookEntryRequest(BaseModel):
    student_id: str
    employer_id: str
    activities_raw: str
    activities_enhanced: Optional[str] = None

class StatusUpdateRequest(BaseModel):
    status: str # 'approved' or 'flagged'

@router.post("/api/logbook/enhance")
async def enhance_entry(payload: EnhanceRequest, current_user = Depends(get_current_user)):
    if not payload.raw_text.strip():
        raise HTTPException(status_code=400, detail="Raw text cannot be empty.")
    try:
        enhanced = await enhance_logbook_entry(payload.raw_text)
        return {"enhanced_text": enhanced}
    except Exception as e:
        logger.error(f"Error enhancing logbook entry: {e}")
        raise HTTPException(status_code=500, detail="Failed to enhance logbook entry.")

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
    except Exception as e:
        logger.error(f"Error saving logbook entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/logbook/student")
async def get_student_entries(student_id: str, current_user = Depends(get_current_user)):
    if student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        # Order by date descending
        res = supabase.table("logbook_entries").select("*").eq("student_id", student_id).order("date", desc=True).execute()
        return {"entries": res.data}
    except Exception as e:
        logger.error(f"Error fetching student logbook: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch logbook entries.")

@router.get("/api/logbook/employer")
async def get_employer_entries(employer_id: str, current_user = Depends(get_current_user)):
    if employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        # Get entries pending or flagged/approved. 
        # We also want student details (join on profiles.full_name maybe?)
        # Supabase Python client might not do nested select easily if profiles is not explicitly linked in a way we query here,
        # but we can just fetch all for this employer id.
        res = supabase.table("logbook_entries").select("*, profiles!logbook_entries_student_id_fkey(full_name, email, avatar_url)").eq("employer_id", employer_id).order("date", desc=True).execute()
        return {"entries": res.data}
    except Exception as e:
        logger.error(f"Error fetching employer logbook entries: {e}")
        # fallback without join if foreign key alias fails
        try:
             res2 = supabase.table("logbook_entries").select("*").eq("employer_id", employer_id).order("date", desc=True).execute()
             return {"entries": res2.data}
        except Exception:
             raise HTTPException(status_code=500, detail="Failed to fetch logbook entries.")

@router.patch("/api/logbook/entry/{entry_id}/status")
async def update_entry_status(entry_id: str, payload: StatusUpdateRequest, current_user = Depends(get_current_user)):
    if payload.status not in ["approved", "flagged"]:
         raise HTTPException(status_code=400, detail="Invalid status.")
    try:
        # Verify ownership
        existing = supabase.table("logbook_entries").select("*").eq("id", entry_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Entry not found.")
        
        if existing.data[0]["employer_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden: Not authorized to update this entry.")
            
        res = supabase.table("logbook_entries").update({"status": payload.status}).eq("id", entry_id).execute()
        return {"message": "Status updated successfully.", "entry": res.data[0] if res.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating entry status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update entry status.")
