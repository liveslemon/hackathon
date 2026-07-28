"""
Structured CV Parsing Service.

Extracts structured data from raw CV text using LLM (once per upload).
The structured data is stored in the profile and reused for all match computations,
eliminating the need to re-analyze the CV on every comparison.
"""

import json
import logging
from typing import Optional
from services.llm_service import generate_completion

logger = logging.getLogger(__name__)

# Schema for the structured CV output
CV_EXTRACTION_SCHEMA = """{
    "skills": {
        "technical": ["Python", "React", "SQL", ...],
        "soft": ["communication", "teamwork", ...],
        "tools": ["Git", "Docker", "Figma", ...]
    },
    "experience": [
        {
            "title": "Job title or role",
            "organization": "Company or university",
            "duration": "e.g., 3 months, 1 year",
            "domain": "e.g., web development, data analysis, marketing",
            "highlights": ["Key achievement or responsibility"]
        }
    ],
    "education": {
        "degree": "e.g., BSc Computer Science",
        "institution": "University name",
        "level": "e.g., 300-level, Final year, Graduate",
        "relevant_coursework": ["Data Structures", "Machine Learning", ...]
    },
    "projects": [
        {
            "name": "Project name",
            "technologies": ["React", "Node.js"],
            "description": "One-line summary"
        }
    ],
    "certifications": ["Certification name - Issuer"],
    "languages": ["English", "French"],
    "interests": ["AI/ML", "Web Development", "Finance"],
    "summary": "2-3 sentence professional summary of this candidate"
}"""


async def parse_cv_structured(cv_text: str) -> dict:
    """
    Parses raw CV text into structured fields using LLM.
    Called ONCE per CV upload. Result is stored in the profile.

    Returns a dict matching CV_EXTRACTION_SCHEMA, or a minimal fallback on failure.
    """
    if not cv_text or len(cv_text.strip()) < 50:
        return _empty_structure()

    prompt = f"""You are an expert CV/Resume parser. Extract structured information from the following resume text.

RESUME TEXT:
\"\"\"
{cv_text[:7000]}
\"\"\"

INSTRUCTIONS:
1. Extract ALL skills mentioned (technical, soft, tools/platforms) - be thorough
2. For experience, include internships, part-time jobs, volunteer work, and any relevant roles
3. For education, extract the degree, institution, and any relevant coursework mentioned
4. Include personal/academic projects with their tech stacks
5. Only include information that is ACTUALLY in the resume - do NOT fabricate
6. If a section has no data in the resume, use an empty array []
7. For the summary, write a brief factual description of the candidate based on what you see

Return ONLY valid JSON matching this exact schema:
{CV_EXTRACTION_SCHEMA}"""

    try:
        response = await generate_completion(
            prompt,
            system_message="You are a precise JSON extraction assistant. Output only valid JSON with no extra text.",
            json_mode=True,
        )

        parsed = _parse_json_safe(response)
        if not parsed:
            logger.warning("[CV Parse] LLM returned unparseable response, using fallback")
            return _empty_structure()

        # Validate and normalize the structure
        return _normalize_structure(parsed)

    except Exception as e:
        logger.error(f"[CV Parse] Structured extraction failed: {e}")
        return _empty_structure()


async def parse_job_structured(job: dict) -> dict:
    """
    Parses a job posting into structured fields.
    Called ONCE per internship creation. Result is stored with the internship.
    """
    role = job.get("role") or job.get("title") or ""
    description = job.get("description", "")
    requirements = job.get("requirements", "")
    company = job.get("company", "")
    category = job.get("category", "")

    if isinstance(requirements, list):
        requirements_text = "\n".join(f"- {r}" for r in requirements)
    else:
        requirements_text = str(requirements)

    job_text = f"Role: {role}\nCompany: {company}\nCategory: {category}\nDescription: {description}\nRequirements:\n{requirements_text}"

    prompt = f"""You are an expert job posting analyzer. Extract structured requirements from this internship posting.

JOB POSTING:
\"\"\"
{job_text[:4000]}
\"\"\"

Return ONLY valid JSON:
{{
    "required_skills": ["skill1", "skill2", ...],
    "nice_to_have_skills": ["skill1", ...],
    "domain": "e.g., web development, data science, marketing",
    "experience_level": "beginner" | "intermediate" | "advanced" | "any",
    "key_responsibilities": ["responsibility1", ...],
    "relevant_courses": ["Data Structures", "Marketing 101", ...]
}}

Only include what is explicitly stated or clearly implied. Do NOT add generic skills."""

    try:
        response = await generate_completion(
            prompt,
            system_message="You are a precise JSON extraction assistant. Output only valid JSON.",
            json_mode=True,
        )
        parsed = _parse_json_safe(response)
        if not parsed:
            return _empty_job_structure(job)
        return _normalize_job_structure(parsed)
    except Exception as e:
        logger.error(f"[Job Parse] Structured extraction failed: {e}")
        return _empty_job_structure(job)


