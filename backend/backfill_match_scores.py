"""
Backfill script for match scores redesign.
Enqueues USER_RESCORE for every student who has an embedding or enough profile signal.
Batched and safe to re-run (idempotent due to job queue deduplication).
"""
import sys
import logging
from typing import List, Dict, Any

from core.db import supabase
from services.job_queue import enqueue, JobKind

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backfill_match_scores")

BATCH_SIZE = 100


def get_eligible_students(batch_size: int = BATCH_SIZE, offset: int = 0) -> List[Dict[str, Any]]:
    """
    Fetch a page of students who have an embedding or profile signal
    (skills, bio, course, etc.) with role='student' or null role.
    """
    res = (
        supabase.table("profiles")
        .select("id, role, skills, course, experience, projects, embedding")
        .range(offset, offset + batch_size - 1)
        .execute()
    )
    return res.data or []


def has_profile_signal(student: Dict[str, Any]) -> bool:
    """Determine if student has sufficient signal to score."""
    if student.get("embedding"):
        return True
    skills = student.get("skills")
    if skills and (isinstance(skills, list) and len(skills) > 0 or isinstance(skills, str) and skills.strip()):
        return True
    if student.get("experience") or student.get("projects"):
        return True
    return False


def run_backfill(limit: int = None, dry_run: bool = False):
    logger.info("Starting match scores backfill...")
    offset = 0
    total_enqueued = 0
    total_skipped = 0

    while True:
        students = get_eligible_students(BATCH_SIZE, offset)
        if not students:
            break

        for student in students:
            role = student.get("role")
            if role and role != "student":
                continue

            user_id = student.get("id")
            if not user_id:
                continue

            if has_profile_signal(student):
                if not dry_run:
                    job = enqueue(
                        kind=JobKind.USER_RESCORE,
                        subject=user_id,
                        user_id=user_id,
                        priority=1,  # Lower priority for backfill so live requests take precedence
                        payload={"trigger": "backfill"},
                    )
                    if job:
                        total_enqueued += 1
                        logger.debug(f"Enqueued USER_RESCORE for user {user_id}")
                    else:
                        logger.debug(f"User {user_id} already had a queued job; deduplicated.")
                else:
                    total_enqueued += 1
            else:
                total_skipped += 1

            if limit and (total_enqueued + total_skipped) >= limit:
                break

        offset += len(students)
        logger.info(f"Processed {offset} profiles so far (enqueued: {total_enqueued}, skipped: {total_skipped})")
        if limit and (total_enqueued + total_skipped) >= limit:
            break

    logger.info(
        f"Backfill finished. Total enqueued: {total_enqueued}, skipped (no signal/non-student): {total_skipped}"
    )


if __name__ == "__main__":
    dry_run_arg = "--dry-run" in sys.argv
    run_backfill(dry_run=dry_run_arg)
