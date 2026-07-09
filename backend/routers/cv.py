import os
import uuid
import tempfile
import logging
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from core.security import get_current_user
from core.db import supabase
from schemas.requests import AnalyzeRequest, AnalyzeNewInternshipRequest
from services.supabase_service import get_user_profile, extract_text, save_cv_text_and_url, fetch_internships, upsert_match_result
from services.routing_service import compute_match_score
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)

async def process_matches_in_background(user_id: str, cv_text: str, internships: list):
    try:
        matches_found = 0
        if internships:
            semaphore = asyncio.Semaphore(5)
            async def bounded_match(cv_t, j):
                async with semaphore:
                    return await compute_match_score(cv_t, j)

            tasks = [bounded_match(cv_text, job) for job in internships]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for res in results:
                if isinstance(res, dict):
                    upsert_match_result(user_id, res.get("internship_id"), res)
                    matches_found += 1
                else:
                    logger.error(f"Failed match computation for a job: {res}")
        logger.info(f"Background match processing completed for user {user_id}. Found {matches_found} matches.")
    except Exception as e:
        logger.error(f"Background match processing failed for user {user_id}: {e}")

async def process_new_internship_background(iid: str, job: dict, students: list):
    try:
        success = 0
        for s in students:
            try:
                result = await compute_match_score(s["cv_text"], job)
                if result:
                    upsert_match_result(s["id"], iid, result)
                    success += 1
            except Exception as e:
                logger.error(f"AI Skip for {s['id']}: {e}")
        logger.info(f"Background processing for new internship {iid} completed. Analyzed {success} students.")
    except Exception as e:
        logger.error(f"Background processing failed for new internship {iid}: {e}")

@router.post("/upload-and-analyze")
@router.post("/api/upload-and-analyze")
async def upload_and_analyze(
    background_tasks: BackgroundTasks,
    user_id: str = Form(...), 
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
        
    temp_path = None
    try:
        profile = get_user_profile(user_id)
        if not file.filename.lower().endswith(".pdf"):
            return JSONResponse({"error": "Only PDFs are supported."}, status_code=400)
            
        content = await file.read()
        storage_filename = f"{uuid.uuid4()}.pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            temp_path = tmp.name

        supabase.storage.from_("cvs").upload(storage_filename, content, {"content-type": "application/pdf"})
        url_resp = supabase.storage.from_("cvs").create_signed_url(storage_filename, 604800)
        cv_url = url_resp.get("signedURL") or url_resp.get("signedUrl")
        
        cv_text = extract_text(temp_path)
        save_cv_text_and_url(user_id, cv_url, cv_text)
        
        internships = fetch_internships()
        if internships:
            background_tasks.add_task(process_matches_in_background, user_id, cv_text, internships)
            
        return {
            "message": "CV uploaded. AI matching is processing in the background.",
            "cv_url": cv_url,
            "text_length": len(cv_text),
            "internships_count": len(internships)
        }
    except Exception as e:
        logger.error(f"[/upload-and-analyze] Fatal: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/analyze-new-internship")
@router.post("/api/analyze-new-internship")
async def analyze_new_internship(payload: AnalyzeNewInternshipRequest, background_tasks: BackgroundTasks, current_user = Depends(get_current_user)):
    try:
        iid = payload.internship_id
        res_job = supabase.table("internships").select("*").eq("id", iid).execute()
        if not res_job.data: return JSONResponse({"error": "Not found"}, status_code=404)
        
        job = res_job.data[0]
        res_students = supabase.table("profiles").select("id, cv_text").eq("role", "student").neq("cv_text", None).execute()
        students = res_students.data or []
        
        if students:
            background_tasks.add_task(process_new_internship_background, iid, job, students)
            
        return {"message": f"AI matching for new internship started in the background for {len(students)} students."}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/analyze-existing-cv")
@router.post("/api/analyze-existing-cv")
async def analyze_existing(payload: AnalyzeRequest, background_tasks: BackgroundTasks, current_user = Depends(get_current_user)):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        p = get_user_profile(payload.user_id)
        if not p.get("cv_text"): return JSONResponse({"error": "No CV"}, status_code=400)
        jobs = fetch_internships()
        if jobs:
            background_tasks.add_task(process_matches_in_background, payload.user_id, p["cv_text"], jobs)
            
        return {"message": "Re-analysis started in the background."}
    except Exception as e:
        logger.error(f"[/analyze-existing-cv] Fatal: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/refresh-cv-url")
@router.post("/api/refresh-cv-url")
def refresh_url(payload: AnalyzeRequest, current_user = Depends(get_current_user)):
    # Authorization: Student can refresh their own, or an employer can refresh any student's
    if payload.user_id != current_user.id and current_user.user_metadata.get("role") != "employer" and getattr(current_user, 'role', None) != 'employer':
        # Double check role from profile if not in JWT
        profile = get_user_profile(current_user.id)
        if profile.get("role") != "employer" and profile.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to refresh this URL.")
            
    try:
        p = get_user_profile(payload.user_id)
        url = p.get("cv_url", "")
        if not url: return JSONResponse({"error": "No URL"}, status_code=404)
        
        filename = ""
        # Improved parsing: get the part between 'cvs/' and '?'
        if "cvs/" in url:
            parts = url.split("cvs/")
            if len(parts) > 1:
                filename = parts[1].split("?")[0]
        
        if not filename: raise ValueError(f"Could not parse filename from URL: {url}")

        # Refresh for another 7 days
        signed = supabase.storage.from_("cvs").create_signed_url(filename, 604800)
        new_url = signed.get("signedURL") or signed.get("signedUrl")
        
        if not new_url:
            raise ValueError("Supabase failed to generate a new signed URL")
            
        save_cv_text_and_url(payload.user_id, new_url, p.get("cv_text", ""))
        return {"cv_url": new_url}
    except Exception as e:
        logger.error(f"[/refresh-cv-url] Error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/my-matches")
@router.get("/api/my-matches")
def get_my_matches(user_id: str, current_user = Depends(get_current_user)):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        res = supabase.table("match_results").select("*").eq("user_id", user_id).execute()
        return {"matches": res.data or []}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/debug/match-results/{user_id}")
def debug_results(user_id: str):
    try:
        res = supabase.table("match_results").select("*").eq("user_id", user_id).execute()
        return {"user_id": user_id, "count": len(res.data), "data": res.data}
    except Exception as e:
        return {"error": str(e)}
