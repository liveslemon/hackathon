"""
Durable queue for slow CV work, backed by the cv_processing_jobs table.

Request handlers call enqueue(); a worker loop started in main.py's lifespan
claims queued jobs and runs them. Unlike FastAPI BackgroundTasks, a job
survives a Render restart: on startup (and periodically) jobs left
"processing" by a dead process are re-queued, up to MAX_ATTEMPTS.

Claiming is an UPDATE ... WHERE status = 'queued', so with several uvicorn
workers only one of them gets each job.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from core.db import supabase

logger = logging.getLogger(__name__)

POLL_SECONDS = 10
STALE_AFTER = timedelta(minutes=15)  # normal analysis takes 2-5 minutes
STALE_CHECK_EVERY = 20  # polls (~3 min)
MAX_ATTEMPTS = 3

CV_ANALYSIS = "cv_analysis"
PROFILE_REMATCH = "profile_rematch"

# Created inside worker_loop so they belong to the running event loop.
_loop: asyncio.AbstractEventLoop | None = None
_wake: asyncio.Event | None = None


def wake() -> None:
    """Nudge this process's worker. Safe to call from any thread."""
    if _loop and _wake:
        _loop.call_soon_threadsafe(_wake.set)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def enqueue(user_id: str, kind: str, job_id: str | None = None, source: str = "dashboard") -> str | None:
    """Queue a job (blocking DB call: run via asyncio.to_thread) and wake the worker."""
    try:
        if kind == PROFILE_REMATCH:
            pending = (
                supabase.table("cv_processing_jobs")
                .select("id")
                .eq("user_id", user_id)
                .in_("kind", [PROFILE_REMATCH, CV_ANALYSIS])
                .in_("status", ["queued"])
                .limit(1)
                .execute()
            )
            if pending.data:  # a queued job will pick up the latest profile anyway
                return pending.data[0]["id"]
        row = {
            "user_id": user_id,
            "kind": kind,
            "status": "queued",
            "attempts": 0,
            "started_at": None,
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
                    "attempts": (job.get("attempts") or 0) + 1,
                    "started_at": _now().isoformat(),
                    "updated_at": _now().isoformat(),
                }
            )
            .eq("id", job["id"])
            .eq("status", "queued")  # another worker may have taken it
            .execute()
        )
        if claimed.data:
            return claimed.data[0]
    return None


def _recover_stale() -> None:
    """Re-queue jobs a dead process left running; fail ones out of attempts."""
    from services.cv_analysis_service import fail_cv_analysis

    cutoff = (_now() - STALE_AFTER).isoformat()
    stale = (
        supabase.table("cv_processing_jobs")
        .select("id, user_id, kind, attempts")
        .eq("status", "processing")
        .lt("started_at", cutoff)
        .execute()
    ).data or []
    for job in stale:
        if (job.get("attempts") or 0) >= MAX_ATTEMPTS:
            supabase.table("cv_processing_jobs").update(
                {"status": "failed", "error_message": "Gave up after repeated interruptions.", "updated_at": _now().isoformat()}
            ).eq("id", job["id"]).eq("status", "processing").execute()
            if job["kind"] == CV_ANALYSIS:
                fail_cv_analysis(job["user_id"])
            logger.warning(f"[JobQueue] Job {job['id']} failed after {job['attempts']} attempts")
            continue
        supabase.table("cv_processing_jobs").update(
            {"status": "queued", "updated_at": _now().isoformat()}
        ).eq("id", job["id"]).eq("status", "processing").execute()
        if job["kind"] == CV_ANALYSIS:
            # Keep the CV page's "analysing" state from timing out while we retry.
            supabase.table("profiles").update(
                {"cv_processing_status": "processing", "updated_at": _now().isoformat()}
            ).eq("id", job["user_id"]).execute()
        logger.info(f"[JobQueue] Re-queued interrupted job {job['id']} (attempt {job.get('attempts')})")


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
    logger.info("[JobQueue] Worker started")
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
                    error = str(e)[:500]
                    await asyncio.to_thread(
                        lambda: supabase.table("cv_processing_jobs")
                        .update({"status": "failed", "error_message": error, "updated_at": _now().isoformat()})
                        .eq("id", job["id"])
                        .execute()
                    )
                continue  # look for the next job straight away
            _wake.clear()
            try:
                await asyncio.wait_for(_wake.wait(), timeout=POLL_SECONDS)
            except asyncio.TimeoutError:
                pass
        except asyncio.CancelledError:
            logger.info("[JobQueue] Worker stopped")
            raise
        except Exception as e:  # DB hiccup: back off and keep going
            logger.error(f"[JobQueue] Worker loop error: {e}", exc_info=True)
            await asyncio.sleep(POLL_SECONDS)