def compute_structured_match(cv_struct: dict, job_struct: dict) -> dict:
    """
    Computes a multi-dimensional match score using pre-parsed structured data.
    This is the FAST path — no AI calls, pure Python computation.

    Returns:
        {
            "score": int (0-100),
            "breakdown": {"skills": int, "experience": int, "education": int, "projects": int},
            "matched_skills": [...],
            "missing_skills": [...],
        }
    """
    # 1. Skills Match (50% weight)
    cv_skills = set()
    for category in ("technical", "soft", "tools"):
        cv_skills.update(s.lower().strip() for s in cv_struct.get("skills", {}).get(category, []))

    required = set(s.lower().strip() for s in job_struct.get("required_skills", []))
    nice_to_have = set(s.lower().strip() for s in job_struct.get("nice_to_have_skills", []))

    # Fuzzy matching: check if skill appears as substring in any cv skill
    matched_required = set()
    for req in required:
        if req in cv_skills:
            matched_required.add(req)
        elif any(req in cv_s or cv_s in req for cv_s in cv_skills):
            matched_required.add(req)

    matched_nice = set()
    for nice in nice_to_have:
        if nice in cv_skills:
            matched_nice.add(nice)
        elif any(nice in cv_s or cv_s in nice for cv_s in cv_skills):
            matched_nice.add(nice)

    if required:
        required_ratio = len(matched_required) / len(required)
    else:
        required_ratio = 0.5  # Neutral if no requirements specified

    nice_ratio = len(matched_nice) / len(nice_to_have) if nice_to_have else 0.0
    skills_score = int((required_ratio * 80 + nice_ratio * 20))

    # 2. Experience Relevance (25% weight)
    job_domain = job_struct.get("domain", "").lower()
    experiences = cv_struct.get("experience", [])
    experience_score = 0

    if experiences:
        domain_matches = sum(
            1 for exp in experiences
            if job_domain and (
                job_domain in exp.get("domain", "").lower()
                or any(word in exp.get("domain", "").lower() for word in job_domain.split())
            )
        )
        # Having any experience is worth something
        base_experience = min(len(experiences) * 15, 40)
        domain_bonus = min(domain_matches * 20, 60)
        experience_score = min(base_experience + domain_bonus, 100)
    else:
        # No experience listed — neutral for internships (they're entry-level)
        experience_score = 30

    # 3. Education Fit (15% weight)
    education = cv_struct.get("education", {})
    relevant_coursework = set(c.lower() for c in education.get("relevant_coursework", []))
    job_courses = set(c.lower() for c in job_struct.get("relevant_courses", []))
    education_score = 40  # Base score for having education

    if job_courses and relevant_coursework:
        course_overlap = len(relevant_coursework.intersection(job_courses))
        fuzzy_overlap = sum(
            1 for jc in job_courses
            if any(jc in rc or rc in jc for rc in relevant_coursework)
        )
        education_score = min(40 + (course_overlap + fuzzy_overlap) * 15, 100)

    # 4. Projects Relevance (10% weight)
    projects = cv_struct.get("projects", [])
    projects_score = 0

    if projects:
        project_techs = set()
        for proj in projects:
            project_techs.update(t.lower() for t in proj.get("technologies", []))

        project_skill_overlap = project_techs.intersection(required | nice_to_have)
        projects_score = min(len(projects) * 15 + len(project_skill_overlap) * 10, 100)

    # 5. Weighted Final Score
    final_score = int(
        skills_score * 0.50 +
        experience_score * 0.25 +
        education_score * 0.15 +
        projects_score * 0.10
    )
    final_score = max(0, min(100, final_score))

    # Compile matched/missing for display
    all_matched = list(matched_required | matched_nice)[:10]
    all_missing = list((required - matched_required))[:8]

    return {
        "score": final_score,
        "breakdown": {
            "skills": skills_score,
            "experience": experience_score,
            "education": education_score,
            "projects": projects_score,
        },
        "matched_skills": [s.title() for s in all_matched],
        "missing_skills": [s.title() for s in all_missing],
    }


