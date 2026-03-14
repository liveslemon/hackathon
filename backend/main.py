# =========================
# PAU Interconnect Backend
# =========================
import json
import logging
import os
import re
import tempfile
import uuid
from datetime import datetime, timezone
import smtplib
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

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase environment variables not set")

# Set Supabase client with timeouts
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
    options=ClientOptions(
        postgrest_client_timeout=10.0,
        storage_client_timeout=10.0,
    ),
)

app = FastAPI()

FRONTEND_URL = os.getenv("FRONTEND_URL", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, # Must be false when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_debug_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Debug-Version"] = "v2-diagnostics"
    return response

@app.get("/health-check")
def health_check():
    return {"status": "ok", "version": "v2-diagnostics"}

class AnalyzeRequest(BaseModel):
    user_id: str

# ======================
# Root & Health Check
# ======================

@app.get("/")
def read_root():
    """Root endpoint for health check and platform welcome."""
    return {
        "status": "online",
        "message": "Welcome to the PAU Interconnect Backend API",
        "ai_key_loaded": bool(NVIDIA_API_KEY),
        "supabase_url": SUPABASE_URL[:10] + "..." if SUPABASE_URL else None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Handle favicon requests to avoid 404s in logs."""
    from fastapi import Response
    return Response(status_code=204)

# ======================
# Helper Functions
# ======================


def extract_text(file_path: str) -> str:
    """Extracts all text from a PDF file using pdfplumber."""
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"[extract_text] Error: {e}")
        raise
    return text


def get_user_profile(user_id: str):
    """Fetch user profile by user_id. Raise if not found."""
    try:
        res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if not res.data or len(res.data) == 0:
            raise Exception("Profile not found.")
        return res.data[0]
    except Exception as e:
        print(f"[get_user_profile] Error: {e}")
        raise


def save_cv_text_and_url(user_id: str, cv_url: str, cv_text: str):
    """Update user profile with CV URL and extracted text."""
    try:
        supabase.table("profiles").update(
            {
                "cv_url": cv_url,
                "cv_text": cv_text,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", user_id).execute()
    except Exception as e:
        print(f"[save_cv_text_and_url] Error: {e}")
        raise


def fetch_internships():
    """Return all internships from DB."""
    try:
        res = supabase.table("internships").select("*").execute()
        return res.data or []
    except Exception as e:
        print(f"[fetch_internships] Error: {e}")
        return []


def upsert_match_result(user_id: str, internship_id: str, result: dict):
    """Upsert a match_results row for (user_id, internship_id)."""
    score = result.get("match_score", 0)
    try:
        numeric_score = float(score)
    except Exception:
        numeric_score = 0.0
    # If between 0-1, treat as percent
    if 0 <= numeric_score <= 1:
        numeric_score *= 100
    final_score = int(numeric_score)
    try:
        supabase.table("match_results").upsert(
            {
                "user_id": user_id,
                "internship_id": internship_id,
                "match_score": final_score,
                "matching_skills": result.get("matching_skills"),
                "missing_skills": result.get("missing_skills"),
                "reasoning": result.get("reasoning"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="user_id,internship_id",
        ).execute()
    except Exception as e:
        print(f"[upsert_match_result] Error: {e}")
        raise


def run_ai_analysis(cv_text: str, internships: list) -> list:
    """
    Compose prompt and call NVIDIA AI, returning parsed result list.
    """
    prompt = f"""
You are a professional HR recruitment analyst.

Analyze this CV text inside <cv_content> tags and extract all skills, technologies, and relevant experience.
Compare each internship requirement to the candidate's skills.

Return ONLY a valid JSON array in this exact format:
[
  {{
    "internship_id": "",
    "match_score": 0,
    "matching_skills": [],
    "missing_skills": [],
    "reasoning": ""
  }}
]
Be realistic and strict in scoring.
Do NOT add any extra text or commentary.
<cv_content>
{cv_text}
</cv_content>
Internships:
{json.dumps(internships, indent=2)}
"""
    if not NVIDIA_API_KEY:
        # Dummy mode for testing: return 100 for all
        logger.info("[AI] NVIDIA_API_KEY not set, returning dummy matches")
        return [
            {
                "internship_id": i.get("id"),
                "match_score": 100,
                "matching_skills": ["Dummy skill"],
                "missing_skills": [],
                "reasoning": "Dummy AI mode: perfect match.",
            }
            for i in internships
        ]
    try:
        resp = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
            json={
                "model": "meta/llama-3.1-70b-instruct",
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=120,
        )
        resp.raise_for_status()
        raw_output = resp.json()["choices"][0]["message"]["content"]
        logger.info(f"[AI] Raw output length: {len(raw_output)}")

        match = re.search(r"\[.*\]", raw_output, re.DOTALL)
        json_str = match.group(0) if match else raw_output

        return json.loads(json_str)
    except json.JSONDecodeError:
        logger.error(f"[AI] JSON decode error, raw: {raw_output}")
        raise ValueError(raw_output)
    except Exception as e:
        logger.error(f"[AI] Exception: {e}")
        raise Exception(f"AI request failed: {str(e)}")


# ======================
# API Endpoints
# ======================


@app.get("/test-supabase")
def test_supabase():
    """Test Supabase connection."""
    try:
        res = supabase.table("profiles").select("*").limit(1).execute()
        if res.data:
            return {"status": "success", "example_profile": res.data[0]}
        return {"status": "success", "message": "No profiles found"}
    except Exception as e:
        print("[/test-supabase] Error:", e)
        return {"status": "error", "message": str(e)}


@app.post("/upload-and-analyze")
def upload_and_analyze(
    user_id: str = Form(...),
    file: UploadFile = File(...),
):
    logger.info(f"[/upload-and-analyze] user_id={user_id}, filename={file.filename}")
    # 1. Validate user
    try:
        profile = get_user_profile(user_id)
    except Exception as e:
        logger.error(f"[/upload-and-analyze] User validation failed: {e}")
        return JSONResponse(
            content={"error": f"User validation failed: {str(e)}"}, status_code=400
        )
    # 2. Validate PDF file
    if not file.filename.lower().endswith(".pdf"):
        return JSONResponse(
            content={"error": "Only PDF files are allowed"}, status_code=400
        )
    # 3. Read file
    try:
        content = file.file.read()
    except Exception as e:
        logger.error(f"[/upload-and-analyze] Failed to read file: {e}")
        return JSONResponse(
            content={"error": f"Failed to read file: {str(e)}"}, status_code=400
        )
    # 4. Save to temp and to Supabase
    filename = f"{uuid.uuid4()}.pdf"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(content)
        temp_file_path = tmp.name

    try:
        # 5. Upload to Supabase Storage
        try:
            supabase.storage.from_("cvs").upload(
                filename,
                content,
                {"content-type": "application/pdf"},
            )
        except Exception as e:
            logger.error(f"[/upload-and-analyze] Failed to upload to storage: {e}")
            return JSONResponse(
                content={"error": f"Failed to upload to storage: {str(e)}"}, status_code=500
            )
        # 6. Get signed URL
        try:
            full_name = profile.get("full_name") or "Student"
            clean_name = "_".join(full_name.split())
            download_name = f"{clean_name}_CV.pdf"

            signed_url_resp = supabase.storage.from_("cvs").create_signed_url(
                filename, 604800
            )
            signed_url = signed_url_resp.get("signedURL") or signed_url_resp.get(
                "signedUrl"
            )
            if not signed_url:
                raise Exception("Signed URL not returned")
        except Exception as e:
            logger.error(f"[/upload-and-analyze] Failed to get signed URL: {e}")
            return JSONResponse(
                content={"error": f"Failed to get signed URL: {str(e)}"}, status_code=500
            )
        # 7. Extract text
        try:
            cv_text = extract_text(temp_file_path)
        except Exception as e:
            logger.error(f"[/upload-and-analyze] Failed to extract text: {e}")
            return JSONResponse(
                content={"error": f"Failed to extract text: {str(e)}"}, status_code=500
            )
        
        # 8. Save to user profile
        try:
            save_cv_text_and_url(user_id, signed_url, cv_text)
        except Exception as e:
            logger.error(f"[/upload-and-analyze] Failed to save CV data: {e}")
            return JSONResponse(
                content={"error": f"Failed to save CV data: {str(e)}"}, status_code=500
            )
        # 9. Fetch internships
        internships = fetch_internships()
        if not internships:
            logger.info("[/upload-and-analyze] No internships found.")
            return {"message": "CV saved but no internships found."}
        # 10. Run AI analysis
        try:
            results = run_ai_analysis(cv_text, internships)
        except ValueError as e:
            logger.error(f"[/upload-and-analyze] AI response invalid JSON: {e}")
            return JSONResponse(
                content={"error": "AI response was not valid JSON", "raw_output": str(e)},
                status_code=500,
            )
        except Exception as e:
            logger.error(f"[/upload-and-analyze] AI error: {e}")
            return JSONResponse(content={"error": str(e)}, status_code=500)
        # 11. Upsert match results
        try:
            for result in results:
                upsert_match_result(user_id, result.get("internship_id"), result)
        except Exception as e:
            logger.error(f"[/upload-and-analyze] Failed saving match results: {e}")
            return JSONResponse(
                content={"error": f"Failed saving match results: {str(e)}"}, status_code=500
            )
        logger.info(f"[/upload-and-analyze] Success for user_id={user_id}")
        return {
            "message": "CV uploaded and matches computed successfully",
            "cv_url": signed_url,
            "cv_text": cv_text,
        }
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass


@app.get("/my-matches")
def my_matches(user_id: str):
    print(f"[/my-matches] user_id={user_id}")
    try:
        res = (
            supabase.table("match_results").select("*").eq("user_id", user_id).execute()
        )
        return {"matches": res.data or []}
    except Exception as e:
        print("[/my-matches] Error:", e)
        return JSONResponse(
            content={"error": f"Failed to fetch match results: {str(e)}"},
            status_code=500,
        )

class AnalyzeNewInternshipRequest(BaseModel):
    internship_id: str

@app.post("/analyze-new-internship")
def analyze_new_internship(payload: AnalyzeNewInternshipRequest):
    """
    When an employer posts a new internship, trigger this to score all
    existing student CVs against this specific internship.
    """
    try:
        internship_id = payload.internship_id
        
        # 1. Fetch the internship details
        res_internship = supabase.table("internships").select("*").eq("id", internship_id).execute()
        if not res_internship.data:
            return JSONResponse(content={"error": "Internship not found"}, status_code=404)
        
        new_internship = res_internship.data[0]
        
        # 2. Fetch all students with a CV
        res_students = supabase.table("profiles").select("id, cv_text").eq("role", "student").neq("cv_text", None).execute()
        students = res_students.data or []
        
        if not students:
            return {"message": "No students found with CVs to analyze."}

        # 3. Analyze each student against this single new internship
        # Note: We wrap the internship in a list since run_ai_analysis expects a list of internships
        success_count = 0
        for student in students:
            user_id = student["id"]
            cv_text = student.get("cv_text")
            
            if not cv_text or not cv_text.strip():
                continue
                
            try:
                results = run_ai_analysis(cv_text, [new_internship])
                if not results:
                    continue
                    
                result = results[0] # Should only be one result since we pass one internship
                
                # Check if internship_id matches what we sent; occasionally AI might hallucinate IDs
                if not result.get("internship_id"):
                    result["internship_id"] = internship_id
                    
                upsert_match_result(user_id, internship_id, result)
                success_count += 1
            except Exception as ai_e:
                logger.error(f"[/analyze-new-internship] AI error for user {user_id}: {ai_e}")
                continue
                
        return {"message": f"Successfully analyzed {success_count} students against the new internship."}
        
    except Exception as e:
        logger.error(f"[/analyze-new-internship] Unexpected error: {str(e)}")
        return JSONResponse(
            content={"error": f"Unexpected error: {str(e)}"}, status_code=500
        )

@app.post("/analyze-existing-cv")
def analyze_existing_cv(payload: AnalyzeRequest):
    try:
        user_id = payload.user_id
        try:
            profile = get_user_profile(user_id)
        except Exception as e:
            if "Profile not found" in str(e):
                return JSONResponse(content={"error": str(e)}, status_code=404)
            raise
        cv_text = profile.get("cv_text")
        if not cv_text or not isinstance(cv_text, str) or not cv_text.strip():
            return JSONResponse(
                content={"error": "No CV text found for user"}, status_code=400
            )
        internships = fetch_internships()
        if not internships:
            logger.info("[/analyze-existing-cv] No internships found.")
            return {"results": []}
        try:
            results = run_ai_analysis(cv_text, internships)
        except ValueError as e:
            logger.error(f"[/analyze-existing-cv] AI response invalid JSON: {e}")
            return JSONResponse(
                content={
                    "error": "AI response was not valid JSON",
                    "raw_output": str(e),
                },
                status_code=500,
            )
        except Exception as e:
            logger.error(f"[/analyze-existing-cv] AI error: {e}")
            return JSONResponse(content={"error": str(e)}, status_code=500)
        output_results = []
        for result in results:
            internship_id = result.get("internship_id")
            match_score = result.get("match_score", 0)
            try:
                upsert_match_result(user_id, internship_id, result)
            except Exception as e:
                logger.error(
                    f"[/analyze-existing-cv] Upsert error for internship_id={internship_id}: {e}"
                )
            try:
                match_score_int = int(float(match_score))
            except Exception:
                match_score_int = 0
            output_results.append(
                {
                    "internship_id": internship_id,
                    "match_score": match_score_int,
                }
            )
        return {"results": output_results}
    except Exception as e:
        return JSONResponse(
            content={"error": f"Unexpected error: {str(e)}"}, status_code=500
        )


@app.post("/refresh-cv-url")
def refresh_cv_url(payload: AnalyzeRequest):
    try:
        user_id = payload.user_id
        profile = get_user_profile(user_id)
        cv_url = profile.get("cv_url")
        if not cv_url:
            return JSONResponse(
                content={"error": "No CV found for user"}, status_code=404
            )

        # Parse filename gracefully
        filename = ""
        if "/object/sign/cvs/" in cv_url:
            filename = cv_url.split("/object/sign/cvs/")[1].split("?")[0]
        elif "/object/public/cvs/" in cv_url:
            filename = cv_url.split("/object/public/cvs/")[1].split("?")[0]
        elif "cvs/" in cv_url:
            filename = cv_url.split("cvs/")[1].split("?")[0]

        if not filename:
            raise Exception("Could not parse filename from existing CV URL")

        full_name = profile.get("full_name") or "Student"
        clean_name = "_".join(full_name.split())
        download_name = f"{clean_name}_CV.pdf"

        # Create new signed URL securely via Service Role Let
        signed_url_resp = supabase.storage.from_("cvs").create_signed_url(
            filename, 604800, {"download": download_name}
        )
        new_url = signed_url_resp.get("signedURL") or signed_url_resp.get("signedUrl")

        if not new_url:
            raise Exception("Failed to generate new signed URL")

        # Save the new URL back into the profile database
        save_cv_text_and_url(user_id, new_url, profile.get("cv_text", ""))

        return {"cv_url": new_url}
    except Exception as e:
        logger.error(f"[/refresh-cv-url] Unexpected error: {e}")
        return JSONResponse(
            content={"error": f"Failed to refresh URL: {str(e)}"}, status_code=500
        )


print("[startup] SUPABASE_URL:", SUPABASE_URL)
print("[startup] SUPABASE_KEY exists:", bool(SUPABASE_KEY))


class DraftCoverLetterRequest(BaseModel):
    user_id: str
    internship_id: str


@app.post("/draft-cover-letter")
def draft_cover_letter(payload: DraftCoverLetterRequest):
    try:
        user_id = payload.user_id
        internship_id = payload.internship_id

        # 1. Fetch User Profile & CV Text
        try:
            profile = get_user_profile(user_id)
        except Exception as e:
            if "Profile not found" in str(e):
                return JSONResponse(content={"error": str(e)}, status_code=404)
            raise

        cv_text = profile.get("cv_text")
        if not cv_text or not isinstance(cv_text, str) or not cv_text.strip():
            return JSONResponse(
                content={"error": "No CV text found for user. Please upload your CV first."}, 
                status_code=400
            )

        # 2. Fetch Internship Details
        try:
            internship_res = supabase.table("internships").select("*").eq("id", internship_id).single().execute()
            internship = internship_res.data
            if not internship:
                return JSONResponse(content={"error": "Internship not found."}, status_code=404)
        except Exception as e:
            logger.error(f"[/draft-cover-letter] Failed to fetch internship: {e}")
            return JSONResponse(content={"error": f"Failed to fetch internship: {str(e)}"}, status_code=500)

        # 3. Call AI
        prompt = f"""
You are an expert career coach writing a cover letter on behalf of a student.

Write a compelling, professional cover letter tailored specifically to this internship opportunity using the student's CV.
Keep it concise (3-4 short paragraphs maximum).
Focus on matching their specific experiences to the internship requirements.
Do NOT use placeholders like [Your Name] or [Company Name] if the information is provided.
The cover letter should be ready to send as-is.

<student_cv>
{cv_text}
</student_cv>

<internship_details>
Role: {internship.get('title') or internship.get('role')}
Company: {internship.get('company')}
Description: {internship.get('description')}
Requirements: {internship.get('requirements')}
</internship_details>

Return ONLY the raw cover letter text. Do not include any formatting like Markdown blocks or intro/outro explanations.
"""
        
        if not NVIDIA_API_KEY:
            logger.info("[AI] NVIDIA_API_KEY not set, returning dummy cover letter")
            return {"cover_letter": f"Dear Hiring Manager at {internship.get('company')},\n\nI am writing to express my interest in the {internship.get('role')} role. This is a dummy cover letter generated during testing without an AI API key.\n\nSincerely,\nA Candidate"}

        try:
            resp = requests.post(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=60,
            )
            resp.raise_for_status()
            raw_output = resp.json()["choices"][0]["message"]["content"]
            
            # Clean up potential LLM conversational wrapper
            clean_output = raw_output.strip()
            if clean_output.startswith("Here is the cover letter"):
                 clean_output = "\n".join(clean_output.split("\n")[1:]).strip()
                 
            return {"cover_letter": clean_output}
            
        except requests.exceptions.Timeout:
            return JSONResponse(content={"error": "AI Request timed out. Please try again later."}, status_code=504)
        except Exception as e:
            logger.error(f"[/draft-cover-letter] AI error: {e}")
            return JSONResponse(content={"error": "Failed to generate cover letter."}, status_code=500)
            
    except Exception as e:
        logger.error(f"[/draft-cover-letter] Unexpected error: {e}")
        return JSONResponse(
            content={"error": f"Unexpected error: {str(e)}"}, status_code=500
        )


class SubmitApplicationRequest(BaseModel):
    user_id: str
    internship_id: str
    cover_letter: str

@app.post("/submit-application")
def submit_application(payload: SubmitApplicationRequest):
    try:
        user_id = payload.user_id
        internship_id = payload.internship_id
        cover_letter = payload.cover_letter

        # 1. Fetch Student Profile
        student = get_user_profile(user_id)
        student_name = student.get("full_name", "A Student")
        student_cv_url = student.get("cv_url")

        # 2. Fetch Internship & Employer Profile
        internship_res = supabase.table("internships").select("*").eq("id", internship_id).single().execute()
        internship = internship_res.data
        if not internship:
            return JSONResponse(content={"error": "Internship not found."}, status_code=404)
        
        employer_id = internship.get("employer_id")
        employer_email = "test@example.com"
        company_name = internship.get("company", "Company")

        if employer_id:
            try:
                admin_user_res = supabase.auth.admin.get_user_by_id(employer_id)
                if admin_user_res and admin_user_res.user:
                    employer_email = admin_user_res.user.email
            except Exception as e:
                logger.warning(f"Could not load employer email from auth: {e}")

        # 3. Fetch Match Score
        match_score = None
        try:
            match_res = supabase.table("match_results").select("match_score").eq("user_id", user_id).eq("internship_id", internship_id).maybe_single().execute()
            if match_res.data:
                match_score = match_res.data.get("match_score")
        except Exception as e:
            logger.warning(f"Could not fetch match_score: {e}")

        # 4. Insert Application to DB
        app_data = {
            "user_id": user_id,
            "internship_id": internship_id,
            "cover_letter": cover_letter,
            "status": "pending",
            "match_score": match_score
        }
        supabase.table("applied_internships").insert([app_data]).execute()

        # 5. Handle Email Sending
        SMTP_EMAIL = os.getenv("SMTP_EMAIL")
        SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

        msg = MIMEMultipart()
        msg["Subject"] = f"Internship Application - {internship.get('title', internship.get('role', 'Position'))}"
        msg["From"] = SMTP_EMAIL or "noreply@pau-interconnect.com"
        msg["To"] = employer_email

        body = f"""Dear {company_name},

You have received a new internship application.

Position: {internship.get('title', internship.get('role', 'Position'))}
Applicant: {student_name}

Cover Letter:
{cover_letter}

You can review the full application in your employer dashboard.

Best regards,
Internship Platform
"""
        msg.attach(MIMEText(body, "plain"))

        if student_cv_url:
            filename = ""
            if "sign/cvs/" in student_cv_url:
                filename = student_cv_url.split("sign/cvs/")[1].split("?")[0]
            elif "public/cvs/" in student_cv_url:
                filename = student_cv_url.split("public/cvs/")[1].split("?")[0]
            elif "cvs/" in student_cv_url:
                filename = student_cv_url.split("cvs/")[1].split("?")[0]

            if filename:
                try:
                    clean_filename = filename.replace("cvs/", "") if filename.startswith("cvs/") else filename
                    pdf_bytes = supabase.storage.from_("cvs").download(clean_filename)
                    attach = MIMEApplication(pdf_bytes, _subtype="pdf")
                    attach_name = f"{student_name.replace(' ', '_')}_CV.pdf"
                    attach.add_header("Content-Disposition", "attachment", filename=attach_name)
                    msg.attach(attach)
                except Exception as dl_err:
                    logger.error(f"Failed to download CV for email attachment: {dl_err}")

        if SMTP_EMAIL and SMTP_PASSWORD:
            logger.info(f"Sending email to {employer_email} via SMTP...")
            try:
                server = smtplib.SMTP("smtp.gmail.com", 587)
                server.starttls()
                server.login(SMTP_EMAIL, SMTP_PASSWORD)
                server.send_message(msg)
                server.quit()
                logger.info("Email sent successfully!")
            except Exception as e:
                logger.error(f"Failed to send email via SMTP: {e}")
        else:
            logger.warning("\n--- TEST EMAIL CONSOLE LOG (SMTP missing) ---")
            logger.warning(f"To: {employer_email}")
            logger.warning(f"Subject: {msg['Subject']}")
            logger.warning(body)
            if student_cv_url:
                logger.warning(f"[Attachment] Included CV PDF for {student_name}")
            logger.warning("---------------------------------------------\n")

        return {"success": True, "message": "Application submitted successfully."}

    except Exception as e:
        logger.error(f"[/submit-application] Unexpected error: {e}")
        return JSONResponse(content={"error": f"Failed to submit application: {str(e)}"}, status_code=500)

@app.get("/internships/{internship_id}/applicants")
def get_internship_applicants(internship_id: str):
    """
    Fetch all applications for a specific internship.
    Joined with the student's profile natively bypassing RLS using Service Role Key.
    """
    try:
        # Fetch applications
        res_apps = supabase.table("applied_internships").select("*").eq("internship_id", internship_id).order("match_score", desc=True).execute()
        apps = res_apps.data or []
        
        if not apps:
            return {"applicants": []}
            
        user_ids = [a["user_id"] for a in apps if a.get("user_id")]
        
        if len(user_ids) == 0:
            return {"applicants": apps}
            
        # Fetch profiles
        res_profiles = supabase.table("profiles").select("id, full_name, course, level, cv_url").in_("id", user_ids).execute()
        profiles = res_profiles.data or []
        
        profile_map = {p["id"]: p for p in profiles}
        
        # Hydrate apps
        for a in apps:
            a["profiles"] = profile_map.get(a["user_id"])
            
        return {"applicants": apps}
        
    except Exception as e:
        logger.error(f"[/internships/{internship_id}/applicants] Error: {e}")
        return JSONResponse(
            content={"error": f"Failed to fetch applicants: {str(e)}"}, status_code=500
        )

@app.get("/admin/search")
def admin_search(q: str = ""):
    """
    Unified search endpoint for students, employers, and internships.
    """
    if not q or len(q) < 2:
        return {"students": [], "employers": [], "internships": []}
    
    try:
        # 1. Search students & employers (profiles table)
        # Using separate queries for cleaner result categorization
        res_profiles = supabase.table("profiles").select("*").or_(
            f"full_name.ilike.%{q}%,company_name.ilike.%{q}%,course.ilike.%{q}%"
        ).execute()
        
        all_profiles = res_profiles.data or []
        students = [p for p in all_profiles if not p.get("role") or p.get("role") == "student"]
        employers = [p for p in all_profiles if p.get("role") == "employer"]

        # 2. Search internships
        res_internships = supabase.table("internships").select("*").or_(
            f"role.ilike.%{q}%,company.ilike.%{q}%,category.ilike.%{q}%"
        ).execute()
        internships = res_internships.data or []

        return {
            "students": students,
            "employers": employers,
            "internships": internships
        }
    except Exception as e:
        logger.error(f"[/admin/search] Error: {e}")
        return JSONResponse(
            content={"error": f"Search failed: {str(e)}"}, status_code=500
        )


@app.get("/admin/directory")
def admin_directory():
    """
    Fetch all user profiles for the admin platform management view.
    Bypasses RLS using the Service Role Key.
    """
    try:
        res = supabase.table("profiles").select("*").order("created_at", desc=True).execute()
        profiles = res.data or []
        
        # Ensure 'course_of_study' is present for frontend compatibility
        for profile in profiles:
            if "course" in profile and "course_of_study" not in profile:
                profile["course_of_study"] = profile["course"]
        
        return profiles
    except Exception as e:
        logger.error(f"[/admin/directory] Error: {e}")
        return JSONResponse(
            content={"error": f"Failed to fetch directory: {str(e)}"}, status_code=500
        )


@app.get("/admin/analytics")
def admin_analytics():
    """
    Fetch and aggregate data for the admin analytics dashboard.
    Bypasses RLS using the Service Role Key.
    """
    try:
        # 1. Fetch live data
        res_internships = supabase.table("internships").select("id, role, company, category, deadline").execute()
        internships = res_internships.data or []
        
        res_applications = supabase.table("applied_internships").select("id, internship_id").execute()
        applications = res_applications.data or []

        # 2. Basic stats
        total_internships = len(internships)
        total_applications = len(applications)
        avg_applications = round(total_applications / total_internships, 1) if total_internships > 0 else 0.0

        # 3. Categorization logic
        cat_map = {}
        for job in internships:
            cat = job.get("category") or "Uncategorized"
            cat_map[cat] = cat_map.get(cat, 0) + 1
        
        sorted_categories = [
            {"label": k, "value": v} for k, v in cat_map.items()
        ]
        sorted_categories.sort(key=lambda x: x["value"], reverse=True)

        # 4. Internship stats (apps per internship)
        app_counts = {}
        for app in applications:
            iid = app.get("internship_id")
            if iid:
                app_counts[iid] = app_counts.get(iid, 0) + 1
        
        detailed_stats = []
        for job in internships:
            jid = job.get("id")
            title = job.get("role") or "Untitled Role"
            detailed_stats.append({
                "id": jid,
                "title": title,
                "company": job.get("company") or "Unknown Company",
                "category": job.get("category") or "Uncategorized",
                "deadline": job.get("deadline"),
                "applications": app_counts.get(jid, 0)
            })
        
        # Sort by applications descending
        detailed_stats.sort(key=lambda x: x["applications"], reverse=True)

        return {
            "total_internships": total_internships,
            "total_applications": total_applications,
            "avg_applications": str(avg_applications),
            "categories": sorted_categories,
            "internship_stats": detailed_stats
        }
    except Exception as e:
        logger.error(f"[/admin/analytics] Error: {e}")
        return JSONResponse(
            content={"error": f"Failed to fetch analytics: {str(e)}"}, status_code=500
        )


@app.get("/admin/stats")
def admin_stats():
    """
    Return high-level platform statistics for the admin overview dashboard.
    """
    try:
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

        # Total students (profiles where is_admin is false or null)
        total_students_res = supabase.table("profiles").select("id", count="exact").eq("is_admin", False).execute()
        total_students = total_students_res.count or 0

        # Total employers (profiles where is_admin is true — or adjust if you have a separate employer role)
        total_employers_res = supabase.table("profiles").select("id", count="exact").eq("is_admin", True).execute()
        total_employers = total_employers_res.count or 0

        # Total internships
        total_internships_res = supabase.table("internships").select("id", count="exact").execute()
        total_internships = total_internships_res.count or 0

        # Total applications
        total_applications_res = supabase.table("applied_internships").select("id", count="exact").execute()
        total_applications = total_applications_res.count or 0

        # Applications submitted today
        apps_today_res = supabase.table("applied_internships").select("id", count="exact").gte("created_at", today_start).execute()
        apps_today = apps_today_res.count or 0

        # New users registered today
        new_users_res = supabase.table("profiles").select("id", count="exact").gte("created_at", today_start).execute()
        new_users_today = new_users_res.count or 0

        return {
            "total_students": total_students,
            "total_employers": total_employers,
            "total_internships": total_internships,
            "total_applications": total_applications,
            "applications_today": apps_today,
            "new_users_today": new_users_today,
        }
    except Exception as e:
        logger.error(f"[/admin/stats] Error: {e}")
        return JSONResponse(
            content={"error": f"Failed to fetch stats: {str(e)}"}, status_code=500
        )


class ApplicationStatusUpdate(BaseModel):
    status: str

@app.put("/applications/{application_id}/status")
def update_application_status(application_id: str, payload: ApplicationStatusUpdate):
    """
    Securely update the status of an application (e.g., pending, accepted, rejected).
    Bypasses RLS by using the Service Role Key on the backend.
    """
    try:
        if payload.status not in ["pending", "accepted", "rejected"]:
            return JSONResponse(content={"error": "Invalid status value"}, status_code=400)
            
        res = supabase.table("applied_internships").update({"status": payload.status}).eq("id", application_id).execute()
        
        return {"success": True, "message": f"Application status updated to {payload.status}"}
    except Exception as e:
        logger.error(f"[/applications/{application_id}/status] Error: {e}")
        return JSONResponse(
            content={"error": f"Failed to update application status: {str(e)}"}, status_code=500
        )
