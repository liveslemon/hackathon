import asyncio
import hashlib
import json
import logging
import re
import uuid as uuid_lib

from core.db import supabase
from core.rate_limit import rate_limit
from core.security import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from services.llm_service import generate_completion, LLMServiceError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analysis"])


def _compute_ats_score(cv_text: str) -> int:
    """
    Heuristic ATS (Applicant Tracking System) friendliness score.
    Checks for common resume quality signals without calling an LLM.
    """
    if not cv_text:
        return 0

    score = 0
    text_lower = cv_text.lower()
    text_len = len(cv_text.strip())

    # Length: too short or too long is bad
    if 300 <= text_len <= 8000:
        score += 20
    elif text_len > 8000:
        score += 10

    # Contact info signals
    email_pattern = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
    phone_pattern = re.compile(r"[\+]?[\d\s\-\(\)]{7,15}")
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
    date_pattern = re.compile(r"(20\d{2}|19\d{2})")
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
    metrics_pattern = re.compile(r"\d+[%+]|\$\d+|#\d+|\d+\s*(?:users|clients|projects|teams)")
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
            logger.warning(f"Error fetching match scores for {user_id}: {err}")
            return []

        try:
            legacy = (
                supabase.table("match_results")
                .select("match_percentage")
                .eq("user_id", user_id)
                .execute()
            )
            rows = legacy.data or []
            return [int(row.get("match_percentage") or 0) for row in rows]
        except Exception:
            return []


def parse_json_from_llm(content: str) -> dict:
    """Extracts JSON block from LLM output."""
    if not content or not isinstance(content, str):
        raise ValueError("Empty or invalid content from LLM")

    cleaned = content.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json")[1].split("```")[0]
    elif "```" in cleaned:
        cleaned = cleaned.split("```")[1].split("```")[0]

    stripped = cleaned.strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", stripped)
        if not match:
            raise
        return json.loads(match.group(0))


def _skill_gap_cache_get(user_id: str, internship_id: str, cv_hash: str):
    try:
        res = (
            supabase.table("skill_gap_analyses")
            .select("result, cv_hash")
            .eq("user_id", user_id)
            .eq("internship_id", internship_id)
            .maybe_single()
            .execute()
        )
        if res and res.data and res.data.get("cv_hash") == cv_hash:
            return res.data["result"]
    except Exception as e:
        logger.debug(f"[SkillGap] cache read skipped: {e}")
    return None


def _skill_gap_cache_put(user_id: str, internship_id: str, cv_hash: str, result: dict):
    try:
        supabase.table("skill_gap_analyses").upsert(
            {"user_id": user_id, "internship_id": internship_id, "cv_hash": cv_hash, "result": result},
            on_conflict="user_id,internship_id",
        ).execute()
    except Exception as e:
        logger.debug(f"[SkillGap] cache write skipped: {e}")


def _as_list(value) -> list:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str) and value.strip():
        return [part.strip() for part in re.split(r"[,\n;]", value) if part.strip()]
    return []


