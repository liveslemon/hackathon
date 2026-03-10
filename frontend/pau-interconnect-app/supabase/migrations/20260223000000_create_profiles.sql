# backend/main.py
import json
import os
import uuid
from datetime import datetime

import pdfplumber
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client, create_client

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not NVIDIA_API_KEY:
    raise ValueError("NVIDIA_API_KEY is not set")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase credentials are not set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================
# Helpers
# ================================

def extract_text(file_path: str) -> str:
    with pdfplumber.open(file_path) as pdf:
        text = ""
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def get_user_profile(user_id: str):
    res = supabase.table("profiles").select("*").eq("id", user_id).execute()
    if not res.data:
        raise Exception("Profile not found.")
    return res.data[0]


def save_cv_text(user_id: str, cv_url: str, cv_text: str):
    supabase.table("profiles").update(
        {
            "cv_url": cv_url,
            "cv_text": cv_text,
            "updated_at": datetime.utcnow().isoformat(),
        }
    ).eq("id", user_id).execute()


def fetch_internships():
    res = supabase.table("internships").select("*").execute()
    return res.data or []


def upsert_match_result(user_id: str, internship_id: str, result: dict):
    supabase.table("match_results").upsert(
        {
            "user_id": user_id,
            "internship_id": internship_id,
            "match_score": result.get("match_score"),
            "matching_skills": result.get("matching_skills"),
            "missing_skills": result.get("missing_skills"),
            "reasoning": result.get("reasoning"),
            "updated_at": datetime.utcnow().isoformat(),
        }
    ).execute()


# ================================
# Endpoint: Upload CV & Run Match
# ================================

@app.post("/upload-and-analyze")
async def upload_and_analyze(
    user_id: str = Form(...),
    file: UploadFile = File(...),
):
    if not file.filename.lower().endswith(".pdf"):
        return {"error": "Only PDF files are allowed"}

    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    safe_filename = f"{uuid.uuid4()}.pdf"
    file_path = os.path.join(upload_dir, safe_filename)

    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        return {"error": f"Failed to save file: {str(e)}"}

    try:
        cv_text = extract_text(file_path)
    except Exception as e:
        return {"error": f"Failed to extract text: {str(e)}"}

    try:
        save_cv_text(user_id, safe_filename, cv_text)
    except Exception as e:
        return {"error": f"Failed to save CV data: {str(e)}"}

    internships = fetch_internships()

    if not internships:
        return {"message": "CV saved but no internships found."}

    prompt = f"""
You are a professional HR recruitment analyst.

Analyze the candidate CV against each internship provided.

Return your response strictly in this JSON format:

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

CV:
{cv_text}

Internships:
{json.dumps(internships, indent=2)}
"""

    try:
        response = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
            json={
                "model": "meta/llama-3.1-70b-instruct",
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        response.raise_for_status()
        raw_output = response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return {"error": f"AI request failed: {str(e)}"}

    try:
        results = json.loads(raw_output)
    except Exception:
        return {"error": "AI response was not valid JSON", "raw_output": raw_output}

    try:
        for result in results:
            upsert_match_result(
                user_id=user_id,
                internship_id=result.get("internship_id"),
                result=result,
            )
    except Exception as e:
        return {"error": f"Failed saving match results: {str(e)}"}

    return {"message": "CV uploaded and matches computed successfully"}
