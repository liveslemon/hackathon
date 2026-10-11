"""
Re-run CV analysis for students who have CV text but no parsed CV
(cv_structured), e.g. uploads from before parsing existed. Their matching
only uses semantic similarity until this runs.

    python backfill_cv_analysis.py           # dry run: list affected students
    python backfill_cv_analysis.py --apply   # parse, re-match and notify each

--apply recomputes each student's matches and sends them the in-app
"Your CV analysis is ready" notification.
"""

import asyncio
import sys

from core.db import supabase
from services.cv_analysis_service import run_cv_analysis


def find_students() -> list[dict]:
    res = (
        supabase.table("profiles")
        .select("id, full_name, cv_text, cv_structured")
        .eq("role", "student")
        .not_.is_("cv_text", "null")
        .execute()
    )
    return [p for p in res.data or [] if (p.get("cv_text") or "").strip() and not p.get("cv_structured")]


async def main(apply: bool) -> None:
    students = find_students()
    print(f"{len(students)} student(s) with a CV but no parsed data:")
    for s in students:
        print(f"  - {s.get('full_name') or '(no name)'} ({s['id']}), {len(s['cv_text'])} chars")
    if not apply:
        print("\nDry run. Re-run with --apply to analyse them.")
        return
    for s in students:
        print(f"Analysing {s['id']} ...", flush=True)
        await run_cv_analysis(s["id"], s["cv_text"])
        # Stay well under free-tier LLM rate limits.
        await asyncio.sleep(5)
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main("--apply" in sys.argv))
