import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.security import get_current_user
from services.supabase_service import supabase

logger = logging.getLogger(__name__)

router = APIRouter(tags=["profiles"])

from typing import Optional

class CompanyProfileUpdate(BaseModel):
    company_description: Optional[str] = None
    company_website: Optional[str] = None
    company_logo_url: Optional[str] = None
    company_banner_url: Optional[str] = None
    industry: Optional[str] = None
    culture: Optional[str] = None

@router.patch("/api/employer/profile")
def update_company_profile(payload: CompanyProfileUpdate, current_user = Depends(get_current_user)):
    """Updates the company details on the employer's profile."""
    try:
        # First verify the user is an employer
        res = supabase.table("profiles").select("role").eq("id", current_user.id).single().execute()
        if not res.data or res.data.get("role") != "employer":
            raise HTTPException(status_code=403, detail="Only employers can update company profiles.")

        update_data = payload.dict(exclude_unset=True)
        
        if not update_data:
            return {"message": "No data to update"}

        update_res = supabase.table("profiles").update(update_data).eq("id", current_user.id).execute()
        return {"message": "Company profile updated successfully", "profile": update_res.data[0] if update_res.data else {}}
    except Exception as e:
        logger.error(f"[/api/employer/profile] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/companies/{employer_id}")
def get_company_profile(employer_id: str):
    """Fetches public company profile details and their internships."""
    if employer_id == "undefined" or not employer_id:
        raise HTTPException(status_code=400, detail="Invalid employer ID")
    try:
        # Get employer profile
        res_profile = supabase.table("profiles").select("id, full_name, company_description, company_website, company_logo_url, company_banner_url, industry, culture, role").eq("id", employer_id).single().execute()
        
        if not res_profile.data or res_profile.data.get("role") != "employer":
            raise HTTPException(status_code=404, detail="Company not found.")
            
        # Get internships posted by this employer
        res_internships = supabase.table("internships").select("*").eq("poster_id", employer_id).execute()
        
        return {
            "company": res_profile.data,
            "internships": res_internships.data or []
        }
    except Exception as e:
        logger.error(f"[/api/companies/{employer_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
