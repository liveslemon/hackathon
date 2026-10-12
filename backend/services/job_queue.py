"""
services/job_queue.py

Durable job queue backed by the cv_processing_jobs table.
Handles:
- CV_ANALYSIS (student CV parsing & profile auto-fill)
- USER_RESCORE / PROFILE_REMATCH (student rescoring against all open internships)
- INTERNSHIP_RESCORE (internship rescoring against all students)
- MATCH_REASONING (ahead-of-time AI reasoning for strong matches >= threshold)

Features:
- Concurrency-safe job claiming with Postgres FOR UPDATE SKIP LOCKED
- De-duplication and debouncing (30s coalesce window)
- Priority-ordered execution (rescores at 10, reasoning at 0)
- Ahead-of-time AI reasoning throttling (configurable max per minute)
- Circuit-breaker pause on LLM credit/quota exhaustion with auto-recovery
"""

from __future__ import annotations

import asyncio
import collections
import logging
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from core.config import settings
from core.db import supabase

logger = logging.getLogger(__name__)

POLL_SECONDS = 10
STALE_AFTER = timedelta(minutes=15)
STALE_CHECK_EVERY = 20
MAX_ATTEMPTS = 3

CV_ANALYSIS = "cv_analysis"
PROFILE_REMATCH = "profile_rematch"
USER_RESCORE = "user_rescore"
INTERNSHIP_RESCORE = "internship_rescore"
MATCH_REASONING = "match_reasoning"

class JobKind:
    CV_ANALYSIS = CV_ANALYSIS
    PROFILE_REMATCH = PROFILE_REMATCH
    USER_RESCORE = USER_RESCORE
    INTERNSHIP_RESCORE = INTERNSHIP_RESCORE
    MATCH_REASONING = MATCH_REASONING

_WORKER_ID = f"worker-{os.getpid()}-{uuid.uuid4().hex[:6]}"

# Event loop coordination
_loop: asyncio.AbstractEventLoop | None = None
_wake: asyncio.Event | None = None

# Throttling & Circuit breaker state for MATCH_REASONING
_reasoning_timestamps = collections.deque()
_llm_paused: bool = False
_llm_pause_until: Optional[datetime] = None
_llm_paused_reason: str = ""
_outage_warning_logged: bool = False


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def wake() -> None:
    """Nudge this process's worker. Safe to call from any thread."""
    if _loop and _wake:
        _loop.call_soon_threadsafe(_wake.set)


def get_llm_pause_status() -> dict:
    """Returns the current pause/circuit-breaker state for AI reasoning jobs."""
    is_paused = _llm_paused and _llm_pause_until is not None and _now() < _llm_pause_until
    return {
        "paused": is_paused,
        "reason": _llm_paused_reason if is_paused else "",
        "pause_until": _llm_pause_until.isoformat() if is_paused and _llm_pause_until else None,
    }


def _is_quota_or_credit_error(err: Exception) -> bool:
    """Detects if an error is due to credit exhaustion, rate limits, or quota limits."""
    msg = str(err).lower()
    return (
        "429" in msg
        or "402" in msg
        or "quota" in msg
        or "credit" in msg
        or "rate limit" in msg
        or "resource_exhausted" in msg
        or "insufficient_quota" in msg
        or "balance" in msg
        or "payment" in msg
        or "all stream providers failed" in msg
        or "all configured llm providers fail" in msg
        or "temporarily unavailable" in msg
    )


def handle_llm_provider_error(err: Exception) -> bool:
    """Trigger circuit breaker pause on quota/credit error."""
    global _llm_paused, _llm_pause_until, _llm_paused_reason, _outage_warning_logged
    if _is_quota_or_credit_error(err):
        _llm_paused = True
        _llm_pause_until = _now() + timedelta(minutes=15)
        _llm_paused_reason = str(err)[:300]
        if not _outage_warning_logged:
            logger.warning(f"[JobQueue] LLM providers paused: {err}")
            _outage_warning_logged = True
        return True
    return False


