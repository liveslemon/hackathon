import logging
import re
from datetime import datetime, timezone

import pdfplumber
from core.db import supabase

logger = logging.getLogger(__name__)


def extract_text(file_path: str) -> str:
    """Extracts text from a PDF file with improved handling."""
    pages_text = []
    try:
        with pdfplumber.open(file_path) as pdf:
            if len(pdf.pages) > 20:
                logger.warning(
                    f"[extract_text] PDF has {len(pdf.pages)} pages, limiting to 20"
                )

            for i, page in enumerate(pdf.pages[:20]):
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    pages_text.append(page_text.strip())
                else:
                    # Try extracting from tables as fallback
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            for row in table:
                                cells = [str(c).strip() for c in row if c]
                                if cells:
                                    pages_text.append(" | ".join(cells))
    except Exception as e:
        logger.error(f"[extract_text] Failed: {e}")
        raise

    text = "\n\n".join(pages_text)

    if not text.strip():
        logger.warning(
            "[extract_text] No text extracted - PDF may be image-based (scanned)"
        )

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


def save_cv_text_and_url(
    user_id: str, cv_url: str, cv_text: str, cv_structured: dict = None
):
    """Updates profile with CV info and optional structured data."""
    try:
        update_data = {
            "cv_url": cv_url,
            "cv_text": cv_text,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if cv_structured:
            update_data["cv_structured"] = cv_structured

        supabase.table("profiles").update(update_data).eq("id", user_id).execute()
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
        if 0 < numeric_score <= 1:
            numeric_score *= 100
        final_score = max(0, min(100, int(numeric_score)))

        # Ensure skills arrays are properly formatted
        matching_skills = analysis.get("matching_skills", [])
        missing_skills = analysis.get("missing_skills", [])
        if not isinstance(matching_skills, list):
            matching_skills = []
        if not isinstance(missing_skills, list):
            missing_skills = []

        supabase.table("match_results").upsert(
            {
                "user_id": user_id,
                "internship_id": internship_id,
                "match_score": final_score,
                "matching_skills": matching_skills,
                "missing_skills": missing_skills,
                "reasoning": str(analysis.get("reasoning", ""))[:2000],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="user_id,internship_id",
        ).execute()
    except Exception as e:
        logger.error(
            f"[upsert_match_result] Error for user {user_id}, internship {internship_id}: {e}"
        )
        raise
