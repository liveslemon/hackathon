from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from core.config import settings
from core.db import supabase
from services.embedding_service import get_embedding
from services.cv_parser_service import parse_job_structured
from services.matching_service import compute_cosine_similarity
from services.match_scoring import (
    SCORE_VERSION,
    compute_inputs_hash,
    score_pair,
)
from services.llm_service import generate_completion, LLMServiceError

logger = logging.getLogger(__name__)

TOP_K = 15
LLM_REASONING_TOP_N = 5


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _ensure_vector(v: Any) -> Optional[list[float]]:
    """Helper to ensure a vector is a list of 1024 floats."""
    if v is None:
        return None
    if isinstance(v, str):
        try:
            v = json.loads(v)
        except Exception:
            return None
    if isinstance(v, list) and len(v) == 1024:
        try:
            return [float(x) for x in v]
        except (ValueError, TypeError):
            return None
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
            lambda: supabase.table("profiles")
            .update({"cv_embedding": embedding, "updated_at": _now_iso()})
            .eq("id", user_id)
            .execute()
        )

        logger.info(f"[VectorMatch] Stored CV embedding for user {user_id}")
        return embedding
    except Exception as e:
        logger.error(f"[VectorMatch] Failed to store CV embedding for {user_id}: {e}")
        return None


async def store_job_embedding(internship_id: str, job: dict) -> Optional[list[float]]:
    """Compute and store the job embedding + structured data. Called on job creation/update."""
    job_title = job.get("title") or job.get("role") or ""
    job_desc = job.get("description", "")
    reqs = job.get("requirements", "")
    company = job.get("company", "")

    if isinstance(reqs, list):
        reqs_text = ", ".join(str(r) for r in reqs if r)
    else:
        reqs_text = str(reqs or "")

    full_job_text = (
        f"Role: {job_title}. Company: {company}. Description: {job_desc}. Requirements: {reqs_text}"
    )

    try:
        embedding = await get_embedding(full_job_text[:6000])
        if not embedding:
            return None

        job_structured = await parse_job_structured(job)

        await asyncio.to_thread(
            lambda: supabase.table("internships")
            .update({
                "job_embedding": embedding,
                "job_structured": job_structured,
                "updated_at": _now_iso(),
            })
            .eq("id", internship_id)
            .execute()
        )

        logger.info(f"[VectorMatch] Stored embedding + structure for internship {internship_id}")
        return embedding
    except Exception as e:
        logger.error(f"[VectorMatch] Failed to store job embedding for {internship_id}: {e}")
        return None


# -----------------------------------------------------------------------------
# Notifications & Rate Limiting
# -----------------------------------------------------------------------------

