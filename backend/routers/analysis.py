import asyncio
import json
import logging
import re
import uuid as uuid_lib

from core.db import supabase
from core.security import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from services.llm_service import generate_completion

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analysis"])


def _compute_ats_score(cv_text: str) -> int:
    """
    Heuristic ATS (Applicant Tracking System) friendliness score.
    Checks for common resume quality signals without calling an LLM.
    """
    score = 0
    text_lower = cv_text.lower()
    text_len = len(cv_text.strip())

    # Length: too short or too long is bad
    if 300 <= text_len <= 8000:
        score += 20
    elif text_len > 8000:
        score += 10  # verbose but has content

    # Contact info signals
    email_pattern = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    phone_pattern = re.compile(r'[\+]?[\d\s\-\(\)]{7,15}')
    if email_pattern.search(cv_text):
        score += 10
    if phone_pattern.search(cv_text):
        score += 5

    # Section headers (education, experience, skills, etc.)
    section_keywords = [
        "education", "experience", "skills", "projects", "certifications",
        "achievements", "objective", "summary", "work history", "internship",
        "volunteer", "awards", "languages", "references", "qualifications",
    ]
    sections_found = sum(1 for kw in section_keywords if kw in text_lower)
    score += min(sections_found * 5, 25)

    # Dates present (shows timeline)
    date_pattern = re.compile(r'(20\d{2}|19\d{2})')
    dates_found = len(set(date_pattern.findall(cv_text)))
    if dates_found >= 2:
        score += 10
    elif dates_found >= 1:
        score += 5

    # Action verbs (shows accomplishment-oriented writing)
    action_verbs = [
        "developed", "managed", "designed", "implemented", "created",
        "led", "built", "analyzed", "improved", "organized", "coordinated",
        "achieved", "delivered", "increased", "reduced", "maintained",
    ]
    verbs_found = sum(1 for v in action_verbs if v in text_lower)
    score += min(verbs_found * 3, 15)

    # Quantifiable achievements (numbers/percentages)
    metrics_pattern = re.compile(r'\d+[%+]|\$\d+|#\d+|\d+\s*(?:users|clients|projects|teams)')
    if metrics_pattern.search(cv_text):
        score += 10

    # Penalize: all caps sections (bad formatting)
    caps_ratio = sum(1 for c in cv_text if c.isupper()) / max(text_len, 1)
    if caps_ratio > 0.4:
        score -= 10

    return max(0, min(score, 100))


def _is_missing_column_error(error: Exception, column_name: str) -> bool:
    message = str(error).lower()
    return column_name.lower() in message and (
        "does not exist" in message
        or "could not find" in message
        or "column" in message
        or "schema cache" in message
    )


def _fetch_match_scores(user_id: str) -> list[int]:
    """Fetch match scores with legacy-column fallback for older schemas."""
    try:
        res = (
            supabase.table("match_results")
            .select("match_score")
            .eq("user_id", user_id)
            .execute()
        )
        rows = res.data or []
        return [int(row.get("match_score") or 0) for row in rows]
    except Exception as err:
        if not _is_missing_column_error(err, "match_score"):
            raise

        legacy = (
            supabase.table("match_results")
            .select("match_percentage")
            .eq("user_id", user_id)
            .execute()
        )
        rows = legacy.data or []
        return [int(row.get("match_percentage") or 0) for row in rows]


def parse_json_from_llm(content: str) -> dict:
    """Extracts JSON block from LLM output."""
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        content = content.split("```")[1].split("```")[0]

    stripped = content.strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        # Some providers add short prose before/after JSON; extract first object block.
        match = re.search(r"\{[\s\S]*\}", stripped)
        if not match:
            raise
        return json.loads(match.group(0))