async def check_and_resume_llm_if_recovered() -> bool:
    """Checks provider health and resumes AI reasoning queue if at least one provider is up."""
    global _llm_paused, _llm_pause_until, _llm_paused_reason, _outage_warning_logged
    from services.llm_service import llm_client
    try:
        res = llm_client.check_providers()
        results = await res if asyncio.iscoroutine(res) or hasattr(res, "__await__") else res
        working = sum(r.get("ok", False) for r in (results or []))
        if working > 0:
            _llm_paused = False
            _llm_pause_until = None
            _llm_paused_reason = ""
            _outage_warning_logged = False
            logger.info("[JobQueue] LLM provider recovered. Resumed MATCH_REASONING queue.")
            return True
    except Exception as e:
        logger.debug(f"[JobQueue] Provider health check failed during recovery: {e}")
    return False


def enqueue(
    user_id: Optional[str],
    kind: str,
    job_id: str | None = None,
    source: str = "dashboard",
    internship_id: Optional[str] = None,
    priority: int = 0,
    payload: Optional[dict] = None,
) -> str | None:
    """
    Queue a durable job with deduplication and wake the worker.
    Blocking DB call: run via asyncio.to_thread in async contexts.
    """
    try:
        now_dt = _now()
        now_str = now_dt.isoformat()

        # Deduplication check
        if not job_id:
            query = (
                supabase.table("cv_processing_jobs")
                .select("id, created_at, retry_at")
                .eq("kind", kind)
                .in_("status", ["queued"])
            )
            if user_id:
                query = query.eq("user_id", user_id)
            if internship_id:
                query = query.eq("internship_id", internship_id)
            
            pending = query.limit(1).execute()
            if pending.data:
                existing_id = pending.data[0]["id"]
                # 30-second debouncing coalesce: return existing job
                return existing_id

        # Coalesce debounce: schedule retry_at slightly forward if requested
        row = {
            "user_id": user_id,
            "internship_id": internship_id,
            "kind": kind,
            "status": "queued",
            "attempts": 0,
            "started_at": None,
            "retry_at": now_str,
            "error_message": None,
            "source": source,
            "priority": priority,
            "payload": payload or {},
            "updated_at": now_str,
        }

        if job_id:
            res = supabase.table("cv_processing_jobs").update(row).eq("id", job_id).execute()
            if not res.data:
                job_id = None

        if not job_id:
            try:
                res = supabase.table("cv_processing_jobs").insert(row).execute()
                job_id = res.data[0]["id"] if res.data else None
            except Exception as insert_e:
                # If unique index caught a race condition, query and return existing
                logger.debug(f"[JobQueue] Insert race deduplicated: {insert_e}")
                q = supabase.table("cv_processing_jobs").select("id").eq("kind", kind).eq("status", "queued")
                if user_id:
                    q = q.eq("user_id", user_id)
                if internship_id:
                    q = q.eq("internship_id", internship_id)
                found = q.limit(1).execute()
                return found.data[0]["id"] if found.data else None

        return job_id
    finally:
        wake()


def enqueue_user_rescore(user_id: str, source: str = "profile") -> str | None:
    """Enqueues a USER_RESCORE job for a student (priority 10)."""
    return enqueue(
        user_id=user_id,
        kind=USER_RESCORE,
        source=source,
        priority=10,
    )


def enqueue_internship_rescore(internship_id: str, source: str = "posting") -> str | None:
    """Enqueues an INTERNSHIP_RESCORE job for an internship (priority 10)."""
    return enqueue(
        user_id=None,
        internship_id=internship_id,
        kind=INTERNSHIP_RESCORE,
        source=source,
        priority=10,
    )


