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

import logging
import hashlib
from typing import Optional

from core.db import supabase
from services.embedding_service import get_embedding
from services.cv_parser_service import compute_structured_match, parse_job_structured
from services.matching_service import compute_cosine_similarity, analyze_skills
from services.llm_service import generate_completion
from services.cache_service import embedding_cache, match_result_cache

logger = logging.getLogger(__name__)

# How many top matches to return from vector search
TOP_K = 15
# How many of those to enrich with LLM reasoning
LLM_REASONING_TOP_N = 5


async def store_cv_embedding(user_id: str, cv_text: str) -> Optional[list[float]]:
    """Compute and store the CV embedding in profiles.cv_embedding. Called once at upload."""
    if not cv_text or len(cv_text.strip()) < 50:
        return None

    try:
        embedding = await get_embedding(cv_text[:6000])
        if not embedding:
            return None

        # Store in Supabase
        supabase.table("profiles").update(
            {"cv_embedding": embedding}
        ).eq("id", user_id).execute()

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
        reqs_text = ", ".join(reqs)
    else:
        reqs_text = str(reqs)

    full_job_text = f"Role: {job_title}. Company: {company}. Description: {job_desc}. Requirements: {reqs_text}"

    try:
        embedding = await get_embedding(full_job_text[:6000])
        if not embedding:
            return None

        # Also parse job structure (one-time LLM call per job)
        job_structured = await parse_job_structured(job)

        supabase.table("internships").update({
            "job_embedding": embedding,
            "job_structured": job_structured,
        }).eq("id", internship_id).execute()

        logger.info(f"[VectorMatch] Stored embedding + structure for internship {internship_id}")
        return embedding
    except Exception as e:
        logger.error(f"[VectorMatch] Failed to store job embedding for {internship_id}: {e}")
        return None


