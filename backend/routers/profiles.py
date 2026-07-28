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