@router.get("/skill-gap")
@router.get("/api/analysis/skill-gap")
async def get_skill_gap_analysis(
    internship_id: str,
    current_user=Depends(rate_limit("skill_gap", 30, 3600)),
):
    try:
        uuid_lib.UUID(internship_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid internship ID format.")

    try:
        res_profile, res_job, res_match = await asyncio.gather(
            asyncio.to_thread(
                lambda: supabase.table("profiles")
                .select("cv_text, cv_structured, skills")
                .eq("id", current_user.id)
                .maybe_single()
                .execute()
            ),
            asyncio.to_thread(
                lambda: supabase.table("internships")
                .select("role, company, description, requirements, required_skills, job_structured")
                .eq("id", internship_id)
                .maybe_single()
                .execute()
            ),
            asyncio.to_thread(
                lambda: supabase.table("match_results")
                .select("match_score")
                .eq("user_id", current_user.id)
                .eq("internship_id", internship_id)
                .maybe_single()
                .execute()
            ),
        )

        profile = res_profile.data if res_profile else {}
        if not profile:
            profile = {}
        cv_text = profile.get("cv_text")
        if not cv_text:
            raise HTTPException(
                status_code=400, detail="No resume found. Please upload a resume first."
            )

        if not res_job or not res_job.data:
            raise HTTPException(status_code=404, detail="Internship not found.")
        job = res_job.data

        cv_hash = hashlib.sha256(cv_text.encode()).hexdigest()[:32]
        cached = await asyncio.to_thread(_skill_gap_cache_get, current_user.id, internship_id, cv_hash)
        if cached:
            return {**cached, "cached": True}

        job_structured = job.get("job_structured") if isinstance(job.get("job_structured"), dict) else {}
        required = _as_list(job.get("required_skills")) or _as_list(job_structured.get("required_skills"))
        nice_to_have = _as_list(job_structured.get("nice_to_have_skills"))
        requirements_text = "\n".join(f"- {r}" for r in _as_list(job.get("requirements"))) or "Not specified"

        cv_structured = profile.get("cv_structured") if isinstance(profile.get("cv_structured"), dict) else {}
        cv_skills = cv_structured.get("skills")
        if isinstance(cv_skills, dict):
            cv_skills = [*(cv_skills.get("technical") or []), *(cv_skills.get("tools") or []), *(cv_skills.get("soft") or [])]
        known_skills = sorted({*_as_list(cv_skills), *_as_list(profile.get("skills"))})

        prompt = f"""You are an expert career coach doing a skill gap analysis for a university student applying to an internship.

INTERNSHIP
- Role: {job.get("role")}
- Company: {job.get("company")}
- Description: {(job.get("description") or "Not provided")[:2000]}
- Requirements:
{requirements_text}
- Required skills (parsed): {", ".join(required) or "Not specified"}
- Nice to have: {", ".join(nice_to_have) or "None listed"}

STUDENT
- Skills listed on their profile/CV: {", ".join(known_skills) or "None listed"}
- Resume text:
\"\"\"
{cv_text[:5000]}
\"\"\"

Compare the student against the internship and output ONLY JSON with this exact shape:
{{
  "match_percentage": <integer 0-100, realistic fit>,
  "strengths_summary": "One sentence on the student's strongest qualification for this role",
  "current_skills": ["relevant skill the student demonstrably has"],
  "missing_skills": [
    {{
      "skill": "skill or technology required by the role that the student lacks",
      "priority": "High" | "Medium" | "Low",
      "why": "one short clause on why this role needs it",
      "estimated_learning_time": "e.g. 2 weeks",
      "resource": "one specific free resource, e.g. 'freeCodeCamp Responsive Web Design'"
    }}
  ],
  "recommendations": ["specific, actionable next step"]
}}

RULES
- current_skills: only skills evidenced in the resume or profile skills AND relevant to this role.
- missing_skills: only skills the role asks for that the student does not show. High = explicitly required, Medium = strongly implied, Low = nice to have.
- 3 to 5 recommendations, each concrete, tailored to this role.
- Do not invent experience the student does not have."""

        try:
            response_text = await generate_completion(
                prompt,
                system_message="You are a JSON-only output assistant. Return only valid JSON with no markdown formatting, no code blocks, no explanation.",
                json_mode=True,
            )
            analysis = parse_json_from_llm(response_text)
        except Exception as llm_err:
            logger.warning(f"[SkillGap] LLM call failed or returned unparseable output ({llm_err}), generating heuristic fallback")
            # Safe heuristic fallback
            req_set = set(r.lower() for r in required)
            known_set = set(k.lower() for k in known_skills)
            matched = [k for k in known_skills if any(r in k.lower() or k.lower() in r for r in req_set)]
            missing = [r for r in required if not any(k.lower() in r.lower() or r.lower() in k.lower() for k in known_skills)]

            analysis = {
                "match_percentage": int((len(matched) / max(1, len(required))) * 100) if required else 60,
                "strengths_summary": f"Demonstrated background in {', '.join(matched[:3])}" if matched else "Foundational academic background",
                "current_skills": matched[:8],
                "missing_skills": [
                    {
                        "skill": m,
                        "priority": "High" if idx < 2 else "Medium",
                        "why": "Key qualification for this role",
                        "estimated_learning_time": "2-4 weeks",
                        "resource": f"Search free tutorials for {m}",
                    }
                    for idx, m in enumerate(missing[:6])
                ],
                "recommendations": [
                    "Complete a practical project demonstrating the core required technologies.",
                    "Review official documentation for key missing skills.",
                    "Update your CV with quantifiable course projects.",
                ],
            }

        # Normalize required keys
        if "match_percentage" not in analysis or not isinstance(analysis["match_percentage"], (int, float)):
            analysis["match_percentage"] = 50
        stored = res_match.data.get("match_score") if res_match and res_match.data else None
        if stored is not None:
            canonical_score = int(stored)
        else:
            from services.match_scoring import score_pair
            scored = score_pair(
                {
                    "skills": known_skills,
                    "text": cv_text,
                    "structured": cv_structured,
                    "course": profile.get("course"),
                    "experience": profile.get("experience"),
                    "projects": profile.get("projects"),
                },
                {
                    "role": job.get("role"),
                    "company": job.get("company"),
                    "requirements": job.get("requirements"),
                    "required_skills": required,
                    "description": job.get("description"),
                    "category": job.get("category"),
                },
            )
            canonical_score = scored["match_score"]

        analysis["match_score"] = canonical_score
        analysis["match_percentage"] = canonical_score
        analysis["match_source"] = "platform"

        analysis["internship"] = {"role": job.get("role"), "company": job.get("company")}

        await asyncio.to_thread(_skill_gap_cache_put, current_user.id, internship_id, cv_hash, analysis)
        return {**analysis, "cached": False}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in skill gap analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to analyze skill gap.")


@router.get("/metrics")
@router.get("/analysis/metrics")
@router.get("/api/analysis/metrics")
async def get_dashboard_metrics(current_user=Depends(get_current_user)):
    try:
        res_profile, res_apps, match_scores = await asyncio.gather(
            asyncio.to_thread(
                lambda: supabase.table("profiles")
                .select("cv_text, course, level")
                .eq("id", current_user.id)
                .maybe_single()
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

        profile = res_profile.data if res_profile else {}
        if not profile:
            profile = {}
        cv_text = profile.get("cv_text", "") or ""
        has_cv = bool(cv_text.strip())
        app_count = len(res_apps.data) if res_apps and res_apps.data else 0

        avg_match = 0
        if match_scores:
            total = sum(match_scores)
            avg_match = int(total / len(match_scores))

        ats_score = 0
        if has_cv:
            ats_score = _compute_ats_score(cv_text)

        career_score = 0
        if has_cv:
            career_score += 20
        career_score += min(app_count * 5, 25)
        career_score += min(avg_match * 0.35, 35)
        career_score += min(ats_score * 0.2, 20)
        career_score = min(int(career_score), 100)

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
        logger.error(f"Error computing metrics: {e}", exc_info=True)
        return {
            "career_score": 0,
            "ats_score": 0,
            "weekly_progress": 0,
            "total_xp": 0,
            "streak_days": 0,
            "applications_sent": 0,
            "avg_match_rate": 0,
        }
