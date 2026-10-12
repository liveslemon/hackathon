import asyncio
"""
Vector-Based Matching Service.

Instead of comparing a CV against EVERY internship (O(n) LLM calls),
this service:
1. Pre-computes and stores embeddings for CVs and jobs (one-time)
2. Uses vector similarity to find top-K candidates (zero LLM calls)
3. Runs structured matching only on top-K (fast, no AI)
4. Calls LLM for reasoning only on top ~5 results (minimal cost)

This reduces matching from O(n) LLM calls to O(1) embedding + O(k) LLM calls.
"""

import json
import logging
from typing import Optional

from core.db import supabase
from services.embedding_service import get_embedding
from services.cv_parser_service import compute_structured_match, parse_job_structured
from services.matching_service import compute_cosine_similarity, analyze_skills
from services.llm_service import generate_completion

logger = logging.getLogger(__name__)

TOP_K = 15
LLM_REASONING_TOP_N = 5


def _ensure_vector(v) -> Optional[list[float]]:
    """Helper to ensure a vector is a list of floats."""
    if v is None:
        return None
    if isinstance(v, str):
        try:
            v = json.loads(v)
        except Exception:
            return None
    if isinstance(v, list) and len(v) == 1024:
        return [float(x) for x in v]
    return None


async def store_cv_embedding(user_id: str, cv_text: str) -> Optional[list[float]]:
    """Compute and store the CV embedding in profiles.cv_embedding. Called once at upload."""
    if not cv_text or len(cv_text.strip()) < 50:
        return None

    try:
        embedding = await get_embedding(cv_text[:6000])
        if not embedding:
            return None

        await asyncio.to_thread(
            lambda: supabase.table("profiles").update({"cv_embedding": embedding}).eq("id", user_id).execute()
        )

        logger.info(f"[VectorMatch] Stored CV embedding for user {user_id}")
        return embedding
    except Exception as e:
        logger.error(f"[VectorMatch] Failed to store CV embedding for {user_id}: {e}")
        return None


async def store_job_embedding(internship_id: str, job: dict) -> Optional[list[float]]:
    """Compute and store the job embedding + structured data. Called once at job creation."""
    job_title = job.get("title") or job.get("role") or ""
    job_desc = job.get("description", "")
    reqs = job.get("requirements", "")
    company = job.get("company", "")

    if isinstance(reqs, list):
        reqs_text = ", ".join(r for r in reqs if r)
    else:
        reqs_text = str(reqs or "")

    full_job_text = f"Role: {job_title}. Company: {company}. Description: {job_desc}. Requirements: {reqs_text}"

    try:
        embedding = await get_embedding(full_job_text[:6000])
        if not embedding:
            return None

        job_structured = await parse_job_structured(job)

        await asyncio.to_thread(
            lambda: supabase.table("internships").update({
                "job_embedding": embedding,
                "job_structured": job_structured,
            }).eq("id", internship_id).execute()
        )

        logger.info(f"[VectorMatch] Stored embedding + structure for internship {internship_id}")
        return embedding
    except Exception as e:
        logger.error(f"[VectorMatch] Failed to store job embedding for {internship_id}: {e}")
        return None