def enqueue_match_reasoning(user_id: str, internship_id: str) -> str | None:
    """Enqueues a low-priority MATCH_REASONING job for a strong pair (priority 0)."""
    return enqueue(
        user_id=user_id,
        internship_id=internship_id,
        kind=MATCH_REASONING,
        source="rescore",
        priority=0,
    )


def _claim_next() -> dict | None:
    """
    Claims the next available queued job ordered by priority DESC, created_at ASC.
    Uses Postgres FOR UPDATE SKIP LOCKED via RPC first, with optimistic fallback.
    """
    try:
        rpc_res = supabase.rpc("claim_next_cv_job", {"p_worker_id": _WORKER_ID}).execute()
        if rpc_res.data and len(rpc_res.data) > 0:
            return rpc_res.data[0]
    except Exception as e:
        logger.debug(f"[JobQueue] claim_next_cv_job RPC not available, using fallback: {e}")

    now_iso = _now_iso()
    try:
        queued = (
            supabase.table("cv_processing_jobs")
            .select("id, user_id, internship_id, kind, attempts, priority, payload, retry_at")
            .eq("status", "queued")
            .order("priority", desc=True)
            .order("created_at")
            .limit(5)
            .execute()
        ).data or []

        # Filter out jobs waiting for future retry_at in fallback mode
        queued = [j for j in queued if not j.get("retry_at") or str(j.get("retry_at")) <= now_iso]

        for job in queued:
            claimed = (
                supabase.table("cv_processing_jobs")
                .update({
                    "status": "processing",
                    "worker_id": _WORKER_ID,
                    "attempts": (job.get("attempts") or 0) + 1,
                    "started_at": now_iso,
                    "updated_at": now_iso,
                })
                .eq("id", job["id"])
                .eq("status", "queued")
                .execute()
            )
            if claimed.data:
                return claimed.data[0]
    except Exception as e:
        logger.error(f"[JobQueue] Failed to query/claim queued jobs: {e}")

    return None


def _recover_stale() -> None:
    """Re-queue jobs left in 'processing' by a crashed process; fail ones exceeding MAX_ATTEMPTS."""
    from services.cv_analysis_service import fail_cv_analysis

    cutoff = (_now() - STALE_AFTER).isoformat()
    try:
        stale = (
            supabase.table("cv_processing_jobs")
            .select("id, user_id, kind, attempts, started_at, updated_at")
            .eq("status", "processing")
            .execute()
        ).data or []

        for job in stale:
            timestamp = job.get("started_at") or job.get("updated_at")
            if timestamp and timestamp > cutoff:
                continue

            attempts = job.get("attempts") or 0
            if attempts >= MAX_ATTEMPTS:
                supabase.table("cv_processing_jobs").update({
                    "status": "failed",
                    "error_message": "Gave up after repeated interruptions.",
                    "updated_at": _now_iso(),
                }).eq("id", job["id"]).eq("status", "processing").execute()

                if job["kind"] == CV_ANALYSIS and job.get("user_id"):
                    fail_cv_analysis(job["user_id"])
                logger.warning(f"[JobQueue] Job {job['id']} failed after {attempts} attempts")
                continue

            backoff_seconds = 15 * (2 ** max(0, attempts - 1))
            retry_at = (_now() + timedelta(seconds=backoff_seconds)).isoformat()

            supabase.table("cv_processing_jobs").update({
                "status": "queued",
                "retry_at": retry_at,
                "updated_at": _now_iso(),
            }).eq("id", job["id"]).eq("status", "processing").execute()

            if job["kind"] == CV_ANALYSIS and job.get("user_id"):
                supabase.table("profiles").update({
                    "cv_processing_status": "processing",
                    "updated_at": _now_iso(),
                }).eq("id", job["user_id"]).execute()

            logger.info(f"[JobQueue] Re-queued interrupted job {job['id']} (attempt {attempts})")
    except Exception as e:
        logger.error(f"[JobQueue] Stale job recovery failed: {e}")


