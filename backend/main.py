# backend/main.py
import json
import os
from datetime import datetime

import pdfplumber
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

app = FastAPI()

# Allow your frontend to talk to this API
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USERS_FILE = "users.json"


# Helper: extract text from PDF
def extract_text(file):
    with pdfplumber.open(file) as pdf:
        text = ""
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


# Save users
def load_users():
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, "w") as f:
            json.dump({}, f)
    with open(USERS_FILE, "r") as f:
        return json.load(f)


def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=4)


def save_analysis(name, email, cv_filename, analysis_text):
    users = load_users()
    key = email.lower()
    if key not in users:
        users[key] = {"name": name, "email": email, "cv_analysis": []}
    users[key]["cv_analysis"].append(
        {
            "file_name": cv_filename,
            "date": datetime.utcnow().isoformat(),
            "analysis": analysis_text,
        }
    )
    save_users(users)


# Endpoint
@app.post("/analyze")
async def analyze(
    name: str = Form(...),
    email: str = Form(...),
    internships: str = Form(...),  # JSON string
    file: UploadFile = File(...),
):
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    file_path = os.path.join(upload_dir, file.filename)

    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        return {"error": f"Failed to save uploaded file: {str(e)}"}

    try:
        cv_text = extract_text(file_path)
    except Exception as e:
        return {"error": f"Failed to extract text from PDF: {str(e)}"}

    prompt = f"""
You are an expert HR AI assistant.

Given the CV text below and a list of internships, analyze how well the candidate fits each one.

For each internship, return:
- Match score (0–100%)
- Matching skills
- Missing skills
- Short reasoning (max 3 sentences)

CV:
{cv_text}

Internships:
{internships}
"""

    try:
        response = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
            json={
                "model": "meta/llama-3.1-70b-instruct",
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        response.raise_for_status()
        analysis_text = response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return {"error": f"Failed to get analysis from NVIDIA API: {str(e)}"}

    try:
        save_analysis(name, email, file.filename, analysis_text)
    except Exception as e:
        return {"error": f"Failed to save analysis: {str(e)}"}

    return {"analysis": analysis_text}
