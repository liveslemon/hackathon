import logging
import resend
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from backend.core.config import settings
from backend.core.security import get_current_user
from backend.core.db import supabase
from backend.schemas.requests import DraftCoverLetterRequest, SubmitApplicationRequest, ApplicationStatusUpdate
from backend.services.supabase_service import get_user_profile
from backend.services.routing_service import generate_cover_letter

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/draft-cover-letter")
@router.post("/api/draft-cover-letter")
async def build_cover_letter(payload: DraftCoverLetterRequest, current_user = Depends(get_current_user)):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        profile = get_user_profile(payload.user_id)
        cv_text = profile.get("cv_text")
        if not cv_text: return JSONResponse({"error": "No CV text"}, status_code=400)
            
        job_res = supabase.table("internships").select("*").eq("id", payload.internship_id).single().execute()
        job = job_res.data
        if not job: return JSONResponse({"error": "Not found"}, status_code=404)

        user_email = "[email]"
        try:
            auth_user = supabase.auth.admin.get_user_by_id(payload.user_id)
            if auth_user and auth_user.user:
                user_email = auth_user.user.email or "[email]"
        except Exception as auth_e:
            logger.warning(f"[Draft] Could not fetch auth email for {payload.user_id}: {auth_e}")

        cover_letter = await generate_cover_letter(
            student_name=profile.get('full_name', 'Student'),
            user_email=user_email,
            profile_text=cv_text,
            job=job,
            existing_letter=payload.existing_letter
        )

        return {"cover_letter": cover_letter}
    except Exception as e:
        logger.error(f"[/draft-cover-letter] Fatal: {e}")
        return JSONResponse({"error": "Drafting failed."}, status_code=500)

@router.post("/submit-application")
@router.post("/api/submit-application")
def submit_app(payload: SubmitApplicationRequest, current_user = Depends(get_current_user)):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        logger.info(f"[SubmitApp] {payload.user_id} applying for {payload.internship_id}")
        
        student = get_user_profile(payload.user_id)
        job_query = supabase.table("internships").select("*").eq("id", payload.internship_id).execute()
        if not job_query.data:
             return JSONResponse({"error": "Internship not found"}, status_code=404)
        job = job_query.data[0]
        
        score_query = supabase.table("match_results").select("match_score").eq("user_id", payload.user_id).eq("internship_id", payload.internship_id).execute()
        match_score = score_query.data[0].get("match_score", 0) if score_query.data else 0

        existing = supabase.table("applied_internships").select("*").eq("user_id", payload.user_id).eq("internship_id", payload.internship_id).execute()
        if existing.data:
            return {"success": True, "message": "Already applied."}

        supabase.table("applied_internships").insert({
            "user_id": payload.user_id,
            "internship_id": payload.internship_id,
            "cover_letter": payload.cover_letter,
            "status": "pending",
            "match_score": match_score
        }).execute()
        
        if not settings.RESEND_API_KEY:
            logger.warning("[SubmitApp] RESEND_API_KEY not found. Skipping email.")
        else:
            try:
                resend.api_key = settings.RESEND_API_KEY
                student_name = student.get('full_name', 'Student')
                job_role = job.get('role', 'Internship')
                target_email = job.get('employer_email') or "noreply@pau.edu.ng"
                
                attachments = []
                cv_url = student.get("cv_url", "")
                if cv_url:
                    try:
                        filename = ""
                        for marker in ["/object/sign/cvs/", "/object/public/cvs/", "cvs/"]:
                            if marker in cv_url:
                                filename = cv_url.split(marker)[1].split("?")[0]
                                break
                        if filename:
                            cv_bytes = supabase.storage.from_("cvs").download(filename)
                            if cv_bytes:
                                attachments.append({
                                    "filename": f"{student_name.replace(' ','_')}_CV.pdf",
                                    "content": list(cv_bytes)
                                })
                    except Exception as storage_e:
                        logger.error(f"[Resend] CV Attachment error: {storage_e}")

                reply_to = payload.student_email or student.get("email") or "noreply@pau.edu.ng"
                
                params = {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [target_email],
                    "reply_to": reply_to,
                    "subject": f"Application: {job_role} - {student_name}",
                    "text": f"A student has applied for {job_role}.\n\nName: {student_name}\nMatch Score: {match_score}%\n\nCover Letter:\n{payload.cover_letter}",
                    "attachments": attachments
                }
                
                resend.Emails.send(params)
                logger.info(f"Email sent via Resend.")
            except Exception as email_e:
                logger.error(f"[Resend] Failed: {email_e}")

        return {"success": True}
    except Exception as e:
        logger.error(f"[/submit-application] Fatal: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/applications/{app_id}/status")
@router.put("/api/applications/{app_id}/status")
def update_status(app_id: str, payload: ApplicationStatusUpdate, current_user = Depends(get_current_user)):
    try:
        supabase.table("applied_internships").update({"status": payload.status}).eq("id", app_id).execute()
        return {"success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/internships/{internship_id}/applicants")
@router.get("/api/internships/{internship_id}/applicants")
def get_applicants(internship_id: str, current_user = Depends(get_current_user)):
    try:
        res_apps = supabase.table("applied_internships").select("*").eq("internship_id", internship_id).order("match_score", desc=True).execute()
        apps = res_apps.data or []
        if not apps: return {"applicants": []}
        
        uids = [a["user_id"] for a in apps if a.get("user_id")]
        res_profiles = supabase.table("profiles").select("id, full_name, course, level, cv_url").in_("id", uids).execute()
        p_map = {p["id"]: p for p in (res_profiles.data or [])}
        
        for a in apps:
            a["profiles"] = p_map.get(a["user_id"])
        return {"applicants": apps}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
