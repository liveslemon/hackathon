import asyncio
import logging
import zoneinfo
from datetime import datetime, timezone

import resend
from core.config import settings
from core.db import supabase
from core.security import get_current_user
from core.rate_limit import rate_limit
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from schemas.requests import (
    ApplicationStatusUpdate,
    DraftCoverLetterRequest,
    SubmitApplicationRequest,
)
from services.routing_service import generate_cover_letter
from services.supabase_service import get_user_profile

router = APIRouter()
logger = logging.getLogger(__name__)


def is_internship_open(job: dict) -> bool:
    """Check if an internship is open based on status and Lagos deadline."""
    status = (job.get("status") or "").lower()
    if status in ("closed", "inactive", "draft", "filled", "archived"):
        return False
    deadline_str = job.get("deadline")
    if not deadline_str:
        return True
    try:
        lagos_tz = zoneinfo.ZoneInfo("Africa/Lagos")
    except Exception:
        lagos_tz = timezone.utc

    now_lagos = datetime.now(lagos_tz)
    try:
        clean = deadline_str.strip()
        if len(clean) == 10 and clean[4] == "-" and clean[7] == "-":
            d_year, d_month, d_day = [int(x) for x in clean.split("-")]
            deadline_dt = datetime(
                d_year, d_month, d_day, 23, 59, 59, 999999, tzinfo=lagos_tz
            )
        else:
            deadline_dt = datetime.fromisoformat(clean.replace("Z", "+00:00"))
            if deadline_dt.tzinfo is None:
                deadline_dt = deadline_dt.replace(tzinfo=lagos_tz)
            else:
                deadline_dt = deadline_dt.astimezone(lagos_tz)
        return now_lagos <= deadline_dt
    except Exception:
        return True


@router.post("/draft-cover-letter")
@router.post("/api/draft-cover-letter")
async def build_cover_letter(
    payload: DraftCoverLetterRequest,
    current_user=Depends(rate_limit("cover_letter", 10, 3600)),
):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        profile = await asyncio.to_thread(get_user_profile, payload.user_id)
        cv_text = profile.get("cv_text")
        if not cv_text:
            raise HTTPException(
                status_code=400, detail="No CV text found. Please upload a CV first."
            )

        job_res = await asyncio.to_thread(
            supabase.table("internships")
            .select("*")
            .eq("id", payload.internship_id)
            .maybe_single()
            .execute
        )
        if not job_res or not job_res.data:
            raise HTTPException(status_code=404, detail="Internship not found.")
        job = job_res.data

        if not is_internship_open(job):
            raise HTTPException(
                status_code=410,
                detail="This internship is closed or its application deadline has passed.",
            )

        user_email = "[email]"
        try:
            auth_user = await asyncio.to_thread(
                supabase.auth.admin.get_user_by_id, payload.user_id
            )
            if auth_user and auth_user.user:
                user_email = auth_user.user.email or "[email]"
        except Exception as auth_e:
            logger.warning(
                f"[Draft] Could not fetch auth email for {payload.user_id}: {auth_e}"
            )

        phone = profile.get("phone") or profile.get("phone_number") or ""

        cover_letter = await generate_cover_letter(
            student_name=profile.get("full_name", "Student"),
            user_email=user_email,
            profile_text=cv_text,
            job=job,
            existing_letter=payload.existing_letter,
            phone=phone,
        )
        return {"cover_letter": cover_letter}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/draft-cover-letter] Fatal: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail="Cover letter generation failed.")


