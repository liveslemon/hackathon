"""
Backfill script: Compute and store embeddings for all existing internships
that don't have one yet. Run this once after deploying the migration.

Usage:
    python backfill_embeddings.py
"""

import asyncio
import logging
import os
import sys

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


async def backfill_internship_embeddings():
    from core.db import supabase
    from services.vector_matching_service import store_job_embedding

    # Fetch all internships without embeddings
    res = supabase.table("internships").select("*").is_("job_embedding", "null").execute()
    internships = res.data or []

    logger.info(f"Found {len(internships)} internships without embeddings")

    success = 0
    for i, job in enumerate(internships):
        try:
            await store_job_embedding(job["id"], job)
            success += 1
            logger.info(f"  [{i+1}/{len(internships)}] Done: {job.get('title', job['id'])}")
            # Small delay to avoid rate limits
            await asyncio.sleep(0.5)
        except Exception as e:
            logger.error(f"  [{i+1}/{len(internships)}] Failed: {job['id']} - {e}")

    logger.info(f"Backfill complete: {success}/{len(internships)} internships embedded")


async def backfill_profile_embeddings():
    from core.db import supabase
    from services.vector_matching_service import store_cv_embedding

    # Fetch profiles with CV text but no embedding
    res = (
        supabase.table("profiles")
        .select("id, cv_text")
        .eq("role", "student")
        .not_.is_("cv_text", "null")
        .is_("cv_embedding", "null")
        .execute()
    )
    profiles = res.data or []

    logger.info(f"Found {len(profiles)} profiles without CV embeddings")

    success = 0
    for i, profile in enumerate(profiles):
        cv_text = profile.get("cv_text", "")
        if not cv_text or len(cv_text.strip()) < 50:
            continue
        try:
            await store_cv_embedding(profile["id"], cv_text)
            success += 1
            logger.info(f"  [{i+1}/{len(profiles)}] Done: {profile['id']}")
            await asyncio.sleep(0.5)
        except Exception as e:
            logger.error(f"  [{i+1}/{len(profiles)}] Failed: {profile['id']} - {e}")

    logger.info(f"Backfill complete: {success}/{len(profiles)} profiles embedded")


async def main():
    logger.info("=== Backfilling internship embeddings ===")
    await backfill_internship_embeddings()

    logger.info("\n=== Backfilling profile embeddings ===")
    await backfill_profile_embeddings()

    logger.info("\nDone! Vector matching is now ready.")


if __name__ == "__main__":
    asyncio.run(main())