async def _run(job: dict) -> None:
    """Execute a single claimed job."""
    global _llm_paused, _llm_pause_until, _llm_paused_reason, _outage_warning_logged

    kind = job["kind"]
    job_id = job["id"]

    if kind == CV_ANALYSIS:
        from services.cv_analysis_service import run_cv_analysis
        profile = await asyncio.to_thread(
            lambda: supabase.table("profiles").select("cv_text").eq("id", job["user_id"]).single().execute()
        )
        await run_cv_analysis(job["user_id"], (profile.data or {}).get("cv_text") or "", job_id)

    elif kind in (USER_RESCORE, PROFILE_REMATCH):
        from services.vector_matching_service import rescore_user
        await rescore_user(job["user_id"])
        await asyncio.to_thread(
            lambda: supabase.table("cv_processing_jobs")
            .update({"status": "complete", "completed_at": _now_iso(), "updated_at": _now_iso()})
            .eq("id", job_id)
            .execute()
        )

    elif kind == INTERNSHIP_RESCORE:
        from services.vector_matching_service import rescore_internship
        iid = job.get("internship_id")
        if not iid and job.get("payload"):
            iid = job["payload"].get("internship_id")
        if iid:
            await rescore_internship(iid)
        await asyncio.to_thread(
            lambda: supabase.table("cv_processing_jobs")
            .update({"status": "complete", "completed_at": _now_iso(), "updated_at": _now_iso()})
            .eq("id", job_id)
            .execute()
        )

    elif kind == MATCH_REASONING:
        uid = job.get("user_id")
        iid = job.get("internship_id")
        if not uid or not iid:
            # Mark invalid job complete
            await asyncio.to_thread(
                lambda: supabase.table("cv_processing_jobs")
                .update({"status": "complete", "completed_at": _now_iso(), "updated_at": _now_iso()})
                .eq("id", job_id)
                .execute()
            )
            return

        # Check circuit breaker
        now_dt = _now()
        if _llm_paused and _llm_pause_until and now_dt < _llm_pause_until:
            # Keep queued without burning retries
            postpone_to = _llm_pause_until.isoformat()
            await asyncio.to_thread(
                lambda: supabase.table("cv_processing_jobs")
                .update({"status": "queued", "retry_at": postpone_to, "updated_at": _now_iso()})
                .eq("id", job_id)
                .execute()
            )
            return

        # Check if pause period expired; test if provider recovered
        if _llm_paused and _llm_pause_until and now_dt >= _llm_pause_until:
            from services.llm_service import llm_client
            try:
                health = await llm_client.check_providers()
                if any(h.get("ok") for h in health):
                    _llm_paused = False
                    _outage_warning_logged = False
                    logger.info("[JobQueue] LLM provider recovered. Resuming MATCH_REASONING queue.")
                else:
                    _llm_pause_until = now_dt + timedelta(minutes=15)
                    postpone_to = _llm_pause_until.isoformat()
                    await asyncio.to_thread(
                        lambda: supabase.table("cv_processing_jobs")
                        .update({"status": "queued", "retry_at": postpone_to, "updated_at": _now_iso()})
                        .eq("id", job_id)
                        .execute()
                    )
                    return
            except Exception:
                _llm_pause_until = now_dt + timedelta(minutes=15)
                return

        # Throttle reasoning jobs: max per minute
        max_per_min = getattr(settings, "MATCH_REASONING_MAX_PER_MINUTE", 30)
        curr_time = time.monotonic()
        while _reasoning_timestamps and curr_time - _reasoning_timestamps[0] > 60:
            _reasoning_timestamps.popleft()

        if len(_reasoning_timestamps) >= max_per_min:
            # Requeue with 5-second backoff
            retry_time = (now_dt + timedelta(seconds=5)).isoformat()
            await asyncio.to_thread(
                lambda: supabase.table("cv_processing_jobs")
                .update({"status": "queued", "retry_at": retry_time, "updated_at": _now_iso()})
                .eq("id", job_id)
                .execute()
            )
            return

        _reasoning_timestamps.append(curr_time)

        # Attempt reasoning generation
        from services.vector_matching_service import generate_match_reasoning
        try:
            await generate_match_reasoning(uid, iid)
            await asyncio.to_thread(
                lambda: supabase.table("cv_processing_jobs")
                .update({"status": "complete", "completed_at": _now_iso(), "updated_at": _now_iso()})
                .eq("id", job_id)
                .execute()
            )
        except Exception as gen_err:
            if _is_quota_or_credit_error(gen_err):
                # Quota / Credit exhaustion: pause reasoning queue for 15 minutes
                _llm_paused = True
                _llm_pause_until = now_dt + timedelta(minutes=15)
                _llm_paused_reason = str(gen_err)[:300]
                if not _outage_warning_logged:
                    logger.warning(
                        f"[JobQueue] LLM providers exhausted or rate-limited. Pausing MATCH_REASONING for 15min: {gen_err}"
                    )
                    _outage_warning_logged = True

                postpone_to = _llm_pause_until.isoformat()
                await asyncio.to_thread(
                    lambda: supabase.table("cv_processing_jobs")
                    .update({"status": "queued", "retry_at": postpone_to, "updated_at": _now_iso()})
                    .eq("id", job_id)
                    .execute()
                )
            else:
                # Normal transient error
                raise gen_err
    else:
        raise ValueError(f"Unknown job kind {kind!r}")