# --- Internal Helpers ---

def _parse_json_safe(text: str) -> Optional[dict]:
    """Attempt to parse JSON from LLM output, handling markdown blocks."""
    if not text:
        return None
    # Strip markdown code blocks
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        import re
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
        return None


def _normalize_structure(raw: dict) -> dict:
    """Ensure the parsed CV structure has all required fields with correct types."""
    skills = raw.get("skills", {})
    if isinstance(skills, list):
        # LLM returned flat list instead of categorized
        skills = {"technical": skills, "soft": [], "tools": []}
    elif not isinstance(skills, dict):
        skills = {"technical": [], "soft": [], "tools": []}

    return {
        "skills": {
            "technical": _ensure_list(skills.get("technical")),
            "soft": _ensure_list(skills.get("soft")),
            "tools": _ensure_list(skills.get("tools")),
        },
        "experience": [
            {
                "title": exp.get("title", ""),
                "organization": exp.get("organization", ""),
                "duration": exp.get("duration", ""),
                "domain": exp.get("domain", ""),
                "highlights": _ensure_list(exp.get("highlights")),
            }
            for exp in _ensure_list(raw.get("experience"))
            if isinstance(exp, dict)
        ],
        "education": {
            "degree": raw.get("education", {}).get("degree", "") if isinstance(raw.get("education"), dict) else "",
            "institution": raw.get("education", {}).get("institution", "") if isinstance(raw.get("education"), dict) else "",
            "level": raw.get("education", {}).get("level", "") if isinstance(raw.get("education"), dict) else "",
            "relevant_coursework": _ensure_list(
                raw.get("education", {}).get("relevant_coursework") if isinstance(raw.get("education"), dict) else []
            ),
        },
        "projects": [
            {
                "name": proj.get("name", ""),
                "technologies": _ensure_list(proj.get("technologies")),
                "description": proj.get("description", ""),
            }
            for proj in _ensure_list(raw.get("projects"))
            if isinstance(proj, dict)
        ],
        "certifications": _ensure_list(raw.get("certifications")),
        "languages": _ensure_list(raw.get("languages")),
        "interests": _ensure_list(raw.get("interests")),
        "summary": str(raw.get("summary", ""))[:500],
    }


def _normalize_job_structure(raw: dict) -> dict:
    """Ensure the parsed job structure has all required fields."""
    return {
        "required_skills": _ensure_list(raw.get("required_skills")),
        "nice_to_have_skills": _ensure_list(raw.get("nice_to_have_skills")),
        "domain": str(raw.get("domain", "")),
        "experience_level": str(raw.get("experience_level", "any")),
        "key_responsibilities": _ensure_list(raw.get("key_responsibilities")),
        "relevant_courses": _ensure_list(raw.get("relevant_courses")),
    }


def _empty_structure() -> dict:
    """Returns a minimal empty CV structure."""
    return {
        "skills": {"technical": [], "soft": [], "tools": []},
        "experience": [],
        "education": {"degree": "", "institution": "", "level": "", "relevant_coursework": []},
        "projects": [],
        "certifications": [],
        "languages": [],
        "interests": [],
        "summary": "",
    }


def _empty_job_structure(job: dict) -> dict:
    """Returns a minimal job structure with whatever we can extract naively."""
    reqs = job.get("requirements", "")
    if isinstance(reqs, list):
        req_list = reqs
    else:
        req_list = [r.strip() for r in str(reqs).replace(",", "\n").split("\n") if r.strip()]
    return {
        "required_skills": req_list[:15],
        "nice_to_have_skills": [],
        "domain": job.get("category", ""),
        "experience_level": "any",
        "key_responsibilities": [],
        "relevant_courses": [],
    }


def _ensure_list(val) -> list:
    """Coerce value to a list of strings."""
    if val is None:
        return []
    if isinstance(val, list):
        return [str(item) for item in val if item]
    if isinstance(val, str):
        return [val] if val.strip() else []
    return []
