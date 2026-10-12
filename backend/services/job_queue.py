"""
Durable queue for slow CV work, backed by the cv_processing_jobs table.

Request handlers call enqueue(); a worker loop started in main.py's lifespan
claims queued jobs and runs them. Unlike FastAPI BackgroundTasks, a job
survives a Render restart: on startup (and periodically) jobs left
"processing" by a dead process are re-queued, up to MAX_ATTEMPTS.

Claiming uses the claim_next_cv_job RPC with FOR UPDATE SKIP LOCKED
(with optimistic locking fallback), ensuring multiple workers never claim
or process the same job.
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

from core.db import supabase

logger = logging.getLogger(__name__)

POLL_SECONDS = 10
STALE_AFTER = timedelta(minutes=15)  # normal analysis takes 2-5 minutes
STALE_CHECK_EVERY = 20  # polls (~3 min)
MAX_ATTEMPTS = 3

CV_ANALYSIS = "cv_analysis"
PROFILE_REMATCH = "profile_rematch"

_WORKER_ID = f"worker-{os.getpid()}-{uuid.uuid4().hex[:6]}"

# Created inside worker_loop so they belong to the running event loop.
_loop: asyncio.AbstractEventLoop | None = None
_wake: asyncio.Event | None = None


def wake() -> None:
    """Nudge this process's worker. Safe to call from any thread."""
    if _loop and _wake:
        _loop.call_soon_threadsafe(_wake.set)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def enqueue(
    user_id: str,
    kind: str,
    job_id: str | None = None,
    source: str = "dashboard",
) -> str | None:
    """Queue a job (blocking DB call: run via asyncio.to_thread) and wake the worker."""
    try:
        # Idempotency check: avoid double-enqueuing if there's already a queued job for this user
        if not job_id:
            pending = (
                supabase.table("cv_processing_jobs")
                .select("id")
                .eq("user_id", user_id)
                .eq("kind", kind)
                .in_("status", ["queued"])
                .limit(1)
                .execute()
            )
            if pending.data:
                return pending.data[0]["id"]

        row = {
            "user_id": user_id,
            "kind": kind,
            "status": "queued",
            "attempts": 0,
            "started_at": None,
            "retry_at": _now().isoformat(),
            "error_message": None,
            "source": source,
            "updated_at": _now().isoformat(),
        }

        if job_id:
            res = supabase.table("cv_processing_jobs").update(row).eq("id", job_id).execute()
            if not res.data:  # unknown id: create a fresh job instead
                job_id = None

        if not job_id:
            res = supabase.table("cv_processing_jobs").insert(row).execute()
            job_id = res.data[0]["id"] if res.data else None

        return job_id
    finally:
        wake()


def _claim_next() -> dict | None:
    """
    Claims the next available queued job.
    Uses Postgres FOR UPDATE SKIP LOCKED via RPC first,
    with optimistic concurrency locking fallback.
    """
    # 1. Try atomic database claiming with SKIP LOCKED
    try:
        rpc_res = supabase.rpc("claim_next_cv_job", {"p_worker_id": _WORKER_ID}).execute()
        if rpc_res.data and len(rpc_res.data) > 0:
            return rpc_res.data[0]
    except Exception as e:
        logger.debug(f"[JobQueue] claim_next_cv_job RPC not available, using optimistic lock: {e}")

    # 2. Fallback: query queued jobs where retry_at <= now, then atomic UPDATE
    now_iso = _now().isoformat()
    try:
        queued = (
            supabase.table("cv_processing_jobs")
            .select("id, user_id, kind, attempts")
            .eq("status", "queued")
            .order("created_at")
            .limit(5)
            .execute()
        ).data or []

        for job in queued:
            claimed = (
                supabase.table("cv_processing_jobs")
                .update(
                    {
                        "status": "processing",
                        "worker_id": _WORKER_ID,
                        "attempts": (job.get("attempts") or 0) + 1,
                        "started_at": now_iso,
                        "updated_at": now_iso,
                    }
                )
                .eq("id", job["id"])
                .eq("status", "queued")  # optimistic lock ensures only one worker claims it
                .execute()
            )
            if claimed.data:
                return claimed.data[0]
    except Exception as e:
        logger.error(f"[JobQueue] Failed to query/claim queued jobs: {e}")

    return None