async def find_top_matches_for_user(user_id: str, cv_text: str, cv_structured: dict = None, top_k: int = TOP_K) -> list[dict]:
    """
    Find the top-K matching internships for a user using vector similarity.
    
    Flow:
    1. Get/compute CV embedding
    2. Fetch all internship embeddings from DB  
    3. Compute cosine similarity locally (fast, no API calls)
    4. Return top-K sorted by similarity
    5. Enrich top results with structured matching + LLM reasoning
    """
    # Step 1: Get CV embedding (from DB or compute fresh)
    cv_embedding = await _get_or_compute_cv_embedding(user_id, cv_text)
    if not cv_embedding:
        logger.warning(f"[VectorMatch] No CV embedding for user {user_id}, falling back")
        return []

    # Step 2: Fetch top-K internships using pgvector (native DB similarity search)
    try:
        # Instead of fetching everything and doing math in Python, we let Postgres do it.
        # This requires an RPC call if using the Supabase Python client for vector distance.
        # We'll use the rpc method if available, otherwise fallback to fetching all.
        try:
            res = supabase.rpc(
                "match_internships", 
                {"query_embedding": cv_embedding, "match_threshold": 0.3, "match_count": top_k * 2}
            ).execute()
            top_jobs_data = res.data
            
            # Reformat to match the expected structure
            scored = []
            for job in top_jobs_data:
                # The RPC typically returns a 'similarity' column (1 - distance)
                sim = job.get("similarity", 0.5) 
                scored.append((sim, job))
                
        except Exception as rpc_e:
            # Fallback to Python if the RPC isn't created yet
            logger.info(f"[VectorMatch] pgvector RPC not found, building Python fallback: {rpc_e}")
            res = supabase.table("internships").select(
                "id, role, company, description, requirements, category, job_embedding, job_structured"
            ).execute()
            internships = res.data or []
            
            scored = []
            for job in internships:
                job_emb = job.get("job_embedding")
                if not job_emb:
                    continue
                # Supabase Python client returns vectors as strings
                if isinstance(job_emb, str):
                    import json
                    try:
                        job_emb = json.loads(job_emb)
                    except Exception:
                        pass
                
                # cv_embedding might also be a string
                cv_emb_eval = cv_embedding
                if isinstance(cv_emb_eval, str):
                    import json
                    try:
                        cv_emb_eval = json.loads(cv_emb_eval)
                    except Exception:
                        pass
                        
                sim = compute_cosine_similarity(cv_emb_eval, job_emb)
                scored.append((sim, job))
                
            scored.sort(key=lambda x: x[0], reverse=True)
            
    except Exception as e:
        logger.error(f"[VectorMatch] Failed to search internships: {e}")
        return []

    top_jobs = scored[:top_k]

    # Step 4: Enrich with structured matching (fast, no API calls)
    results = []
    for i, (sim_score, job) in enumerate(top_jobs):
        # Calibrated semantic score: cosine 0.30 = 0%, 0.50 = 50%, 0.70+ = 100%
        semantic_percent = max(0, min(100, int((sim_score - 0.3) * 250)))

        job_id = job["id"]
        job_title = job.get("title") or job.get("role") or ""
        company = job.get("company", "")
        reqs = job.get("requirements", "")

        if isinstance(reqs, list):
            req_list = reqs
            reqs_text = ", ".join(reqs)
        else:
            reqs_text = str(reqs)
            req_list = [r.strip() for r in reqs_text.replace(",", "\n").split("\n") if r.strip()]

        # Structured match (fast path)
        structured_score = 0
        structured_matched = []
        structured_missing = []
        breakdown = {}

        if cv_structured:
            job_structured = job.get("job_structured")
            if not job_structured:
                # Parse on the fly (will be cached for next time)
                job_structured = _quick_job_structure(job)

            if job_structured:
                struct_result = compute_structured_match(cv_structured, job_structured)
                structured_score = struct_result["score"]
                structured_matched = struct_result["matched_skills"]
                structured_missing = struct_result["missing_skills"]
                breakdown = struct_result["breakdown"]

        # Blend scores
        if cv_structured and structured_score > 0:
            final_score = int(structured_score * 0.55 + semantic_percent * 0.35 + _keyword_score(cv_text, req_list) * 0.10)
        else:
            keyword_pct = _keyword_score(cv_text, req_list)
            final_score = int(semantic_percent * 0.60 + keyword_pct * 0.40)

        final_score = max(0, min(100, final_score))

        # Build reasoning (LLM only for top N)
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
    # Get job embedding
    job_embedding = await _get_or_compute_job_embedding(internship_id, job)
    if not job_embedding:
        return []

    # Fetch students with embeddings
    try:
        res = supabase.table("profiles").select(
            "id, cv_text, cv_structured, cv_embedding"
        ).eq("role", "student").not_.is_("cv_embedding", "null").execute()
        students = res.data or []
    except Exception as e:
        logger.error(f"[VectorMatch] Failed to fetch students: {e}")
        return []

    # Score by vector similarity
    scored = []
    
    # Process job embedding string if necessary
    job_emb_eval = job_embedding
    if isinstance(job_emb_eval, str):
        import json
        try:
            job_emb_eval = json.loads(job_emb_eval)
        except Exception:
            pass

    for student in students:
        cv_emb = student.get("cv_embedding")
        if not cv_emb:
            continue
            
        if isinstance(cv_emb, str):
            import json
            try:
                cv_emb = json.loads(cv_emb)
            except Exception:
                pass
                
        sim = compute_cosine_similarity(job_emb_eval, cv_emb)
        scored.append((sim, student))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [{"user_id": s["id"], "similarity": sim} for sim, s in scored[:top_k]]


# --- Private helpers ---

async def _get_or_compute_cv_embedding(user_id: str, cv_text: str) -> Optional[list[float]]:
    """Get existing CV embedding from DB, or compute and store it."""
    try:
        res = supabase.table("profiles").select("cv_embedding").eq("id", user_id).single().execute()
        existing = res.data.get("cv_embedding") if res.data else None
        if existing:
            return existing
    except Exception:
        pass

    # Compute fresh
    return await store_cv_embedding(user_id, cv_text)


async def _get_or_compute_job_embedding(internship_id: str, job: dict) -> Optional[list[float]]:
    """Get existing job embedding from DB, or compute and store it."""
    try:
        res = supabase.table("internships").select("job_embedding").eq("id", internship_id).single().execute()
        existing = res.data.get("job_embedding") if res.data else None
        if existing:
            return existing
    except Exception:
        pass

    return await store_job_embedding(internship_id, job)


def _quick_job_structure(job: dict) -> dict:
    """Quick non-LLM job structure extraction from requirements list."""
    reqs = job.get("requirements", "")
    if isinstance(reqs, list):
        return {
            "required_skills": [r.strip().lower() for r in reqs if len(r.strip()) < 50],
            "nice_to_have_skills": [],
            "domain": job.get("category", "").lower(),
            "experience_level": "any",
            "key_responsibilities": [],
            "relevant_courses": [],
        }
    # Parse from text
    skills = [r.strip().lower() for r in reqs.replace(",", "\n").split("\n") if r.strip() and len(r.strip()) < 50]
    return {
        "required_skills": skills,
        "nice_to_have_skills": [],
        "domain": job.get("category", "").lower(),
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