@router.get("/api/analysis/skill-gap")
async def get_skill_gap_analysis(
    internship_id: str, current_user=Depends(get_current_user)
):
    try:
        uuid_lib.UUID(internship_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid internship ID format.")
    try:
        # Run blocking Supabase calls in worker threads to keep the event loop responsive.
        res_profile, res_job = await asyncio.gather(
            asyncio.to_thread(
                lambda: supabase.table("profiles")
                .select("cv_text")
                .eq("id", current_user.id)
                .single()
                .execute()
            ),
            asyncio.to_thread(
                lambda: supabase.table("internships")
                .select("role, requirements")
                .eq("id", internship_id)
                .single()
                .execute()
            ),
        )

        cv_text = res_profile.data.get("cv_text")
        if not cv_text:
            raise HTTPException(
                status_code=400, detail="No resume found. Please upload a resume first."
            )

        if not res_job.data:
            raise HTTPException(status_code=404, detail="Internship not found.")

        job_role = res_job.data.get("role")
        job_reqs = res_job.data.get("requirements")

        # Format requirements properly
        if isinstance(job_reqs, list):
            job_reqs_str = "\n".join(f"- {r}" for r in job_reqs)
        else:
            job_reqs_str = str(job_reqs) if job_reqs else "Not specified"

        prompt = f"""You are an expert AI Career Coach performing a skill gap analysis.

INTERNSHIP DETAILS:
- Role: {job_role}
- Requirements:
{job_reqs_str}

STUDENT'S RESUME:
\"\"\"
{cv_text[:5000]}
\"\"\"

TASK: Compare the student's demonstrated skills, experiences, and education against the internship requirements. Be realistic and specific.

Output ONLY valid JSON matching this schema exactly:
{{
    "match_percentage": <integer 0-100 based on how well the student fits>,
    "current_skills": ["skill the student HAS that is relevant", ...],
    "missing_skills": [
        {{
            "skill": "Specific skill or technology they lack",
            "priority": "High" | "Medium" | "Low",
            "estimated_learning_time": "e.g., 2 weeks, 1 month"
        }}
    ],
    "recommendations": [
        "Specific, actionable step the student should take",
        "Another concrete recommendation"
    ],
    "strengths_summary": "One sentence about the student's strongest qualification for this role"
}}

RULES:
- current_skills must only include skills ACTUALLY mentioned in the resume
- missing_skills must only include skills required by the job but NOT in the resume
- recommendations must be specific and actionable (e.g., 'Complete freeCodeCamp JavaScript course' not 'Learn more')
- match_percentage should reflect realistic fit, not be inflated
- Return ONLY the JSON object, no other text"""

        response_text = await generate_completion(
            prompt,
            system_message="You are a JSON-only output assistant. Return only valid JSON with no markdown formatting, no code blocks, no explanation.",
            json_mode=True,
        )
        analysis = parse_json_from_llm(response_text)
        return analysis

    except json.JSONDecodeError as e:
        logger.error(f"LLM JSON Error: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail="AI returned an invalid response format. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in skill gap analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to analyze skill gap.")


@router.get("/api/analysis/metrics")
async def get_dashboard_metrics(current_user=Depends(get_current_user)):
    try:
        # Execute independent DB calls concurrently for lower latency.
        res_profile, res_apps, match_scores = await asyncio.gather(
            asyncio.to_thread(
                lambda: supabase.table("profiles")
                .select("cv_text, course, level")
                .eq("id", current_user.id)
                .single()
                .execute()
            ),
            asyncio.to_thread(
                lambda: supabase.table("applied_internships")
                .select("id")
                .eq("user_id", current_user.id)
                .execute()
            ),
            asyncio.to_thread(_fetch_match_scores, current_user.id),
        )

        profile = res_profile.data or {}
        cv_text = profile.get("cv_text", "")
        has_cv = bool(cv_text)
        app_count = len(res_apps.data) if res_apps.data else 0

        avg_match = 0
        if match_scores:
            total = sum(match_scores)
            avg_match = int(total / len(match_scores))

        # Compute a real ATS score based on CV content quality
        ats_score = 0
        if has_cv and cv_text:
            ats_score = _compute_ats_score(cv_text)

        # Career score: weighted combination of real signals
        career_score = 0
        if has_cv:
            career_score += 20  # has a CV uploaded
        career_score += min(app_count * 5, 25)  # up to 25 for applications
        career_score += min(avg_match * 0.35, 35)  # up to 35 from match quality
        career_score += min(ats_score * 0.2, 20)  # up to 20 from ATS quality
        career_score = min(int(career_score), 100)

        # XP and Streak for engagement
        xp = (app_count * 50) + (200 if has_cv else 0) + (len(match_scores) * 10)
        streak = min(app_count, 7)

        return {
            "career_score": career_score,
            "ats_score": ats_score,
            "weekly_progress": min(app_count * 20, 100),
            "total_xp": xp,
            "streak_days": streak,
            "applications_sent": app_count,
            "avg_match_rate": avg_match,
        }
    except Exception as e:
        logger.error(f"Error computing metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to load metrics.")
