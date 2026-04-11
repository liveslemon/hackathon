import os
import uuid
import tempfile
import logging
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from backend.core.security import get_current_user
from backend.core.db import supabase
from backend.schemas.requests import AnalyzeRequest, AnalyzeNewInternshipRequest
from backend.services.supabase_service import get_user_profile, extract_text, save_cv_text_and_url, fetch_internships, upsert_match_result
from backend.services.routing_service import compute_match_score
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload-and-analyze")
@router.post("/api/upload-and-analyze")
async def upload_and_analyze(
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
        matches_found = 0
        if internships:
            tasks = [compute_match_score(cv_text, job) for job in internships]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for res in results:
                if isinstance(res, dict):
                    upsert_match_result(user_id, res.get("internship_id"), res)
                    matches_found += 1
                else:
                    logger.error(f"Failed match computation for a job: {res}")
            
        return {
            "message": "CV uploaded and matches computed successfully",
            "cv_url": cv_url,
            "text_length": len(cv_text),
            "internships_count": len(internships),
            "matches_count": matches_found
        }
    except Exception as e:
        logger.error(f"[/upload-and-analyze] Fatal: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/analyze-new-internship")
@router.post("/api/analyze-new-internship")
async def analyze_new_internship(payload: AnalyzeNewInternshipRequest, current_user = Depends(get_current_user)):
    try:
        iid = payload.internship_id
        res_job = supabase.table("internships").select("*").eq("id", iid).execute()
        if not res_job.data: return JSONResponse({"error": "Not found"}, status_code=404)
        
        job = res_job.data[0]
        res_students = supabase.table("profiles").select("id, cv_text").eq("role", "student").neq("cv_text", None).execute()
        students = res_students.data or []
        
        success = 0
        for s in students:
            try:
                result = await compute_match_score(s["cv_text"], job)
                if result:
                    upsert_match_result(s["id"], iid, result)
                    success += 1
            except Exception as e:
                logger.error(f"AI Skip for {s['id']}: {e}")
        return {"message": f"Analyzed {success} students."}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/analyze-existing-cv")
@router.post("/api/analyze-existing-cv")
async def analyze_existing(payload: AnalyzeRequest, current_user = Depends(get_current_user)):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        p = get_user_profile(payload.user_id)
        if not p.get("cv_text"): return JSONResponse({"error": "No CV"}, status_code=400)
        jobs = fetch_internships()
        tasks = [compute_match_score(p["cv_text"], job) for job in jobs]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        count = 0
        for r in results:
            if isinstance(r, dict):
                upsert_match_result(payload.user_id, r.get("internship_id"), r)
                count += 1
        return {"message": "Re-analysis complete.", "count": count}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/refresh-cv-url")
@router.post("/api/refresh-cv-url")
def refresh_url(payload: AnalyzeRequest, current_user = Depends(get_current_user)):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        p = get_user_profile(payload.user_id)
        url = p.get("cv_url", "")
        if not url: return JSONResponse({"error": "No URL"}, status_code=404)
        
        filename = ""
        for marker in ["/object/sign/cvs/", "/object/public/cvs/", "cvs/"]:
            if marker in url:
                filename = url.split(marker)[1].split("?")[0]
                break
        if not filename: raise ValueError("Could not parse filename")

        signed = supabase.storage.from_("cvs").create_signed_url(filename, 604800)
        new_url = signed.get("signedURL") or signed.get("signedUrl")
        save_cv_text_and_url(payload.user_id, new_url, p.get("cv_text", ""))
        return {"cv_url": new_url}
    except Exception as e:
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
