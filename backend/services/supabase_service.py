import logging
import pdfplumber
from datetime import datetime, timezone
from core.db import supabase

logger = logging.getLogger(__name__)

def extract_text(file_path: str) -> str:
    """Extracts text from a PDF file."""
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error(f"[extract_text] Failed: {e}")
        raise
    return text

def get_user_profile(user_id: str):
    """Fetch user profile from Supabase."""
    try:
        res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if not res.data:
            raise ValueError("Profile not found.")
        return res.data[0]
    except Exception as e:
        logger.error(f"[get_user_profile] Error: {e}")
        raise

def save_cv_text_and_url(user_id: str, cv_url: str, cv_text: str):
    """Updates profile with CV info."""
    try:
        supabase.table("profiles").update({
            "cv_url": cv_url,
            "cv_text": cv_text,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", user_id).execute()
    except Exception as e:
        logger.error(f"[save_cv_text_and_url] Error: {e}")
        raise

def fetch_internships():
    """Fetch all internship records."""
    try:
        res = supabase.table("internships").select("*").execute()
        return res.data or []
    except Exception as e:
        logger.error(f"[fetch_internships] Error: {e}")
        return []

def upsert_match_result(user_id: str, internship_id: str, analysis: dict):
    """Save or update AI match score for a specific student-internship pair."""
    try:
        raw_score = analysis.get("match_score", 0)
        try:
            numeric_score = float(raw_score)
        except (ValueError, TypeError):
            numeric_score = 0.0
        
        # Normalize: if AI returns 0.0-1.0, scale to 0-100
        if 0 <= numeric_score <= 1:
            numeric_score *= 100
        final_score = int(numeric_score)

        supabase.table("match_results").upsert({
            "user_id": user_id,
            "internship_id": internship_id,
            "match_score": final_score,
            "matching_skills": analysis.get("matching_skills", []),
            "missing_skills": analysis.get("missing_skills", []),
            "reasoning": analysis.get("reasoning", "No reasoning provided."),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, on_conflict="user_id,internship_id").execute()
    except Exception as e:
        logger.error(f"[upsert_match_result] Error for user {user_id}: {e}")
        raise