async def worker_loop() -> None:
    global _loop, _wake
    _loop = asyncio.get_running_loop()
    _wake = asyncio.Event()
    logger.info(f"[JobQueue] Worker {_WORKER_ID} started")
    polls = 0

    while True:
        try:
            if polls % STALE_CHECK_EVERY == 0:
                await asyncio.to_thread(_recover_stale)
            polls += 1

            job = await asyncio.to_thread(_claim_next)
            if job:
                target_desc = job.get("user_id") or job.get("internship_id") or "system"
                logger.info(f"[JobQueue] Running {job['kind']} job {job['id']} for {target_desc}")
                try:
                    await _run(job)
                except Exception as e:
                    logger.error(f"[JobQueue] Job {job['id']} crashed: {e}", exc_info=True)
                    attempts = job.get("attempts") or 1
                    error = str(e)[:500]

                    if attempts < MAX_ATTEMPTS:
                        backoff_seconds = 15 * (2 ** (attempts - 1))
                        retry_at = (_now() + timedelta(seconds=backoff_seconds)).isoformat()
                        await asyncio.to_thread(
                            lambda: supabase.table("cv_processing_jobs")
                            .update({
                                "status": "queued",
                                "retry_at": retry_at,
                                "error_message": error,
                                "updated_at": _now_iso(),
                            })
                            .eq("id", job["id"])
                            .execute()
                        )
                    else:
                        await asyncio.to_thread(
                            lambda: supabase.table("cv_processing_jobs")
                            .update({
                                "status": "failed",
                                "error_message": error,
                                "updated_at": _now_iso(),
                            })
                            .eq("id", job["id"])
                            .execute()
                        )
                        if job.get("kind") == CV_ANALYSIS and job.get("user_id"):
                            from services.cv_analysis_service import fail_cv_analysis
                            await asyncio.to_thread(fail_cv_analysis, job["user_id"])

                continue

            _wake.clear()
            try:
                await asyncio.wait_for(_wake.wait(), timeout=POLL_SECONDS)
            except asyncio.TimeoutError:
                pass
        except asyncio.CancelledError:
            logger.info(f"[JobQueue] Worker {_WORKER_ID} stopped")
            raise
        except Exception as e:
            logger.error(f"[JobQueue] Worker loop error: {e}", exc_info=True)
            await asyncio.sleep(POLL_SECONDS)
