"""
Background CV analysis pipeline.

Upload returns as soon as the PDF text is extracted; everything slow happens
here: LLM parsing, profile auto-fill, embedding + matching. The student is
told when it finishes through profiles.cv_processing_status and an in-app
notification (the frontend shows it as a popup via Supabase realtime).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from core.db import supabase
from services.cv_parser_service import parse_cv_structured

logger = logging.getLogger(__name__)

CV_PAGE_LINK = "/dashboard/student/cv"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value, limit: int) -> str:
    return str(value or "").strip()[:limit].strip()


def _build_profile_fill(structured: dict, current: dict) -> dict:
    """Profile fields derived from the parsed CV. Only fills fields the student left empty."""
    update: dict = {}

    raw_skills = structured.get("skills")
    if raw_skills and not current.get("skills"):
        if isinstance(raw_skills, dict):
            raw_skills = [
                *(raw_skills.get("technical") or []),
                *(raw_skills.get("soft") or []),
                *(raw_skills.get("tools") or []),
            ]
        skills = list(dict.fromkeys(s.strip() for s in raw_skills if isinstance(s, str) and s.strip()))[:15]
        if skills:
            update["skills"] = skills

    raw_exp = structured.get("experience")
    if isinstance(raw_exp, list) and raw_exp and not current.get("experience"):
        experience = []
        for exp in raw_exp:
            if not isinstance(exp, dict):
                continue
            start, end = exp.get("start_date") or "", exp.get("end_date") or ""
            if not start and exp.get("duration"):
                parts = [p.strip() for p in str(exp["duration"]).split("-")]
                start = parts[0]
                end = parts[1] if len(parts) > 1 else end
            highlights = exp.get("highlights") or []
            item = {
                "company": _text(exp.get("organization") or exp.get("company"), 100),
                "role": _text(exp.get("title") or exp.get("role"), 100),
                "start_date": _text(start, 20),
                "end_date": _text(end, 20),
                "description": _text(exp.get("description") or ". ".join(map(str, highlights)), 500),
            }
            if item["company"] or item["role"]:
                experience.append(item)
        if experience:
            update["experience"] = experience

    raw_projects = structured.get("projects")
    if isinstance(raw_projects, list) and raw_projects and not current.get("projects"):
        projects = []
        for proj in raw_projects:
            if not isinstance(proj, dict):
                continue
            tech = proj.get("technologies") or []
            if isinstance(tech, str):
                tech = [t.strip() for t in tech.split(",")]
            item = {
                "title": _text(proj.get("name") or proj.get("title"), 100),
                "description": _text(proj.get("description"), 500),
                "technologies": [t.strip() for t in tech if isinstance(t, str) and t.strip()][:10],
                "github_url": _text(proj.get("github_url") or proj.get("url"), 500),
                "demo_url": _text(proj.get("demo_url"), 500),
            }
            if item["title"]:
                projects.append(item)
        if projects:
            update["projects"] = projects

    raw_certs = structured.get("certifications")
    if isinstance(raw_certs, list) and raw_certs and not current.get("certifications"):
        certs = [
            {
                "name": _text(c.get("name"), 100),
                "issuer": _text(c.get("issuer"), 100),
                "date": _text(c.get("date"), 20),
                "credential_url": _text(c.get("credential_url") or c.get("url"), 500),
            }
            for c in raw_certs
            if isinstance(c, dict) and _text(c.get("name"), 100)
        ]
        if certs:
            update["certifications"] = certs

    summary = structured.get("summary")
    if isinstance(summary, str) and summary.strip() and not current.get("bio"):
        update["bio"] = _text(summary, 300)

    contact = structured.get("contact")
    if isinstance(contact, dict) and not current.get("phone"):
        phone = contact.get("phone") or contact.get("phone_number")
        if isinstance(phone, str) and phone.strip():
            update["phone"] = _text(phone, 20)

    edu = structured.get("education")
    edu_list = edu if isinstance(edu, list) else [edu] if edu else []
    if edu_list and isinstance(edu_list[0], dict) and not current.get("course"):
        degree = edu_list[0].get("degree") or edu_list[0].get("course")
        if isinstance(degree, str) and degree.strip():
            update["course"] = _text(degree, 100)

    raw_langs = structured.get("languages")
    if isinstance(raw_langs, list) and raw_langs and not current.get("languages"):
        langs = []
        for lang in raw_langs:
            if isinstance(lang, str):
                lang = {"name": lang}
            if not isinstance(lang, dict):
                continue
            name = _text(lang.get("name") or lang.get("language"), 50)
            if name:
                langs.append({"name": name, "proficiency": _text(lang.get("proficiency") or lang.get("level") or "Intermediate", 20)})
        if langs:
            update["languages"] = langs

    return update


def _notify(user_id: str, type_: str, title: str, body: str) -> None:
    try:
        supabase.table("notifications").insert(
            {"user_id": user_id, "type": type_, "title": title, "body": body, "link": CV_PAGE_LINK}
        ).execute()
    except Exception as e:
        logger.warning(f"[CVAnalysis] Could not create notification for {user_id}: {e}")


def _finish_job(job_id: str | None, status: str, error: str | None = None) -> None:
    if not job_id:
        return
    try:
        update = {"status": status, "error_message": error, "updated_at": _now()}
        if status == "complete":
            update["completed_at"] = _now()
        supabase.table("cv_processing_jobs").update(update).eq("id", job_id).execute()
    except Exception as e:
        logger.warning(f"[CVAnalysis] Could not update job {job_id}: {e}")


def _set_status(user_id: str, status: str, error: str | None = None, extra: dict | None = None) -> None:
    update = {"cv_processing_status": status, "cv_processing_error": error, "updated_at": _now(), **(extra or {})}
    supabase.table("profiles").update(update).eq("id", user_id).execute()


async def run_cv_analysis(user_id: str, cv_text: str, job_id: str | None = None) -> None:
    """Parse the CV, auto-fill the profile, compute matches, then notify the student."""
    from routers.cv import process_matches_in_background  # avoid circular import

    try:
        cv_structured = await parse_cv_structured(cv_text)

        current = await asyncio.to_thread(
            lambda: supabase.table("profiles")
            .select("skills, experience, projects, certifications, bio, phone, course, languages")
            .eq("id", user_id)
            .single()
            .execute()
        )
        fill = _build_profile_fill(cv_structured or {}, current.data or {})
        await asyncio.to_thread(
            lambda: supabase.table("profiles")
            .update({"cv_structured": cv_structured, **fill, "updated_at": _now()})
            .eq("id", user_id)
            .execute()
        )

        # Matches from a previous CV would otherwise linger with stale scores.
        await asyncio.to_thread(
            lambda: supabase.table("match_results").delete().eq("user_id", user_id).execute()
        )
        if not await process_matches_in_background(user_id, cv_text, [], cv_structured):
            raise RuntimeError("Matching failed after retries")

        match_count = await asyncio.to_thread(
            lambda: supabase.table("match_results").select("id", count="exact").eq("user_id", user_id).execute()
        )
        n = match_count.count or 0

        await asyncio.to_thread(_set_status, user_id, "complete")
        await asyncio.to_thread(_finish_job, job_id, "complete")
        await asyncio.to_thread(
            _notify,
            user_id,
            "cv_analysis_complete",
            "Your CV analysis is ready",
            f"We found {n} internship match{'es' if n != 1 else ''} for you. Tap to see your results.",
        )
        logger.info(f"[CVAnalysis] Completed for {user_id} ({n} matches, filled {sorted(fill)})")
    except Exception as e:
        logger.error(f"[CVAnalysis] Failed for {user_id}: {e}", exc_info=True)
        message = "We couldn't finish analysing your CV. Please try uploading it again."
        try:
            await asyncio.to_thread(_set_status, user_id, "failed", message)
            await asyncio.to_thread(_finish_job, job_id, "failed", message)
        except Exception:
            logger.exception("[CVAnalysis] Could not record failure status")
        await asyncio.to_thread(_notify, user_id, "cv_analysis_failed", "CV analysis failed", message)