@router.post("/draft-cover-letter-stream")
@router.post("/api/draft-cover-letter-stream")
async def build_cover_letter_stream(
    payload: DraftCoverLetterRequest,
    current_user=Depends(rate_limit("cover_letter", 10, 3600)),
):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")

    try:
        profile = await asyncio.to_thread(get_user_profile, payload.user_id)
        cv_text = profile.get("cv_text")
        if not cv_text:
            raise HTTPException(
                status_code=400, detail="No CV text found. Please upload a CV first."
            )

        job_res = await asyncio.to_thread(
            supabase.table("internships")
            .select("*")
            .eq("id", payload.internship_id)
            .maybe_single()
            .execute
        )
        if not job_res or not job_res.data:
            raise HTTPException(status_code=404, detail="Internship not found.")
        job = job_res.data

        if not is_internship_open(job):
            raise HTTPException(
                status_code=410,
                detail="This internship is closed or its application deadline has passed.",
            )

        user_email = "[email]"
        try:
            auth_user = await asyncio.to_thread(
                supabase.auth.admin.get_user_by_id, payload.user_id
            )
            if auth_user and auth_user.user:
                user_email = auth_user.user.email or "[email]"
        except Exception as auth_e:
            logger.warning(
                f"[Draft Stream] Could not fetch auth email for {payload.user_id}: {auth_e}"
            )

        from services.routing_service import generate_cover_letter_stream

        phone = profile.get("phone") or profile.get("phone_number") or ""

        async def stream_with_timeout(timeout: float = 60.0):
            try:
                deadline = asyncio.get_event_loop().time() + timeout
                async for chunk in generate_cover_letter_stream(
                    student_name=profile.get("full_name", "Student"),
                    user_email=user_email,
                    profile_text=cv_text,
                    job=job,
                    existing_letter=payload.existing_letter,
                    phone=phone,
                ):
                    if asyncio.get_event_loop().time() > deadline:
                        yield "\n\n[Generation timed out. Please try again.]"
                        return
                    yield chunk
            except (asyncio.CancelledError, GeneratorExit):
                logger.info(f"Cover letter stream cancelled for user {payload.user_id}")
                return
            except asyncio.TimeoutError:
                yield "\n\n[Generation timed out. Please try again.]"

        return StreamingResponse(stream_with_timeout(), media_type="text/plain")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/draft-cover-letter-stream] Fatal: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail="Cover letter stream failed.")


@router.post("/submit-application")
@router.post("/api/submit-application")
def submit_app(
    payload: SubmitApplicationRequest, current_user=Depends(get_current_user)
):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        logger.info(
            f"[SubmitApp] {payload.user_id} applying for {payload.internship_id}"
        )

        student = get_user_profile(payload.user_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found.")

        # Check CV presence
        has_cv = bool(
            student.get("cv_text")
            or student.get("cv_url")
            or student.get("resume_url")
        )
        if not has_cv:
            cv_row = (
                supabase.table("student_cvs")
                .select("id")
                .eq("user_id", payload.user_id)
                .maybe_single()
                .execute()
            )
            if cv_row and cv_row.data:
                has_cv = True

        if not has_cv:
            raise HTTPException(
                status_code=400,
                detail="No CV found. Please upload a CV before applying.",
            )

        job_query = (
            supabase.table("internships")
            .select("*")
            .eq("id", payload.internship_id)
            .maybe_single()
            .execute()
        )
        if not job_query or not job_query.data:
            raise HTTPException(status_code=404, detail="Internship not found.")
        job = job_query.data

        if not is_internship_open(job):
            raise HTTPException(
                status_code=410,
                detail="This internship is closed or its application deadline has passed.",
            )

        score_query = (
            supabase.table("match_results")
            .select("match_score")
            .eq("user_id", payload.user_id)
            .eq("internship_id", payload.internship_id)
            .maybe_single()
            .execute()
        )
        match_score = (
            score_query.data.get("match_score", 0)
            if (score_query and score_query.data)
            else 0
        )

        existing = (
            supabase.table("applied_internships")
            .select("id")
            .eq("user_id", payload.user_id)
            .eq("internship_id", payload.internship_id)
            .maybe_single()
            .execute()
        )
        if existing and existing.data:
            raise HTTPException(
                status_code=409,
                detail="You have already applied to this internship.",
            )

        try:
            supabase.table("applied_internships").insert(
                {
                    "user_id": payload.user_id,
                    "internship_id": payload.internship_id,
                    "cover_letter": payload.cover_letter,
                    "status": "pending",
                    "stage": "applied",
                    "match_score": match_score,
                }
            ).execute()
        except Exception as insert_e:
            err_str = str(insert_e).lower()
            if "23505" in err_str or "duplicate" in err_str or "unique" in err_str:
                raise HTTPException(
                    status_code=409,
                    detail="You have already applied to this internship.",
                )
            raise

        employer_id = job.get("employer_id") or job.get("poster_id")
        if employer_id:
            try:
                supabase.table("notifications").insert(
                    {
                        "user_id": employer_id,
                        "type": "new_application",
                        "title": "New Application Received",
                        "body": f"{student.get('full_name', 'A student')} applied for {job.get('role', 'an internship')}.",
                        "link": f"/dashboard/employer/internships/{payload.internship_id}",
                        "metadata": {
                            "internship_id": payload.internship_id,
                            "student_id": payload.user_id,
                        },
                    }
                ).execute()
            except Exception as notif_e:
                logger.warning(f"[SubmitApp] Notification insert warning: {notif_e}")

        if settings.RESEND_API_KEY:
            try:
                resend.api_key = settings.RESEND_API_KEY
                student_name = student.get("full_name", "Student")
                job_role = job.get("role", "Internship")
                target_email = job.get("employer_email")
                if not target_email and employer_id:
                    emp_prof = (
                        supabase.table("profiles")
                        .select("email")
                        .eq("id", employer_id)
                        .maybe_single()
                        .execute()
                    )
                    if emp_prof and emp_prof.data:
                        target_email = emp_prof.data.get("email")

                if target_email:
                    cv_url = student.get("cv_url", "")
                    cv_link_text = (
                        f"\n\nView Student CV: {cv_url}" if cv_url else ""
                    )
                    reply_to = (
                        payload.student_email
                        or student.get("email")
                        or "noreply@pau.edu.ng"
                    )
                    params = {
                        "from": settings.RESEND_FROM_EMAIL,
                        "to": [target_email],
                        "reply_to": reply_to,
                        "subject": f"Application: {job_role} - {student_name}",
                        "text": (
                            f"A student has applied for {job_role}.\n\n"
                            f"Name: {student_name}\nMatch Score: {match_score}%\n\n"
                            f"Cover Letter:\n{payload.cover_letter}{cv_link_text}"
                        ),
                    }
                    resend.Emails.send(params)
                    logger.info("Email sent via Resend.")
            except Exception as email_e:
                logger.error(f"[Resend] Failed: {email_e}", exc_info=True)

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/submit-application] Fatal: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Application submission failed.")


