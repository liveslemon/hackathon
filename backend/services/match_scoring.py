"""
services/match_scoring.py

Canonical scoring module across the entire platform.
Implements:
- score_pair(student_features, job_features) -> deterministic match score, breakdown,
  matching/missing skills, inputs_hash, and instant layer-1 explanation.
- Deterministic and cheap: structured skills overlap + embedding cosine + keywords.
  NO LLM calls per pair.
- SCORE_VERSION = 2.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from services.matching_service import analyze_skills, extract_keywords

logger = logging.getLogger(__name__)

SCORE_VERSION: int = 2


def _normalize_string_list(items: Any) -> list[str]:
    """Normalize input list or comma/newline-separated string into unique, clean strings."""
    if not items:
        return []
    if isinstance(items, str):
        # Could be comma or newline separated
        items = re.split(r"[,\n]+", items)
    if isinstance(items, (list, tuple, set)):
        result = []
        seen = set()
        for x in items:
            if not x:
                continue
            s = str(x).strip()
            if s and s.lower() not in seen and len(s) < 100:
                seen.add(s.lower())
                result.append(s)
        return result
    return []


def compute_inputs_hash(student_features: dict, job_features: dict) -> str:
    """
    Computes a deterministic SHA-256 hash of the matching-relevant inputs.
    If neither student profile nor job posting changes, the hash remains identical,
    allowing re-scoring and AI reasoning to skip redundant work.
    """
    s_skills = sorted(s.lower() for s in _normalize_string_list(student_features.get("skills")))
    s_course = str(student_features.get("course") or "").strip().lower()
    s_text = str(student_features.get("text") or "").strip()[:2000]
    
    # Hash experience & projects summaries
    s_exp = str(student_features.get("experience") or "")[:1000]
    s_proj = str(student_features.get("projects") or "")[:1000]

    j_role = str(job_features.get("role") or "").strip().lower()
    j_company = str(job_features.get("company") or "").strip().lower()
    j_req_skills = sorted(s.lower() for s in _normalize_string_list(job_features.get("required_skills")))
    j_requirements = str(job_features.get("requirements") or "").strip()[:1000]
    j_desc = str(job_features.get("description") or "").strip()[:1000]
    j_cat = str(job_features.get("category") or "").strip().lower()

    payload = json.dumps(
        {
            "v": SCORE_VERSION,
            "student": {
                "skills": s_skills,
                "course": s_course,
                "text_hash": hashlib.md5(s_text.encode("utf-8")).hexdigest() if s_text else "",
                "exp": s_exp,
                "proj": s_proj,
            },
            "job": {
                "role": j_role,
                "company": j_company,
                "required_skills": j_req_skills,
                "requirements": j_requirements,
                "desc": j_desc,
                "category": j_cat,
            },
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]


def build_instant_explanation(
    score: int,
    matched_skills: list[str],
    missing_skills: list[str],
    total_required: int,
    breakdown: dict,
    job_role: str = "",
) -> str:
    """
    Layer 1 explanation: Deterministic, short, friendly, and specific (NO LLM).
    Names actual skills, required vs. matched counts, and the strongest signal.
    Guaranteed to agree with the score.
    """
    sentences = [f"{score}% match."]

    matched_count = len(matched_skills)
    if total_required > 0:
        names_str = ", ".join(matched_skills[:5])
        if matched_count > 0:
            sentences.append(
                f"You have {matched_count} of {total_required} required skills ({names_str})."
            )
        else:
            sentences.append(f"You have 0 of {total_required} required skills.")
    elif matched_count > 0:
        names_str = ", ".join(matched_skills[:5])
        sentences.append(f"You align on relevant skills ({names_str}).")

    if missing_skills:
        missing_str = ", ".join(missing_skills[:3])
        sentences.append(f"Missing: {missing_str}.")

    # Strongest signal
    skills_val = breakdown.get("skills", 0)
    sem_val = breakdown.get("semantic", 0)
    exp_val = breakdown.get("experience", 0)

    if score >= 75:
        if skills_val >= 70:
            sentences.append("Strong technical alignment with this role's core requirements.")
        elif exp_val >= 60:
            sentences.append("Your projects and experience closely match this role's description.")
        elif sem_val >= 60:
            sentences.append("Your background aligns exceptionally well with the responsibilities.")
        else:
            sentences.append("Great overall fit across your skills and coursework.")
    elif score >= 50:
        if skills_val >= 50:
            sentences.append("Good foundation in key skills with opportunities to grow in missing areas.")
        else:
            sentences.append("Relevant background that covers several key aspects of this position.")
    else:
        if missing_skills:
            sentences.append("Developing the missing skills will significantly improve your match for this role.")
        else:
            sentences.append("Some overlap with role prerequisites, with room for additional alignment.")

    return " ".join(sentences)


def score_pair(student_features: dict, job_features: dict) -> dict:
    """
    Computes deterministic match score between a student and an internship.

    Formula:
    - Structured skills & requirements overlap
    - Semantic embedding similarity (cosine)
    - Keyword overlap
    Blended: 55% structured + 35% semantic + 10% keyword (or 60% semantic + 40% keyword if no structured).
    Guaranteed bounded 0..100, deterministic, versioned.
    """
    student_skills_raw = _normalize_string_list(student_features.get("skills"))
    job_skills_raw = _normalize_string_list(job_features.get("required_skills"))

    # Also parse skills from structured CV/job if available
    cv_struct = student_features.get("structured") or {}
    if isinstance(cv_struct, dict) and "skills" in cv_struct:
        raw_s = cv_struct.get("skills")
        if isinstance(raw_s, dict):
            for group in ("technical", "tools", "soft"):
                student_skills_raw.extend(_normalize_string_list(raw_s.get(group)))
        elif isinstance(raw_s, list):
            student_skills_raw.extend(_normalize_string_list(raw_s))

    job_struct = job_features.get("structured") or {}
    if isinstance(job_struct, dict) and "required_skills" in job_struct:
        job_skills_raw.extend(_normalize_string_list(job_struct.get("required_skills")))

    # Deduplicate normalized sets
    student_skills_clean = _normalize_string_list(student_skills_raw)
    job_skills_clean = _normalize_string_list(job_skills_raw)

    student_keywords = set()
    for s in student_skills_clean:
        student_keywords.update(extract_keywords(s))
    
    cv_text = str(student_features.get("text") or "")
    if cv_text:
        student_keywords.update(extract_keywords(cv_text[:3000]))

    # Analyze matched vs missing skills
    matched_skills = []
    missing_skills = []

    for req in job_skills_clean:
        req_kw = extract_keywords(req)
        # Check direct or keyword containment
        if any(kw in student_keywords for kw in req_kw) or any(
            req.lower() in s.lower() or s.lower() in req.lower() for s in student_skills_clean
        ):
            matched_skills.append(req)
        else:
            missing_skills.append(req)

    total_required = len(job_skills_clean)
    if total_required > 0:
        skills_score = int(min(100, (len(matched_skills) / total_required) * 100))
    else:
        # If no explicit skills required, use keyword presence
        skills_score = 60 if student_skills_clean else 40

    # Experience & Projects fit
    experience_score = 40  # neutral entry-level default
    experiences = student_features.get("experience") or []
    if isinstance(experiences, list) and experiences:
        job_role = str(job_features.get("role") or "").lower()
        job_cat = str(job_features.get("category") or "").lower()
        exp_matches = 0
        for exp in experiences:
            if isinstance(exp, dict):
                exp_text = (
                    f"{exp.get('title', '')} {exp.get('role', '')} {exp.get('company', '')} {exp.get('description', '')}"
                ).lower()
                if job_role and any(word in exp_text for word in job_role.split() if len(word) > 3):
                    exp_matches += 1
                elif job_cat and job_cat in exp_text:
                    exp_matches += 1
        experience_score = min(100, 30 + len(experiences) * 15 + exp_matches * 20)

    # Education / Course Fit
    education_score = 50
    student_course = str(student_features.get("course") or "").lower()
    job_field = str(job_features.get("field") or job_features.get("category") or "").lower()
    if student_course and job_field:
        if job_field in student_course or any(
            w in student_course for w in job_field.split() if len(w) > 3
        ):
            education_score = 90
        else:
            education_score = 60

    # Structured Composite Score
    structured_score = int(
        skills_score * 0.50 + experience_score * 0.25 + education_score * 0.25
    )

    # Semantic embedding cosine similarity
    sim_val = job_features.get("cosine_similarity")
    if sim_val is not None:
        try:
            sim_float = float(sim_val)
            # Calibrated: cosine 0.30 = 0%, 0.50 = 50%, 0.70+ = 100%
            semantic_percent = max(0, min(100, int((sim_float - 0.3) * 250)))
        except (ValueError, TypeError):
            semantic_percent = 50
    else:
        semantic_percent = 50

    # Keyword overlap from full requirements
    reqs_raw = job_features.get("requirements")
    req_list = _normalize_string_list(reqs_raw)
    keyword_percent = 0
    if req_list and cv_text:
        _, _, keyword_ratio = analyze_skills(cv_text, req_list)
        keyword_percent = int(keyword_ratio * 100)
    elif matched_skills and total_required > 0:
        keyword_percent = int((len(matched_skills) / total_required) * 100)

    # Blended Final Score
    has_signals = bool(student_skills_clean or cv_text)
    if not has_signals:
        final_score = 0
    elif total_required > 0 or student_skills_clean:
        # Standard formula: 55% structured + 35% semantic + 10% keyword
        final_score = int(
            structured_score * 0.55 + semantic_percent * 0.35 + keyword_percent * 0.10
        )
    else:
        # Fallback when only text and semantic embedding exist
        final_score = int(semantic_percent * 0.60 + keyword_percent * 0.40)

    # Strictly bounded 0..100
    final_score = max(0, min(100, final_score))

    breakdown = {
        "skills": skills_score,
        "experience": experience_score,
        "education": education_score,
        "semantic": semantic_percent,
        "keyword": keyword_percent,
    }

    inputs_hash = compute_inputs_hash(student_features, job_features)

    instant_reasoning = build_instant_explanation(
        score=final_score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        total_required=total_required,
        breakdown=breakdown,
        job_role=str(job_features.get("role") or ""),
    )

    return {
        "match_score": final_score,
        "breakdown": breakdown,
        "matching_skills": matched_skills,
        "missing_skills": missing_skills,
        "score_version": SCORE_VERSION,
        "inputs_hash": inputs_hash,
        "instant_reasoning": instant_reasoning,
    }