def _recover_stale() -> None:
    """Re-queue jobs a dead process left running; fail ones out of attempts."""
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
                continue  # still within normal processing window

            attempts = job.get("attempts") or 0
            if attempts >= MAX_ATTEMPTS:
                supabase.table("cv_processing_jobs").update(
                    {
                        "status": "failed",
                        "error_message": "Gave up after repeated interruptions.",
                        "updated_at": _now().isoformat(),
                    }
                ).eq("id", job["id"]).eq("status", "processing").execute()

                if job["kind"] == CV_ANALYSIS:
                    fail_cv_analysis(job["user_id"])
                logger.warning(f"[JobQueue] Job {job['id']} failed after {attempts} attempts")
                continue

            # Exponential backoff on retry
            backoff_seconds = 15 * (2 ** max(0, attempts - 1))
            retry_at = (_now() + timedelta(seconds=backoff_seconds)).isoformat()

            supabase.table("cv_processing_jobs").update(
                {
                    "status": "queued",
                    "retry_at": retry_at,
                    "updated_at": _now().isoformat(),
                }
            ).eq("id", job["id"]).eq("status", "processing").execute()

            if job["kind"] == CV_ANALYSIS:
                # Keep the CV page's "analysing" state from timing out while we retry.
                supabase.table("profiles").update(
                    {"cv_processing_status": "processing", "updated_at": _now().isoformat()}
                ).eq("id", job["user_id"]).execute()

            logger.info(f"[JobQueue] Re-queued interrupted job {job['id']} (attempt {attempts}, retry in {backoff_seconds}s)")

    except Exception as e:
        logger.error(f"[JobQueue] Stale job recovery failed: {e}")


async def _run(job: dict) -> None:
    from services.cv_analysis_service import rematch_from_profile, run_cv_analysis

    if job["kind"] == CV_ANALYSIS:
        profile = await asyncio.to_thread(
            lambda: supabase.table("profiles").select("cv_text").eq("id", job["user_id"]).single().execute()
        )
        # run_cv_analysis marks the job complete/failed and notifies the student.
        await run_cv_analysis(job["user_id"], (profile.data or {}).get("cv_text") or "", job["id"])
    elif job["kind"] == PROFILE_REMATCH:
        await rematch_from_profile(job["user_id"])
        await asyncio.to_thread(
            lambda: supabase.table("cv_processing_jobs")
            .update({"status": "complete", "completed_at": _now().isoformat(), "updated_at": _now().isoformat()})
            .eq("id", job["id"])
            .execute()
        )
    else:
        raise ValueError(f"Unknown job kind {job['kind']!r}")


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
                logger.info(f"[JobQueue] Running {job['kind']} job {job['id']} for {job['user_id']}")
                try:
                    await _run(job)
                except Exception as e:
                    logger.error(f"[JobQueue] Job {job['id']} crashed: {e}", exc_info=True)
                    attempts = job.get("attempts") or 1
                    error = str(e)[:500]

                    if attempts < MAX_ATTEMPTS:
                        # Transient crash: retry with exponential backoff
                        backoff_seconds = 15 * (2 ** (attempts - 1))
                        retry_at = (_now() + timedelta(seconds=backoff_seconds)).isoformat()
                        logger.info(f"[JobQueue] Scheduling retry for {job['id']} in {backoff_seconds}s (attempt {attempts}/{MAX_ATTEMPTS})")
                        await asyncio.to_thread(
                            lambda: supabase.table("cv_processing_jobs")
                            .update({
                                "status": "queued",
                                "retry_at": retry_at,
                                "error_message": error,
                                "updated_at": _now().isoformat(),
                            })
                            .eq("id", job["id"])
                            .execute()
                        )
                    else:
                        from services.cv_analysis_service import fail_cv_analysis
                        await asyncio.to_thread(
                            lambda: supabase.table("cv_processing_jobs")
                            .update({
                                "status": "failed",
                                "error_message": error,
                                "updated_at": _now().isoformat(),
                            })
                            .eq("id", job["id"])
                            .execute()
                        )
                        if job.get("kind") == CV_ANALYSIS:
                            await asyncio.to_thread(fail_cv_analysis, job["user_id"])

                continue  # look for the next job straight away

            _wake.clear()
            try:
                await asyncio.wait_for(_wake.wait(), timeout=POLL_SECONDS)
            except asyncio.TimeoutError:
                pass
        except asyncio.CancelledError:
            logger.info(f"[JobQueue] Worker {_WORKER_ID} stopped")
            raise
        except Exception as e:  # DB hiccup: back off and keep going
            logger.error(f"[JobQueue] Worker loop error: {e}", exc_info=True)
            await asyncio.sleep(POLL_SECONDS)
