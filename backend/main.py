# ==============================================================================
# PAU Interconnect Backend API (v4.1-stable)
# ==============================================================================

import json
import logging
import os
import re
import tempfile
import uuid
import smtplib
from datetime import datetime, timezone
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import pdfplumber
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import Client, ClientOptions, create_client

# ------------------------------------------------------------------------------
# 1. Configuration & Global State
# ------------------------------------------------------------------------------

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Critical Error: Supabase environment variables not set.")

# Initialize Supabase client
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
    options=ClientOptions(
        postgrest_client_timeout=15.0,
        storage_client_timeout=15.0,
    ),
)

# ------------------------------------------------------------------------------
# 2. Models
# ------------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    user_id: str

class AnalyzeNewInternshipRequest(BaseModel):
    internship_id: str

class DraftCoverLetterRequest(BaseModel):
    user_id: str
    internship_id: str

class SubmitApplicationRequest(BaseModel):
    user_id: str
    internship_id: str
    cover_letter: str

class ApplicationStatusUpdate(BaseModel):
    status: str

# ------------------------------------------------------------------------------
# 3. Helper Functions
# ------------------------------------------------------------------------------

def extract_text(file_path: str) -> str:
    """Extracts text from a PDF file."""
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error(f"[extract_text] Failed: {e}")
        raise
    return text

def get_user_profile(user_id: str):
    """Fetch user profile from Supabase."""
    try:
        res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if not res.data:
            raise ValueError("Profile not found.")
        return res.data[0]
    except Exception as e:
        logger.error(f"[get_user_profile] Error: {e}")
        raise