async def _notify_new_matches(user_id: str, qualifying_matches: list[dict]) -> None:
    """
    Creates at most 3 in-app notifications (type 'new_match') per student per day
    for newly discovered strong matches (score >= 75%) that the student has not applied to.
    Respects opt-outs.
    """
    if not qualifying_matches:
        return

    try:
        # 1. Check user notification preferences / opt-out
        p_res = await asyncio.to_thread(
            lambda: supabase.table("profiles")
            .select("settings, notification_preferences")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if p_res and p_res.data:
            pdata = p_res.data
            modern = (pdata.get("settings") or {}).get("notifications") or {}
            legacy = pdata.get("notification_preferences") or {}

            # Check if opted out
            for k in ("new_match", "recommendations", "job_recommendations"):
                if modern.get(k) is False or legacy.get(k) is False:
                    logger.info(f"[VectorMatch] User {user_id} opted out of new_match notifications")
                    return 0

        # 2. Check 24-hour rate limit (max 3/day)
        day_ago = (_now() - timedelta(hours=24)).isoformat()
        recent_notifs = await asyncio.to_thread(
            lambda: supabase.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("type", "new_match")
            .gte("created_at", day_ago)
            .execute()
        )
        already_sent = recent_notifs.count or 0
        allowed = max(0, 3 - already_sent)
        if allowed <= 0:
            logger.info(f"[VectorMatch] Notification rate limit reached for {user_id} (already sent {already_sent}/day)")
            return 0

        # 3. Check applied internships
        applied_res = await asyncio.to_thread(
            lambda: supabase.table("applied_internships")
            .select("internship_id")
            .eq("user_id", user_id)
            .execute()
        )
        applied_ids = {a["internship_id"] for a in (applied_res.data or [])}

        to_send = []
        for m in qualifying_matches:
            if m["internship_id"] in applied_ids:
                continue
            to_send.append(m)
            if len(to_send) >= allowed:
                break

        for m in to_send:
            role = m.get("role") or "Opportunity"
            company = m.get("company") or "Top Company"
            score = m.get("match_score", 75)
            await asyncio.to_thread(
                lambda: supabase.table("notifications")
                .insert({
                    "user_id": user_id,
                    "type": "new_match",
                    "title": f"New {score}% Match: {role}",
                    "body": f"You match {score}% with {role} at {company}. Apply before the deadline!",
                    "link": f"/internships/{m['internship_id']}",
                    "metadata": {
                        "internship_id": m["internship_id"],
                        "match_score": score,
                    },
                })
                .execute()
            )
            logger.info(f"[VectorMatch] Sent new_match notification to {user_id} for {m['internship_id']}")
        return len(to_send)
    except Exception as e:
        logger.warning(f"[VectorMatch] Failed creating new_match notification: {e}")
        return 0


# -----------------------------------------------------------------------------
# Canonical Full-Coverage Rescoring
# -----------------------------------------------------------------------------

async def rescore_user(user_id: str) -> int:
    """
    Score this student against EVERY open internship using pgvector in Postgres
    and deterministic score_pair.
    - Full coverage (every active, unexpired internship)
    - Upsert, never delete-first (preserves existing matches while running)
    - Skips pairs whose inputs haven't changed (via inputs_hash)
    - Enqueues MATCH_REASONING for strong matches (>= threshold)
    - Emits rate-limited notifications for new matches >= 75%
    """
    from services.job_queue import enqueue_match_reasoning

    # 1. Fetch student features
    prof_res = await asyncio.to_thread(
        lambda: supabase.table("profiles")
        .select("id, cv_text, cv_structured, skills, course, experience, projects, cv_embedding, role")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if not prof_res or not prof_res.data:
        logger.warning(f"[VectorMatch] Student {user_id} not found for rescore")
        return 0

    student = prof_res.data
    cv_text = student.get("cv_text") or ""
    skills = student.get("skills") or []
    experience = student.get("experience") or []
    projects = student.get("projects") or []
    course = student.get("course") or ""
    cv_structured = student.get("cv_structured")
    if isinstance(cv_structured, str):
        try:
            cv_structured = json.loads(cv_structured)
        except Exception:
            cv_structured = None

    # Check signal: if student has no CV and no profile skills/experience, don't store anything
    has_signal = bool(cv_text.strip() or skills or experience or projects)
    if not has_signal:
        logger.info(f"[VectorMatch] Student {user_id} has insufficient profile/CV signal; skipping")
        return 0

    # Ensure CV embedding
    cv_emb = _ensure_vector(student.get("cv_embedding"))
    if not cv_emb and cv_text.strip() and len(cv_text.strip()) >= 50:
        cv_emb = await store_cv_embedding(user_id, cv_text)

    # 2. Fetch all open internships (via pgvector RPC or table fallback)
    open_jobs: list[dict] = []
    try:
        rpc_res = await asyncio.to_thread(
            lambda: supabase.rpc(
                "match_all_open_internships_for_student",
                {
                    "p_student_id": user_id,
                    "p_query_embedding": cv_emb,
                    "p_match_threshold": 0.0,
                    "p_limit": 1000,
                },
            ).execute()
        )
        open_jobs = rpc_res.data or []
    except Exception as rpc_e:
        logger.debug(f"[VectorMatch] match_all_open_internships_for_student RPC failed: {rpc_e}; using table fallback")

    if not open_jobs:
        # Fallback to direct table query
        now_iso = _now_iso()
        jobs_res = await asyncio.to_thread(
            lambda: supabase.table("internships")
            .select("id, role, company, description, requirements, required_skills, category, field, location, job_structured, job_embedding, deadline, status")
            .eq("status", "active")
            .execute()
        )
        all_jobs = jobs_res.data or []
        for j in all_jobs:
            deadline = j.get("deadline")
            if deadline and deadline < now_iso:
                continue
            j_emb = _ensure_vector(j.get("job_embedding"))
            sim = 0.5
            if cv_emb and j_emb:
                try:
                    sim = compute_cosine_similarity(cv_emb, j_emb)
                except Exception:
                    sim = 0.5
            j_copy = dict(j)
            j_copy["similarity"] = sim
            open_jobs.append(j_copy)

    if not open_jobs:
        logger.info(f"[VectorMatch] No open internships found for {user_id}")
        return 0

    # 3. Fetch existing match_results for this user
    existing_res = await asyncio.to_thread(
        lambda: supabase.table("match_results")
        .select("internship_id, match_score, inputs_hash, score_version, ai_reasoning, ai_reasoning_hash")
        .eq("user_id", user_id)
        .execute()
    )
    existing_map = {row["internship_id"]: row for row in (existing_res.data or [])}

    student_features = {
        "skills": skills,
        "text": cv_text,
        "structured": cv_structured,
        "course": course,
        "experience": experience,
        "projects": projects,
    }

    upsert_batch: list[dict] = []
    reasoning_candidates: list[dict] = []
    new_strong_matches: list[dict] = []
    open_job_ids = set()

    for job in open_jobs:
        job_id = job["id"]
        open_job_ids.add(job_id)

        job_features = {
            "role": job.get("role") or "",
            "company": job.get("company") or "",
            "requirements": job.get("requirements") or "",
            "required_skills": job.get("required_skills") or [],
            "description": job.get("description") or "",
            "category": job.get("category") or "",
            "field": job.get("field") or "",
            "structured": job.get("job_structured") or {},
            "cosine_similarity": job.get("similarity", 0.5),
        }

        current_hash = compute_inputs_hash(student_features, job_features)
        existing = existing_map.get(job_id)

        # Check if already up-to-date
        if (
            existing
            and existing.get("inputs_hash") == current_hash
            and existing.get("score_version") == SCORE_VERSION
        ):
            # Inputs unchanged; check if AI reasoning needed
            score = existing.get("match_score", 0)
            if (
                score >= settings.AI_REASONING_THRESHOLD
                and not existing.get("ai_reasoning")
            ):
                reasoning_candidates.append({
                    "user_id": user_id,
                    "internship_id": job_id,
                    "match_score": score,
                })
            continue

        scored = score_pair(student_features, job_features)
        final_score = scored["match_score"]

        # Keep existing AI reasoning if hash matches, otherwise invalidate
        ai_reasoning = None
        ai_hash = None
        if existing and existing.get("ai_reasoning_hash") == current_hash:
            ai_reasoning = existing.get("ai_reasoning")
            ai_hash = existing.get("ai_reasoning_hash")

        upsert_row = {
            "user_id": user_id,
            "internship_id": job_id,
            "match_score": final_score,
            "matching_skills": scored["matching_skills"],
            "missing_skills": scored["missing_skills"],
            "reasoning": scored["instant_reasoning"],
            "instant_reasoning": scored["instant_reasoning"],
            "score_breakdown": scored["breakdown"],
            "score_version": SCORE_VERSION,
            "inputs_hash": current_hash,
            "ai_reasoning": ai_reasoning,
            "ai_reasoning_hash": ai_hash,
            "last_computed_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        upsert_batch.append(upsert_row)

        if final_score >= settings.AI_REASONING_THRESHOLD and not ai_reasoning:
            reasoning_candidates.append({
                "user_id": user_id,
                "internship_id": job_id,
                "match_score": final_score,
            })

        # Check for new strong match notification
        old_score = existing.get("match_score", 0) if existing else 0
        if final_score >= 75 and old_score < 75:
            new_strong_matches.append({
                "internship_id": job_id,
                "role": job.get("role"),
                "company": job.get("company"),
                "match_score": final_score,
            })

    # 4. Upsert in batches of 50
    if upsert_batch:
        batch_size = 50
        for i in range(0, len(upsert_batch), batch_size):
            chunk = upsert_batch[i : i + batch_size]
            await asyncio.to_thread(
                lambda c=chunk: supabase.table("match_results")
                .upsert(c, on_conflict="user_id,internship_id")
                .execute()
            )
        logger.info(f"[VectorMatch] Upserted {len(upsert_batch)} match_results for user {user_id}")

    # 5. Clean up stale rows: remove only rows whose internship is no longer open
    stale_ids = [jid for jid in existing_map.keys() if jid not in open_job_ids]
    if stale_ids:
        await asyncio.to_thread(
            lambda: supabase.table("match_results")
            .delete()
            .eq("user_id", user_id)
            .in_("internship_id", stale_ids)
            .execute()
        )
        logger.info(f"[VectorMatch] Cleaned up {len(stale_ids)} stale match rows for user {user_id}")

    # 6. Queue MATCH_REASONING for strong matches, highest score first
    reasoning_candidates.sort(key=lambda x: x["match_score"], reverse=True)
    for cand in reasoning_candidates[:10]:
        await asyncio.to_thread(
            enqueue_match_reasoning, cand["user_id"], cand["internship_id"]
        )

    # 7. Send rate-limited notifications for new strong matches
    if new_strong_matches:
        new_strong_matches.sort(key=lambda x: x["match_score"], reverse=True)
        await _notify_new_matches(user_id, new_strong_matches)

    total_matches = len(open_job_ids)
    return total_matches


async def rescore_internship(internship_id: str) -> int:
    """
    Score this open internship against EVERY student with an embedding/profile.
    - Full coverage
    - Upsert, never delete-first
    - Skips unchanged inputs
    - Enqueues MATCH_REASONING for strong matches (>= threshold)
    - Emits rate-limited notifications for new matches >= 75%
    """
    from services.job_queue import enqueue_match_reasoning

    # 1. Fetch internship features
    job_res = await asyncio.to_thread(
        lambda: supabase.table("internships")
        .select("id, role, company, description, requirements, required_skills, category, field, status, deadline, job_embedding, job_structured")
        .eq("id", internship_id)
        .maybe_single()
        .execute()
    )
    if not job_res or not job_res.data:
        logger.warning(f"[VectorMatch] Internship {internship_id} not found for rescore")
        return 0

    job = job_res.data
    status = job.get("status") or "draft"
    deadline = job.get("deadline")
    is_open = status == "active" and (not deadline or deadline >= _now_iso())

    if not is_open:
        # Posting is closed, expired, or draft: remove its match rows
        await asyncio.to_thread(
            lambda: supabase.table("match_results")
            .delete()
            .eq("internship_id", internship_id)
            .execute()
        )
        logger.info(f"[VectorMatch] Internship {internship_id} is not open ({status}); cleared match rows")
        return 0

    # Ensure job embedding
    job_emb = _ensure_vector(job.get("job_embedding"))
    if not job_emb:
        job_emb = await store_job_embedding(internship_id, job)

    # 2. Fetch all candidate students
    students: list[dict] = []
    try:
        rpc_res = await asyncio.to_thread(
            lambda: supabase.rpc(
                "match_all_students_for_internship",
                {
                    "p_internship_id": internship_id,
                    "p_query_embedding": job_emb,
                    "p_match_threshold": 0.0,
                    "p_limit": 5000,
                },
            ).execute()
        )
        students = rpc_res.data or []
    except Exception as rpc_e:
        logger.debug(f"[VectorMatch] match_all_students_for_internship RPC failed: {rpc_e}; using table fallback")

    if not students:
        s_res = await asyncio.to_thread(
            lambda: supabase.table("profiles")
            .select("id, skills, cv_text, cv_structured, course, experience, projects, interests, cv_embedding")
            .eq("role", "student")
            .execute()
        )
        all_students = s_res.data or []
        for s in all_students:
            s_emb = _ensure_vector(s.get("cv_embedding"))
            sim = 0.5
            if job_emb and s_emb:
                try:
                    sim = compute_cosine_similarity(job_emb, s_emb)
                except Exception:
                    sim = 0.5
            s_copy = dict(s)
            s_copy["similarity"] = sim
            students.append(s_copy)

    if not students:
        return 0

    # 3. Fetch existing match_results for this internship
    existing_res = await asyncio.to_thread(
        lambda: supabase.table("match_results")
        .select("user_id, match_score, inputs_hash, score_version, ai_reasoning, ai_reasoning_hash")
        .eq("internship_id", internship_id)
        .execute()
    )
    existing_map = {row["user_id"]: row for row in (existing_res.data or [])}

    job_features = {
        "role": job.get("role") or "",
        "company": job.get("company") or "",
        "requirements": job.get("requirements") or "",
        "required_skills": job.get("required_skills") or [],
        "description": job.get("description") or "",
        "category": job.get("category") or "",
        "field": job.get("field") or "",
        "structured": job.get("job_structured") or {},
        "cosine_similarity": 0.5,
    }

    upsert_batch: list[dict] = []
    reasoning_candidates: list[dict] = []

    for student in students:
        uid = student["id"]
        cv_text = student.get("cv_text") or ""
        skills = student.get("skills") or []
        experience = student.get("experience") or []
        projects = student.get("projects") or []
        course = student.get("course") or ""

        cv_struct = student.get("cv_structured")
        if isinstance(cv_struct, str):
            try:
                cv_struct = json.loads(cv_struct)
            except Exception:
                cv_struct = None

        has_sig = bool(cv_text.strip() or skills or experience or projects)
        if not has_sig:
            continue

        student_features = {
            "skills": skills,
            "text": cv_text,
            "structured": cv_struct,
            "course": course,
            "experience": experience,
            "projects": projects,
        }

        job_features["cosine_similarity"] = student.get("similarity", 0.5)

        current_hash = compute_inputs_hash(student_features, job_features)
        existing = existing_map.get(uid)

        if (
            existing
            and existing.get("inputs_hash") == current_hash
            and existing.get("score_version") == SCORE_VERSION
        ):
            score = existing.get("match_score", 0)
            if (
                score >= settings.AI_REASONING_THRESHOLD
                and not existing.get("ai_reasoning")
            ):
                reasoning_candidates.append({
                    "user_id": uid,
                    "internship_id": internship_id,
                    "match_score": score,
                })
            continue

        scored = score_pair(student_features, job_features)
        final_score = scored["match_score"]

        ai_reasoning = None
        ai_hash = None
        if existing and existing.get("ai_reasoning_hash") == current_hash:
            ai_reasoning = existing.get("ai_reasoning")
            ai_hash = existing.get("ai_reasoning_hash")

        upsert_row = {
            "user_id": uid,
            "internship_id": internship_id,
            "match_score": final_score,
            "matching_skills": scored["matching_skills"],
            "missing_skills": scored["missing_skills"],
            "reasoning": scored["instant_reasoning"],
            "instant_reasoning": scored["instant_reasoning"],
            "score_breakdown": scored["breakdown"],
            "score_version": SCORE_VERSION,
            "inputs_hash": current_hash,
            "ai_reasoning": ai_reasoning,
            "ai_reasoning_hash": ai_hash,
            "last_computed_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        upsert_batch.append(upsert_row)

        if final_score >= settings.AI_REASONING_THRESHOLD and not ai_reasoning:
            reasoning_candidates.append({
                "user_id": uid,
                "internship_id": internship_id,
                "match_score": final_score,
            })

        old_score = existing.get("match_score", 0) if existing else 0
        if final_score >= 75 and old_score < 75:
            # Send notification asynchronously per student
            asyncio.create_task(
                _notify_new_matches(uid, [{
                    "internship_id": internship_id,
                    "role": job.get("role"),
                    "company": job.get("company"),
                    "match_score": final_score,
                }])
            )

    if upsert_batch:
        batch_size = 50
        for i in range(0, len(upsert_batch), batch_size):
            chunk = upsert_batch[i : i + batch_size]
            await asyncio.to_thread(
                lambda c=chunk: supabase.table("match_results")
                .upsert(c, on_conflict="user_id,internship_id")
                .execute()
            )
        logger.info(f"[VectorMatch] Upserted {len(upsert_batch)} matches for internship {internship_id}")

    reasoning_candidates.sort(key=lambda x: x["match_score"], reverse=True)
    for cand in reasoning_candidates[:20]:
        await asyncio.to_thread(
            enqueue_match_reasoning, cand["user_id"], cand["internship_id"]
        )

    return len(students)


# -----------------------------------------------------------------------------
# AI Reasoning Generation (Ahead of time, durable queue only)
# -----------------------------------------------------------------------------

async def generate_match_reasoning(user_id: str, internship_id: str) -> Optional[str]:
    """
    Generates an AI-polished explanation paragraph for strong matches (>= threshold).
    Ahead of time only. Never runs on page load.
    Stores the result next to the score with the inputs_hash it was written for.
    """
    res = await asyncio.to_thread(
        lambda: supabase.table("match_results")
        .select("match_score, matching_skills, missing_skills, score_breakdown, inputs_hash, instant_reasoning")
        .eq("user_id", user_id)
        .eq("internship_id", internship_id)
        .maybe_single()
        .execute()
    )
    if not res or not res.data:
        return None

    match_row = res.data
    score = match_row.get("match_score", 0)
    if score < settings.AI_REASONING_THRESHOLD:
        return None

    job_res = await asyncio.to_thread(
        lambda: supabase.table("internships")
        .select("role, company, requirements, description")
        .eq("id", internship_id)
        .maybe_single()
        .execute()
    )
    job = job_res.data if job_res else {}

    matched = match_row.get("matching_skills") or []
    missing = match_row.get("missing_skills") or []
    breakdown = match_row.get("score_breakdown") or {}
    inputs_hash = match_row.get("inputs_hash") or ""

    prompt = (
        f"In 2-3 concise, authentic sentences, explain why this university student is a strong {score}% match for this role.\n\n"
        f"Role: {job.get('role')} at {job.get('company')}\n"
        f"Requirements: {str(job.get('requirements') or '')[:400]}\n"
        f"Candidate Skills Found: {', '.join(matched[:6]) if matched else 'None'}\n"
        f"Missing Skills: {', '.join(missing[:3]) if missing else 'None'}\n"
        f"Breakdown: Skills {breakdown.get('skills', 'N/A')}%, Experience {breakdown.get('experience', 'N/A')}%\n\n"
        f"Highlight specific strengths and gaps cleanly. No markdown, no bullet points. Professional tone."
    )

    try:
        ai_text = await generate_completion(
            prompt,
            system_message="You are a career matching advisor writing brief, specific 2-sentence match summaries. No markdown.",
        )
        ai_text = ai_text.strip()
        if ai_text:
            await asyncio.to_thread(
                lambda: supabase.table("match_results")
                .update({
                    "ai_reasoning": ai_text,
                    "ai_reasoning_hash": inputs_hash,
                    "ai_reasoning_updated_at": _now_iso(),
                })
                .eq("user_id", user_id)
                .eq("internship_id", internship_id)
                .execute()
            )
            logger.info(f"[VectorMatch] Generated and stored AI reasoning for {user_id} + {internship_id}")
            return ai_text
    except Exception as e:
        logger.warning(f"[VectorMatch] AI reasoning generation failed for {user_id} + {internship_id}: {e}")
        raise

    return None


# -----------------------------------------------------------------------------
# Backwards-compatible Helpers
# -----------------------------------------------------------------------------

async def find_top_matches_for_user(
    user_id: str,
    cv_text: str,
    cv_structured: dict = None,
    top_k: int = TOP_K,
) -> list[dict]:
    """Compatibility wrapper that triggers rescore_user and returns top matches."""
    await rescore_user(user_id)
    res = await asyncio.to_thread(
        lambda: supabase.table("match_results")
        .select("internship_id, match_score, matching_skills, missing_skills, reasoning, instant_reasoning, ai_reasoning, score_breakdown")
        .eq("user_id", user_id)
        .order("match_score", desc=True)
        .limit(top_k)
        .execute()
    )
    return res.data or []


async def find_top_students_for_job(internship_id: str, job: dict, top_k: int = TOP_K) -> list[dict]:
    """Compatibility wrapper that triggers rescore_internship."""
    await rescore_internship(internship_id)
    res = await asyncio.to_thread(
        lambda: supabase.table("match_results")
        .select("user_id, match_score")
        .eq("internship_id", internship_id)
        .order("match_score", desc=True)
        .limit(top_k)
        .execute()
    )
    return res.data or []