def _assert_can_manage_internship(internship_id: str, user_id: str, detail: str):
    """Raise unless the user posted the internship, is the employer, or is an admin. Fails closed."""
    internship_res = (
        supabase.table("internships")
        .select("poster_id, employer_id")
        .eq("id", internship_id)
        .maybe_single()
        .execute()
    )
    if not internship_res or not internship_res.data:
        raise HTTPException(status_code=404, detail="Internship not found.")

    poster_id = internship_res.data.get("poster_id")
    employer_id = internship_res.data.get("employer_id")
    if user_id in (poster_id, employer_id) and user_id is not None:
        return

    profile = (
        supabase.table("profiles")
        .select("is_admin, role")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    is_admin = (
        profile
        and profile.data
        and (
            profile.data.get("is_admin") is True
            or profile.data.get("role") == "admin"
        )
    )
    if not is_admin:
        raise HTTPException(status_code=403, detail=detail)


@router.put("/applications/{app_id}/status")
@router.put("/api/applications/{app_id}/status")
def update_status(
    app_id: str,
    payload: ApplicationStatusUpdate,
    current_user=Depends(get_current_user),
):
    """Update application status. Only the internship's employer can do this."""
    try:
        # Fetch application and verify employer ownership
        app_res = (
            supabase.table("applied_internships")
            .select("id, internship_id")
            .eq("id", app_id)
            .maybe_single()
            .execute()
        )
        if not app_res or not app_res.data:
            raise HTTPException(status_code=404, detail="Application not found.")

        _assert_can_manage_internship(
            app_res.data["internship_id"],
            current_user.id,
            "Not authorized to update this application.",
        )

        supabase.table("applied_internships").update(
            {"status": payload.status.value}
        ).eq("id", app_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating application status: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to update application status."
        )


@router.get("/internships/{internship_id}/applicants")
@router.get("/api/internships/{internship_id}/applicants")
def get_applicants(
    internship_id: str,
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    try:
        _assert_can_manage_internship(
            internship_id, current_user.id, "Not authorized to view these applicants."
        )
        offset = (page - 1) * page_size
        res = (
            supabase.table("applied_internships")
            .select(
                "id, user_id, status, match_score, cover_letter, created_at, profiles:profiles!user_id(id, full_name, course, level, cv_url)"
            )
            .eq("internship_id", internship_id)
            .order("match_score", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        return {"applicants": res.data or [], "page": page, "page_size": page_size}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching applicants: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch applicants.")


@router.get("/applications/student")
@router.get("/api/applications/student")
def get_student_applications(
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    try:
        offset = (page - 1) * page_size
        res = (
            supabase.table("applied_internships")
            .select(
                "id, status, stage, match_score, created_at, internships(id, role, company)"
            )
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        return {"applications": res.data or [], "page": page, "page_size": page_size}
    except Exception as e:
        logger.error(f"Error fetching student applications: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch applications.")