def save_cv_text_and_url(user_id: str, cv_url: str, cv_text: str):
    """Updates profile with CV info."""
    try:
        supabase.table("profiles").update({
            "cv_url": cv_url,
            "cv_text": cv_text,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", user_id).execute()
    except Exception as e:
        logger.error(f"[save_cv_text_and_url] Error: {e}")
        raise

def fetch_internships():
    """Fetch all internship records."""
    try:
        res = supabase.table("internships").select("*").execute()
        return res.data or []
    except Exception as e:
        logger.error(f"[fetch_internships] Error: {e}")
        return []

def upsert_match_result(user_id: str, internship_id: str, analysis: dict):
    """Save or update AI match score for a specific student-internship pair."""
    try:
        raw_score = analysis.get("match_score", 0)
        try:
            numeric_score = float(raw_score)
        except (ValueError, TypeError):
            numeric_score = 0.0
        
        # Normalize: if AI returns 0.0-1.0, scale to 0-100
        if 0 <= numeric_score <= 1:
            numeric_score *= 100
        final_score = int(numeric_score)

        supabase.table("match_results").upsert({
            "user_id": user_id,
            "internship_id": internship_id,
            "match_score": final_score,
            "matching_skills": analysis.get("matching_skills", []),
            "missing_skills": analysis.get("missing_skills", []),
            "reasoning": analysis.get("reasoning", "No reasoning provided."),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, on_conflict="user_id,internship_id").execute()
    except Exception as e:
        logger.error(f"[upsert_match_result] Error for user {user_id}: {e}")
        raise

def run_ai_analysis(cv_text: str, internships: list) -> list:
    """Calls NVIDIA/LLM to score CV against a list of internships."""
    if not cv_text or not cv_text.strip():
        return []

    prompt = f"""
    You are a professional HR recruitment analyst.
    Analyze the following CV text and compare it to each internship requirement.
    Return ONLY a valid JSON array in this exact format:
    [{{"internship_id": "...", "match_score": 0, "matching_skills": [], "missing_skills": [], "reasoning": "..."}}]
    
    <cv_content>
    {cv_text}
    </cv_content>
    
    Internships:
    {json.dumps(internships, indent=2)}
    """

    if not NVIDIA_API_KEY:
        logger.warning("[AI] No API Key. Returning placeholder matches.")
        return [{"internship_id": i.get("id"), "match_score": 50, "reasoning": "Mock mode."} for i in internships]

    try:
        resp = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
            json={
                "model": "meta/llama-3.1-70b-instruct",
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=110,
        )
        resp.raise_for_status()
        raw_output = resp.json()["choices"][0]["message"]["content"]
        
        # Extract JSON block
        match = re.search(r"\[.*\]", raw_output, re.DOTALL)
        json_str = match.group(0) if match else raw_output
        return json.loads(json_str)
    except Exception as e:
        logger.error(f"[run_ai_analysis] Failed: {e}")
        raise ValueError(f"AI analysis failure: {str(e)}")

# ------------------------------------------------------------------------------
# 4. FastAPI Setup & Middleware
# ------------------------------------------------------------------------------

app = FastAPI(title="PAU Interconnect API", version="4.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_custom_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Backend-Version"] = "v4.1-stable"
    return response

# ------------------------------------------------------------------------------
# 5. Core Endpoints
# ------------------------------------------------------------------------------

@app.get("/")
def home():
    return {
        "status": "online",
        "version": "v4.1-stable",
        "ai_enabled": bool(NVIDIA_API_KEY),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/health-check")
@app.get("/api/health-check")
def health():
    return {"status": "ok", "version": "v4.1-stable"}

@app.get("/test-supabase")
def test_supabase():
    """Test Supabase connection."""
    try:
        res = supabase.table("profiles").select("*").limit(1).execute()
        return {"status": "success", "example_profile": res.data[0] if res.data else None}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/upload-and-analyze")
@app.post("/api/upload-and-analyze")
def upload_and_analyze(user_id: str = Form(...), file: UploadFile = File(...)):
    """Handles CV upload, storage, text extraction, and AI analysis."""
    logger.info(f"[/upload-and-analyze] Start: {user_id}, {file.filename}")
    temp_path = None
    
    try:
        profile = get_user_profile(user_id)
        if not file.filename.lower().endswith(".pdf"):
            return JSONResponse({"error": "Only PDFs are supported."}, status_code=400)
            
        content = file.file.read()
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
            results = run_ai_analysis(cv_text, internships)
            for res in results:
                upsert_match_result(user_id, res.get("internship_id"), res)
            matches_found = len(results)
            
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

@app.post("/analyze-new-internship")
@app.post("/api/analyze-new-internship")
def analyze_new_internship(payload: AnalyzeNewInternshipRequest):
    """Trigger scoring of all existing student CVs against a new internship."""
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
                results = run_ai_analysis(s["cv_text"], [job])
                if results:
                    upsert_match_result(s["id"], iid, results[0])
                    success += 1
            except Exception as e:
                logger.error(f"AI Skip for {s['id']}: {e}")
        return {"message": f"Analyzed {success} students."}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/analyze-existing-cv")
@app.post("/api/analyze-existing-cv")
def analyze_existing(payload: AnalyzeRequest):
    """Re-run AI analysis for a user who already has a CV on file."""
    try:
        p = get_user_profile(payload.user_id)
        if not p.get("cv_text"): return JSONResponse({"error": "No CV"}, status_code=400)
        jobs = fetch_internships()
        results = run_ai_analysis(p["cv_text"], jobs)
        for r in results:
            upsert_match_result(payload.user_id, r.get("internship_id"), r)
        return {"message": "Re-analysis complete.", "count": len(results)}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/refresh-cv-url")
@app.post("/api/refresh-cv-url")
def refresh_url(payload: AnalyzeRequest):
    """Regenerate a signed URL for a user's CV if the old one expired."""
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

@app.get("/my-matches")
@app.get("/api/my-matches")
def get_my_matches(user_id: str):
    try:
        res = supabase.table("match_results").select("*").eq("user_id", user_id).execute()
        return {"matches": res.data or []}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/debug/match-results/{user_id}")
def debug_results(user_id: str):
    try:
        res = supabase.table("match_results").select("*").eq("user_id", user_id).execute()
        return {"user_id": user_id, "count": len(res.data), "data": res.data}
    except Exception as e:
        return {"error": str(e)}

# ------------------------------------------------------------------------------
# 6. Application & Cover Letter Endpoints
# ------------------------------------------------------------------------------

@app.post("/draft-cover-letter")
@app.post("/api/draft-cover-letter")
def build_cover_letter(payload: DraftCoverLetterRequest):
    try:
        profile = get_user_profile(payload.user_id)
        cv_text = profile.get("cv_text")
        if not cv_text: return JSONResponse({"error": "No CV text"}, status_code=400)
            
        job_res = supabase.table("internships").select("*").eq("id", payload.internship_id).single().execute()
        job = job_res.data
        if not job: return JSONResponse({"error": "Not found"}, status_code=404)

        prompt = f"Write a professional cover letter for {job.get('company')} - {job.get('role')}.\nCV: {cv_text}"
        if not NVIDIA_API_KEY: return {"cover_letter": "Placeholder (Local/Dev)."}

        resp = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
            json={"model": "meta/llama-3.1-70b-instruct", "messages": [{"role": "user", "content": prompt}]},
            timeout=60
        )
        resp.raise_for_status()
        return {"cover_letter": resp.json()["choices"][0]["message"]["content"]}
    except Exception as e:
        return JSONResponse({"error": "Drafting failed."}, status_code=500)

@app.post("/submit-application")
@app.post("/api/submit-application")
def submit_app(payload: SubmitApplicationRequest):
    try:
        student = get_user_profile(payload.user_id)
        job_res = supabase.table("internships").select("*").eq("id", payload.internship_id).single().execute()
        job = job_res.data
        if not job: return JSONResponse({"error": "Internship not found"}, status_code=404)
        
        score_res = supabase.table("match_results").select("match_score").eq("user_id", payload.user_id).eq("internship_id", payload.internship_id).maybe_single().execute()
        match_score = score_res.data.get("match_score") if score_res.data else 0

        # Create record
        supabase.table("applied_internships").insert({
            "user_id": payload.user_id,
            "internship_id": payload.internship_id,
            "cover_letter": payload.cover_letter,
            "status": "pending",
            "match_score": match_score
        }).execute()
        
        # Email Notification (SMTP)
        SMTP_EMAIL = os.getenv("SMTP_EMAIL")
        SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
        if SMTP_EMAIL and SMTP_PASSWORD:
            try:
                msg = MIMEMultipart()
                msg["Subject"] = f"New Application: {job.get('role')} - {student.get('full_name')}"
                msg["From"] = SMTP_EMAIL
                msg["To"] = job.get('employer_email') or "admin@example.com"
                
                body = f"A student has applied for {job.get('role')}.\n\nName: {student.get('full_name')}\nScore: {match_score}%\n\nCover Letter:\n{payload.cover_letter}"
                msg.attach(MIMEText(body, "plain"))
                
                server = smtplib.SMTP("smtp.gmail.com", 587)
                server.starttls()
                server.login(SMTP_EMAIL, SMTP_PASSWORD)
                server.send_message(msg)
                server.quit()
                logger.info("Email notification sent.")
            except Exception as e:
                logger.error(f"Email failure: {e}")

        return {"success": True}
    except Exception as e:
        logger.error(f"[/submit-application] Error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.put("/applications/{app_id}/status")
@app.put("/api/applications/{app_id}/status")
def update_status(app_id: str, payload: ApplicationStatusUpdate):
    try:
        supabase.table("applied_internships").update({"status": payload.status}).eq("id", app_id).execute()
        return {"success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/internships/{internship_id}/applicants")
@app.get("/api/internships/{internship_id}/applicants")
def get_applicants(internship_id: str):
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

# ------------------------------------------------------------------------------
# 7. Admin & Analytics Endpoints
# ------------------------------------------------------------------------------

@app.get("/admin/stats")
@app.get("/api/admin/stats")
def fetch_admin_stats():
    try:
        t_students = supabase.table("profiles").select("id", count="exact").eq("role", "student").execute().count or 0
        t_jobs = supabase.table("internships").select("id", count="exact").execute().count or 0
        t_apps = supabase.table("applied_internships").select("id", count="exact").execute().count or 0
        return {"total_students": t_students, "total_internships": t_jobs, "total_applications": t_apps}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/admin/search")
@app.get("/api/admin/search")
def run_admin_search(q: str = ""):
    if len(q) < 2: return {"students": [], "internships": []}
    try:
        students = supabase.table("profiles").select("*").eq("role", "student").ilike("full_name", f"%{q}%").execute().data or []
        jobs = supabase.table("internships").select("*").ilike("role", f"%{q}%").execute().data or []
        return {"students": students, "internships": jobs}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/admin/directory")
@app.get("/api/admin/directory")
def fetch_admin_directory():
    try:
        res = supabase.table("profiles").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/admin/analytics")
@app.get("/api/admin/analytics")
def fetch_admin_analytics():
    try:
        jobs = supabase.table("internships").select("id, role, company, category").execute().data or []
        apps = supabase.table("applied_internships").select("id, internship_id").execute().data or []
        
        stats = []
        counts = {}
        for a in apps:
            iid = a.get("internship_id")
            if iid: counts[iid] = counts.get(iid, 0) + 1
            
        for j in jobs:
            stats.append({
                "id": j["id"],
                "title": j.get("role"),
                "company": j.get("company"),
                "applications": counts.get(j["id"], 0)
            })
        stats.sort(key=lambda x: x["applications"], reverse=True)
        return {"total_internships": len(jobs), "total_applications": len(apps), "internship_stats": stats}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# ------------------------------------------------------------------------------
# 8. Catch-all / Global Error Handler (MUST BE LAST)
# ------------------------------------------------------------------------------

@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def resource_not_found(request: Request, path_name: str):
    logger.warning(f"404 Path Trapped: {path_name}")
    return JSONResponse({
        "error": "Endpoint not found.",
        "requested_path": path_name,
        "api_version": "v4.1-stable"
    }, status_code=404)