async def find_top_matches_for_user(
    user_id: str,
    cv_text: str,
    cv_structured: dict = None,
    top_k: int = TOP_K,
) -> list[dict]:
    """
    Find the top-K matching internships for a user using vector similarity.
    """
    cv_embedding = await _get_or_compute_cv_embedding(user_id, cv_text)
    if not cv_embedding:
        logger.warning(f"[VectorMatch] No CV embedding for user {user_id}, falling back")
        return []

    cv_embedding_list = _ensure_vector(cv_embedding)
    if not cv_embedding_list:
        logger.warning(f"[VectorMatch] Invalid CV embedding for user {user_id}")
        return []

    scored = []

    # Step 2: Fetch top-K active internships using pgvector (native DB similarity search)
    try:
        try:
            res = await asyncio.to_thread(
                lambda: supabase.rpc(
                    "match_internships",
                    {"query_embedding": cv_embedding_list, "match_threshold": 0.25, "match_count": top_k * 2},
                ).execute()
            )
            top_jobs_data = res.data or []
            for job in top_jobs_data:
                sim = float(job.get("similarity", 0.5))
                scored.append((sim, job))
        except Exception as rpc_e:
            logger.info(f"[VectorMatch] pgvector RPC unavailable or failed, using local fallback: {rpc_e}")
            res = await asyncio.to_thread(
                lambda: supabase.table("internships")
                .select("id, role, company, description, requirements, category, status, job_embedding, job_structured")
                .eq("status", "active")
                .execute()
            )
            internships = res.data or []

            for job in internships:
                if job.get("status") and job.get("status") != "active":
                    continue
                job_emb = _ensure_vector(job.get("job_embedding"))
                if not job_emb:
                    continue

                sim = compute_cosine_similarity(cv_embedding_list, job_emb)
                scored.append((sim, job))

            scored.sort(key=lambda x: x[0], reverse=True)

    except Exception as e:
        logger.error(f"[VectorMatch] Failed to search internships: {e}")
        return []

    top_jobs = scored[:top_k]

    results = []
    for i, (sim_score, job) in enumerate(top_jobs):
        semantic_percent = max(0, min(100, int((sim_score - 0.3) * 250)))

        job_id = job["id"]
        job_title = job.get("title") or job.get("role") or ""
        company = job.get("company", "")
        reqs = job.get("requirements", "")

        if isinstance(reqs, list):
            req_list = [str(r) for r in reqs if r]
            reqs_text = ", ".join(req_list)
        else:
            reqs_text = str(reqs or "")
            req_list = [r.strip() for r in reqs_text.replace(",", "\n").split("\n") if r.strip()]

        structured_score = 0
        structured_matched = []
        structured_missing = []
        breakdown = {}

        if cv_structured:
            job_structured = job.get("job_structured")
            if not job_structured:
                job_structured = _quick_job_structure(job)

            if job_structured:
                struct_result = compute_structured_match(cv_structured, job_structured)
                structured_score = struct_result["score"]
                structured_matched = struct_result["matched_skills"]
                structured_missing = struct_result["missing_skills"]
                breakdown = struct_result["breakdown"]

        if cv_structured and structured_score > 0:
            final_score = int(structured_score * 0.55 + semantic_percent * 0.35 + _keyword_score(cv_text, req_list) * 0.10)
        else:
            keyword_pct = _keyword_score(cv_text, req_list)
            final_score = int(semantic_percent * 0.60 + keyword_pct * 0.40)

        final_score = max(0, min(100, final_score))

        reasoning = _build_quick_reasoning(final_score, structured_score, semantic_percent, breakdown)

        if i < LLM_REASONING_TOP_N and final_score >= 40:
            try:
                reasoning = await _generate_reasoning(
                    final_score, job_title, company, reqs_text,
                    structured_matched, structured_missing, breakdown
                )
            except Exception as e:
                logger.warning(f"[VectorMatch] LLM reasoning failed for {job_id}: {e}")

        result = {
            "internship_id": job_id,
            "match_score": final_score,
            "matching_skills": structured_matched,
            "missing_skills": structured_missing,
            "reasoning": reasoning.strip(),
            "score_breakdown": breakdown,
        }
        results.append(result)

    return results


async def find_top_students_for_job(internship_id: str, job: dict, top_k: int = TOP_K) -> list[dict]:
    """
    Find the top-K matching students for a new internship using vector similarity.
    Called when an employer posts a new job.
    """
    job_embedding = await _get_or_compute_job_embedding(internship_id, job)
    if not job_embedding:
        return []

    job_emb_eval = _ensure_vector(job_embedding)
    if not job_emb_eval:
        return []

    try:
        # Correct PostgREST syntax for IS NOT NULL
        res = await asyncio.to_thread(
            lambda: supabase.table("profiles")
            .select("id, cv_text, cv_structured, cv_embedding")
            .eq("role", "student")
            .not_.is_("cv_text", "null")
            .execute()
        )
        students = res.data or []
    except Exception as e:
        logger.error(f"[VectorMatch] Failed to fetch students: {e}")
        return []

    scored = []
    for student in students:
        cv_emb = _ensure_vector(student.get("cv_embedding"))
        if not cv_emb:
            # If student has text but no embedding yet, compute it now
            cv_text = student.get("cv_text", "")
            if cv_text and len(cv_text.strip()) >= 50:
                cv_emb = await store_cv_embedding(student["id"], cv_text)
                cv_emb = _ensure_vector(cv_emb)
        if not cv_emb:
            continue

        sim = compute_cosine_similarity(job_emb_eval, cv_emb)
        scored.append((sim, student))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [{"user_id": s["id"], "similarity": sim} for sim, s in scored[:top_k]]


