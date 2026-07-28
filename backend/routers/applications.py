import logging
import resend
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from core.config import settings
from core.security import get_current_user
from core.db import supabase
from schemas.requests import DraftCoverLetterRequest, SubmitApplicationRequest, ApplicationStatusUpdate
from services.supabase_service import get_user_profile
from services.routing_service import generate_cover_letter

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/draft-cover-letter")
@router.post("/api/draft-cover-letter")
async def build_cover_letter(payload: DraftCoverLetterRequest, current_user=Depends(get_current_user)):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        profile = get_user_profile(payload.user_id)
        cv_text = profile.get("cv_text")
        if not cv_text:
            raise HTTPException(status_code=400, detail="No CV text found. Please upload a CV first.")

        job_res = supabase.table("internships").select("*").eq("id", payload.internship_id).maybe_single().execute()
        if not job_res or not job_res.data:
            raise HTTPException(status_code=404, detail="Internship not found.")
        job = job_res.data

        user_email = "[email]"
        try:
            auth_user = supabase.auth.admin.get_user_by_id(payload.user_id)
            if auth_user and auth_user.user:
                user_email = auth_user.user.email or "[email]"
        except Exception as auth_e:
            logger.warning(f"[Draft] Could not fetch auth email for {payload.user_id}: {auth_e}")

        cover_letter = await generate_cover_letter(
            student_name=profile.get("full_name", "Student"),
            user_email=user_email,
            profile_text=cv_text,
            job=job,
            existing_letter=payload.existing_letter,
        )
        return {"cover_letter": cover_letter}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/draft-cover-letter] Fatal: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail="Cover letter generation failed.")


@router.post("/draft-cover-letter-stream")
@router.post("/api/draft-cover-letter-stream")
async def build_cover_letter_stream(payload: DraftCoverLetterRequest, current_user=Depends(get_current_user)):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")

    try:
        profile = get_user_profile(payload.user_id)
        cv_text = profile.get("cv_text")
        if not cv_text:
            raise HTTPException(status_code=400, detail="No CV text found. Please upload a CV first.")

        job_res = supabase.table("internships").select("*").eq("id", payload.internship_id).maybe_single().execute()
        if not job_res or not job_res.data:
            raise HTTPException(status_code=404, detail="Internship not found.")
        job = job_res.data

        user_email = "[email]"
        try:
            auth_user = supabase.auth.admin.get_user_by_id(payload.user_id)
            if auth_user and auth_user.user:
                user_email = auth_user.user.email or "[email]"
        except Exception as auth_e:
            logger.warning(f"[Draft Stream] Could not fetch auth email for {payload.user_id}: {auth_e}")

        from services.routing_service import generate_cover_letter_stream
        import asyncio

        async def stream_with_timeout(timeout: float = 60.0):
            try:
                deadline = asyncio.get_event_loop().time() + timeout
                async for chunk in generate_cover_letter_stream(
                    student_name=profile.get("full_name", "Student"),
                    user_email=user_email,
                    profile_text=cv_text,
                    job=job,
                    existing_letter=payload.existing_letter,
                ):
                    if asyncio.get_event_loop().time() > deadline:
                        yield "\n\n[Generation timed out. Please try again.]"
                        return
                    yield chunk
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
def submit_app(payload: SubmitApplicationRequest, current_user=Depends(get_current_user)):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        logger.info(f"[SubmitApp] {payload.user_id} applying for {payload.internship_id}")

        student = get_user_profile(payload.user_id)
        job_query = supabase.table("internships").select("*").eq("id", payload.internship_id).execute()
        if not job_query.data:
            raise HTTPException(status_code=404, detail="Internship not found.")
        job = job_query.data[0]

        score_query = (
            supabase.table("match_results")
            .select("match_score")
            .eq("user_id", payload.user_id)
            .eq("internship_id", payload.internship_id)
            .execute()
        )
        match_score = score_query.data[0].get("match_score", 0) if score_query.data else 0

        # Use upsert with on_conflict to prevent race-condition duplicates
        existing = (
            supabase.table("applied_internships")
            .select("id")
            .eq("user_id", payload.user_id)
            .eq("internship_id", payload.internship_id)
            .execute()
        )
        if existing.data:
            return {"success": True, "message": "Already applied."}

        supabase.table("applied_internships").insert(
            {
                "user_id": payload.user_id,
                "internship_id": payload.internship_id,
                "cover_letter": payload.cover_letter,
                "status": "pending",
                "match_score": match_score,
            }
        ).execute()

        if not settings.RESEND_API_KEY:
            logger.warning("[SubmitApp] RESEND_API_KEY not found. Skipping email.")
        else:
            try:
                resend.api_key = settings.RESEND_API_KEY
                student_name = student.get("full_name", "Student")
                job_role = job.get("role", "Internship")
                target_email = job.get("employer_email") or "noreply@pau.edu.ng"

                cv_url = student.get("cv_url", "")
                cv_link_text = f"\n\nView Student CV: {cv_url}" if cv_url else ""

                reply_to = payload.student_email or student.get("email") or "noreply@pau.edu.ng"

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


@router.put("/applications/{app_id}/status")
@router.put("/api/applications/{app_id}/status")
def update_status(app_id: str, payload: ApplicationStatusUpdate, current_user=Depends(get_current_user)):
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

        # Verify the current user owns the internship
        internship_res = (
            supabase.table("internships")
            .select("poster_id")
            .eq("id", app_res.data["internship_id"])
            .maybe_single()
            .execute()
        )
        if internship_res and internship_res.data:
            if internship_res.data.get("poster_id") != current_user.id:
                # Also allow admin
                profile = supabase.table("profiles").select("is_admin, role").eq("id", current_user.id).maybe_single().execute()
                is_admin = profile and profile.data and (profile.data.get("is_admin") is True or profile.data.get("role") == "admin")
                if not is_admin:
                    raise HTTPException(status_code=403, detail="Not authorized to update this application.")

        supabase.table("applied_internships").update({"status": payload.status.value}).eq("id", app_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating application status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update application status.")


@router.get("/internships/{internship_id}/applicants")
@router.get("/api/internships/{internship_id}/applicants")
def get_applicants(
    internship_id: str,
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    try:
        offset = (page - 1) * page_size
        res = (
            supabase.table("applied_internships")
            .select("id, user_id, status, match_score, cover_letter, created_at, profiles(id, full_name, course, level, cv_url)")
            .eq("internship_id", internship_id)
            .order("match_score", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        return {"applicants": res.data or [], "page": page, "page_size": page_size}
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
            .select("id, status, match_score, created_at, internships(id, role, company)")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        return {"applications": res.data or [], "page": page, "page_size": page_size}
    except Exception as e:
        logger.error(f"Error fetching student applications: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch applications.")
