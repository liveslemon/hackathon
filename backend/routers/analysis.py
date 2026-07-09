import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from core.db import supabase
from core.security import get_current_user
from services.llm_service import generate_completion

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analysis"])

def parse_json_from_llm(content: str) -> dict:
    """Extracts JSON block from LLM output."""
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        content = content.split("```")[1].split("```")[0]
    return json.loads(content.strip())

@router.get("/api/analysis/skill-gap")
async def get_skill_gap_analysis(internship_id: str, current_user = Depends(get_current_user)):
    try:
        # Get student's CV text
        res_profile = supabase.table("profiles").select("cv_text").eq("id", current_user.id).single().execute()
        cv_text = res_profile.data.get("cv_text")
        if not cv_text:
            raise HTTPException(status_code=400, detail="No resume found. Please upload a resume first.")

        # Get internship details
        res_job = supabase.table("internships").select("role, requirements").eq("id", internship_id).single().execute()
        if not res_job.data:
            raise HTTPException(status_code=404, detail="Internship not found.")
        
        job_role = res_job.data.get("role")
        job_reqs = res_job.data.get("requirements")

        prompt = f"""
        You are an expert AI Career Coach. 
        Perform a skill gap analysis for a student applying for the following internship:
        Role: {job_role}
        Requirements: {job_reqs}
        
        Student's Resume Text:
        {cv_text[:3000]}  # limit text just in case
        
        Compare the student's skills against the internship requirements.
        Output MUST be ONLY valid JSON matching this schema exactly:
        {{
            "match_percentage": <integer 0-100>,
            "current_skills": ["skill1", "skill2"],
            "missing_skills": [
                {{
                    "skill": "Name of missing skill",
                    "priority": "High" | "Medium" | "Low",
                    "estimated_learning_time": "e.g., 2 weeks"
                }}
            ],
            "recommendations": ["Actionable step 1", "Actionable step 2"]
        }}
        Do not include markdown blocks, just the raw JSON.
        """
        
        response_text = await generate_completion(prompt, system_message="You output strictly valid JSON.")
        analysis = parse_json_from_llm(response_text)
        return analysis
        
    except json.JSONDecodeError as e:
        logger.error(f"LLM JSON Error: {e} - Response was: {response_text}")
        raise HTTPException(status_code=500, detail="AI returned invalid formatting.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in skill gap analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze skill gap.")

@router.get("/api/analysis/metrics")
async def get_dashboard_metrics(current_user = Depends(get_current_user)):
    try:
        # In a real app, these would be computed from multiple tables (match_results, applied_internships, cvs, etc.)
        # For the MVP, we compute a baseline from their profile and simulate the rest.
        res_profile = supabase.table("profiles").select("cv_text, course, level").eq("id", current_user.id).single().execute()
        
        profile = res_profile.data or {}
        has_cv = bool(profile.get("cv_text"))
        
        res_apps = supabase.table("applied_internships").select("id").eq("user_id", current_user.id).execute()
        app_count = len(res_apps.data) if res_apps.data else 0

        res_matches = supabase.table("match_results").select("match_percentage").eq("user_id", current_user.id).execute()
        avg_match = 0
        if res_matches.data:
             total = sum(m.get("match_percentage", 0) for m in res_matches.data)
             avg_match = int(total / len(res_matches.data))
             
        # Mocking XP and Streak for engagement
        xp = (app_count * 50) + (200 if has_cv else 0) + (len(res_matches.data or []) * 10)
        streak = min(app_count, 7) # simple mock
        
        return {
            "career_score": 40 + (10 if has_cv else 0) + (app_count * 2) + (avg_match // 5),
            "ats_score": 85 if has_cv else 0, # Placeholder until detailed CV grading is implemented
            "weekly_progress": min(app_count * 20, 100),
            "total_xp": xp,
            "streak_days": streak,
            "applications_sent": app_count,
            "avg_match_rate": avg_match
        }
    except Exception as e:
        logger.error(f"Error computing metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to load metrics.")