# --- Private helpers ---

async def _get_or_compute_cv_embedding(user_id: str, cv_text: str) -> Optional[list[float]]:
    """Get existing CV embedding from DB, or compute and store it."""
    try:
        res = await asyncio.to_thread(
            lambda: supabase.table("profiles").select("cv_embedding").eq("id", user_id).single().execute()
        )
        existing = _ensure_vector(res.data.get("cv_embedding") if res.data else None)
        if existing:
            return existing
    except Exception:
        pass

    return await store_cv_embedding(user_id, cv_text)


async def _get_or_compute_job_embedding(internship_id: str, job: dict) -> Optional[list[float]]:
    """Get existing job embedding from DB, or compute and store it."""
    try:
        res = await asyncio.to_thread(
            lambda: supabase.table("internships").select("job_embedding").eq("id", internship_id).single().execute()
        )
        existing = _ensure_vector(res.data.get("job_embedding") if res.data else None)
        if existing:
            return existing
    except Exception:
        pass

    return await store_job_embedding(internship_id, job)


def _quick_job_structure(job: dict) -> dict:
    """Quick non-LLM job structure extraction from requirements list."""
    reqs = job.get("requirements", "")
    if isinstance(reqs, list):
        skills = [str(r).strip().lower() for r in reqs if str(r).strip() and len(str(r).strip()) < 50]
    else:
        skills = [r.strip().lower() for r in str(reqs or "").replace(",", "\n").split("\n") if r.strip() and len(r.strip()) < 50]

    return {
        "required_skills": skills[:15],
        "nice_to_have_skills": [],
        "domain": str(job.get("category", "")).lower(),
        "experience_level": "any",
        "key_responsibilities": [],
        "relevant_courses": [],
    }


def _keyword_score(cv_text: str, req_list: list) -> int:
    """Quick keyword overlap percentage."""
    if not req_list or not cv_text:
        return 0
    _, _, ratio = analyze_skills(cv_text, req_list)
    return int(ratio * 100)


def _build_quick_reasoning(final: int, structured: int, semantic: int, breakdown: dict) -> str:
    """Fast fallback reasoning without LLM."""
    if final >= 70:
        return f"Strong match ({final}%) based on skill alignment and experience relevance."
    elif final >= 40:
        return f"Moderate match ({final}%) — some relevant skills but gaps in key areas."
    else:
        return f"Low match ({final}%) — significant skill gaps for this role."


async def _generate_reasoning(score, job_title, company, reqs_text, matched, missing, breakdown) -> str:
    """LLM reasoning for top matches only."""
    prompt = (
        f"In 2-3 concise sentences, explain why this candidate is a {score}% match for this role.\n\n"
        f"Role: {job_title} at {company}\n"
        f"Requirements: {reqs_text[:500]}\n\n"
        f"Candidate Skills Found: {', '.join(matched[:8]) if matched else 'None identified'}\n"
        f"Missing Skills: {', '.join(missing[:5]) if missing else 'None'}\n"
        f"Score breakdown: Skills {breakdown.get('skills', 'N/A')}%, "
        f"Experience {breakdown.get('experience', 'N/A')}%, "
        f"Education {breakdown.get('education', 'N/A')}%\n\n"
        f"Be specific. Mention which skills make them strong and what gaps exist. No markdown."
    )
    return await generate_completion(
        prompt,
        system_message="You provide brief, factual career match explanations. No markdown, no bullet points. 2-3 sentences max.",
    )
