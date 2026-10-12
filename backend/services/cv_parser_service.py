"""
Structured CV Parsing Service.

Extracts structured data from raw CV text using LLM (once per upload).
The structured data is stored in the profile and reused for all match computations,
eliminating the need to re-analyze the CV on every comparison.
"""

import json
import logging
import re
from typing import Optional
from services.llm_service import generate_completion

logger = logging.getLogger(__name__)

# Schema for the structured CV output
CV_EXTRACTION_SCHEMA = """{
    "skills": {
        "technical": ["Python", "React", "SQL"],
        "soft": ["communication", "teamwork"],
        "tools": ["Git", "Docker", "Figma"]
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
        "relevant_coursework": ["Data Structures", "Machine Learning"]
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
        requirements_text = "\n".join(f"- {r}" for r in requirements if r)
    else:
        requirements_text = str(requirements or "")

    job_text = (
        f"Role: {role}\nCompany: {company}\nCategory: {category}\n"
        f"Description: {description}\nRequirements:\n{requirements_text}"
    )

    prompt = f"""You are an expert job posting analyzer. Extract structured requirements from this internship posting.

JOB POSTING:
\"\"\"
{job_text[:4000]}
\"\"\"

Return ONLY valid JSON:
{{
    "required_skills": ["skill1", "skill2"],
    "nice_to_have_skills": ["skill1"],
    "domain": "e.g., web development, data science, marketing",
    "experience_level": "beginner" | "intermediate" | "advanced" | "any",
    "key_responsibilities": ["responsibility1"],
    "relevant_courses": ["Data Structures", "Marketing 101"]
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
    """
    cv_struct = cv_struct or {}
    job_struct = job_struct or {}

    # 1. Skills Match (50% weight)
    cv_skills = set()
    raw_skills = cv_struct.get("skills") or {}
    if isinstance(raw_skills, dict):
        for category in ("technical", "soft", "tools"):
            for s in _ensure_list(raw_skills.get(category)):
                if s.strip():
                    cv_skills.add(s.lower().strip())
    elif isinstance(raw_skills, list):
        for s in raw_skills:
            if isinstance(s, str) and s.strip():
                cv_skills.add(s.lower().strip())

    required = set(s.lower().strip() for s in _ensure_list(job_struct.get("required_skills")) if s.strip())
    nice_to_have = set(s.lower().strip() for s in _ensure_list(job_struct.get("nice_to_have_skills")) if s.strip())

    # Fuzzy matching: check if skill appears as substring in any cv skill
    matched_required = set()
    for req in required:
        if req in cv_skills or any(req in cv_s or cv_s in req for cv_s in cv_skills):
            matched_required.add(req)

    matched_nice = set()
    for nice in nice_to_have:
        if nice in cv_skills or any(nice in cv_s or cv_s in nice for cv_s in cv_skills):
            matched_nice.add(nice)

    if required:
        required_ratio = len(matched_required) / len(required)
    else:
        required_ratio = 0.5  # Neutral if no requirements specified

    nice_ratio = (len(matched_nice) / len(nice_to_have)) if nice_to_have else 0.0
    skills_score = int(max(0, min(100, required_ratio * 80 + nice_ratio * 20)))

    # 2. Experience Relevance (25% weight)
    job_domain = str(job_struct.get("domain", "")).lower()
    experiences = [e for e in _ensure_list(cv_struct.get("experience")) if isinstance(e, dict)]
    if experiences:
        domain_matches = sum(
            1 for exp in experiences
            if job_domain and (
                job_domain in str(exp.get("domain", "")).lower()
                or any(word in str(exp.get("domain", "")).lower() for word in job_domain.split() if len(word) > 2)
            )
        )
        base_experience = min(len(experiences) * 15, 40)
        domain_bonus = min(domain_matches * 20, 60)
        experience_score = min(base_experience + domain_bonus, 100)
    else:
        experience_score = 30  # entry-level neutral for internships

    # 3. Education Fit (15% weight)
    education = cv_struct.get("education") or {}
    if not isinstance(education, dict):
        education = {}
    relevant_coursework = set(str(c).lower() for c in _ensure_list(education.get("relevant_coursework")))
    job_courses = set(str(c).lower() for c in _ensure_list(job_struct.get("relevant_courses")))
    education_score = 40

    if job_courses and relevant_coursework:
        course_overlap = len(relevant_coursework.intersection(job_courses))
        fuzzy_overlap = sum(
            1 for jc in job_courses
            if any(jc in rc or rc in jc for rc in relevant_coursework)
        )
        education_score = min(40 + (course_overlap + fuzzy_overlap) * 15, 100)

    # 4. Projects Relevance (10% weight)
    projects = [p for p in _ensure_list(cv_struct.get("projects")) if isinstance(p, dict)]
    projects_score = 0

    if projects:
        project_techs = set()
        for proj in projects:
            for t in _ensure_list(proj.get("technologies")):
                project_techs.add(str(t).lower())

        target_skills = required | nice_to_have
        project_skill_overlap = project_techs.intersection(target_skills)
        projects_score = min(len(projects) * 15 + len(project_skill_overlap) * 10, 100)

    # 5. Weighted Final Score
    final_score = int(
        skills_score * 0.50 +
        experience_score * 0.25 +
        education_score * 0.15 +
        projects_score * 0.10
    )
    final_score = max(0, min(100, final_score))

    all_matched = list(matched_required | matched_nice)[:10]
    all_missing = list(required - matched_required)[:8]

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
    if not text or not isinstance(text, str):
        return None

    cleaned = text.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json")[1].split("```")[0]
    elif "```" in cleaned:
        cleaned = cleaned.split("```")[1].split("```")[0]

    cleaned = cleaned.strip()
    try:
        res = json.loads(cleaned)
        if isinstance(res, dict):
            return res
    except json.JSONDecodeError:
        pass

    # Fallback regex for first JSON object
    match = re.search(r'\{[\s\S]*\}', cleaned)
    if match:
        try:
            res = json.loads(match.group(0))
            if isinstance(res, dict):
                return res
        except json.JSONDecodeError:
            pass

    return None


def _normalize_structure(raw: dict) -> dict:
    """Ensure the parsed CV structure has all required fields with correct types."""
    if not isinstance(raw, dict):
        return _empty_structure()

    skills = raw.get("skills", {})
    if isinstance(skills, list):
        skills = {"technical": skills, "soft": [], "tools": []}
    elif not isinstance(skills, dict):
        skills = {"technical": [], "soft": [], "tools": []}

    exp_list = []
    exp_raw = raw.get("experience")
    exp_items = exp_raw if isinstance(exp_raw, list) else ([exp_raw] if isinstance(exp_raw, dict) else [])
    for exp in exp_items:
        if isinstance(exp, dict):
            exp_list.append({
                "title": str(exp.get("title") or exp.get("role") or ""),
                "organization": str(exp.get("organization") or exp.get("company") or ""),
                "duration": str(exp.get("duration") or ""),
                "domain": str(exp.get("domain") or ""),
                "highlights": _ensure_list(exp.get("highlights")),
            })

    edu_raw = raw.get("education", {})
    if isinstance(edu_raw, list) and edu_raw:
        edu_raw = edu_raw[0] if isinstance(edu_raw[0], dict) else {}
    elif not isinstance(edu_raw, dict):
        edu_raw = {}

    education = {
        "degree": str(edu_raw.get("degree") or edu_raw.get("course") or ""),
        "institution": str(edu_raw.get("institution") or edu_raw.get("university") or ""),
        "level": str(edu_raw.get("level") or ""),
        "relevant_coursework": _ensure_list(edu_raw.get("relevant_coursework")),
    }

    proj_list = []
    proj_raw = raw.get("projects")
    proj_items = proj_raw if isinstance(proj_raw, list) else ([proj_raw] if isinstance(proj_raw, dict) else [])
    for proj in proj_items:
        if isinstance(proj, dict):
            proj_list.append({
                "name": str(proj.get("name") or proj.get("title") or ""),
                "technologies": _ensure_list(proj.get("technologies")),
                "description": str(proj.get("description") or ""),
            })

    cert_raw = raw.get("certifications", [])
    cert_items = cert_raw if isinstance(cert_raw, list) else ([cert_raw] if cert_raw else [])
    certs = []
    for c in cert_items:
        if isinstance(c, dict):
            name = str(c.get("name") or "")
            issuer = str(c.get("issuer") or "")
            certs.append(f"{name} - {issuer}".strip(" -"))
        elif isinstance(c, str) and c.strip():
            certs.append(c.strip())

    return {
        "skills": {
            "technical": _ensure_list(skills.get("technical")),
            "soft": _ensure_list(skills.get("soft")),
            "tools": _ensure_list(skills.get("tools")),
        },
        "experience": exp_list,
        "education": education,
        "projects": proj_list,
        "certifications": certs,
        "languages": _ensure_list(raw.get("languages")),
        "interests": _ensure_list(raw.get("interests")),
        "summary": str(raw.get("summary") or "")[:500].strip(),
    }


def _normalize_job_structure(raw: dict) -> dict:
    """Ensure the parsed job structure has all required fields."""
    if not isinstance(raw, dict):
        return _empty_job_structure({})

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
        req_list = [str(r) for r in reqs if r]
    else:
        req_list = [r.strip() for r in str(reqs or "").replace(",", "\n").split("\n") if r.strip()]
    return {
        "required_skills": req_list[:15],
        "nice_to_have_skills": [],
        "domain": str(job.get("category", "")),
        "experience_level": "any",
        "key_responsibilities": [],
        "relevant_courses": [],
    }


def _ensure_list(val) -> list:
    """Coerce value to a list of strings."""
    if val is None:
        return []
    if isinstance(val, list):
        result = []
        for item in val:
            if isinstance(item, str) and item.strip():
                result.append(item.strip())
            elif item is not None and not isinstance(item, (dict, list)):
                result.append(str(item).strip())
        return result
    if isinstance(val, str) and val.strip():
        return [val.strip()]
    return []
