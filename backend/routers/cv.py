import asyncio
import logging
import os
import tempfile
import uuid

from core.db import supabase
from core.security import get_current_user, verify_admin
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from schemas.requests import AnalyzeNewInternshipRequest, AnalyzeRequest
from services.routing_service import compute_match_score
from services.cv_parser_service import parse_cv_structured
from services.supabase_service import (
    extract_text,
    fetch_internships,
    get_user_profile,
    save_cv_text_and_url,
    upsert_match_result,
)

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_CV_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MIN_CV_TEXT_LENGTH = 50  # Minimum chars for a valid CV extraction


def clean_cv_text(text: str) -> str:
    """Normalize extracted CV text: collapse whitespace, remove control chars."""
    import re
    # Remove null bytes and control characters (except newlines/tabs)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # Collapse multiple blank lines into one
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Collapse multiple spaces into one
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()


async def process_matches_in_background(user_id: str, cv_text: str, internships: list, cv_structured: dict = None):
    """
    Efficient matching: uses vector similarity to find top-K matches,
    then only runs detailed analysis on those. Reduces API calls from O(n) to O(k).
    """
    from services.vector_matching_service import find_top_matches_for_user, store_cv_embedding

    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Step 1: Ensure CV embedding is stored (1 API call)
            await store_cv_embedding(user_id, cv_text)

            # Step 2: Find top matches using vector similarity (minimal API calls)
            results = await find_top_matches_for_user(
                user_id, cv_text, cv_structured=cv_structured
            )

            # Step 3: Store results
            matches_found = 0
            for res in results:
                upsert_match_result(user_id, res.get("internship_id"), res)
                matches_found += 1

            logger.info(
                f"Background match processing completed for user {user_id}. "
                f"Found {matches_found} matches (vector-based top-K)."
            )
            return  # Success
        except Exception as e:
            logger.error(f"Background match attempt {attempt + 1}/{max_retries} failed for user {user_id}: {e}", exc_info=True)
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)


async def process_new_internship_background(iid: str, job: dict, students: list):
    """
    When a new internship is posted, compute its embedding once,
    then find top matching students via vector similarity.
    """
    from services.vector_matching_service import store_job_embedding, find_top_students_for_job

    try:
        # Step 1: Compute and store job embedding + structure (1 embed + 1 LLM call)
        await store_job_embedding(iid, job)

        # Step 2: Find top students by vector similarity (no API calls)
        top_students = await find_top_students_for_job(iid, job)

        # Step 3: Run detailed matching only for top students
        success = 0
        semaphore = asyncio.Semaphore(2)

        async def bounded_student_match(student_match: dict):
            async with semaphore:
                try:
                    uid = student_match["user_id"]
                    # Fetch full student data
                    res = supabase.table("profiles").select(
                        "id, cv_text, cv_structured"
                    ).eq("id", uid).single().execute()
                    student = res.data
                    if not student or not student.get("cv_text"):
                        return 0

                    cv_structured = student.get("cv_structured")
                    if isinstance(cv_structured, str):
                        import json
                        try:
                            cv_structured = json.loads(cv_structured)
                        except (json.JSONDecodeError, TypeError):
                            cv_structured = None

                    result = await compute_match_score(student["cv_text"], job, cv_structured=cv_structured)
                    if result:
                        upsert_match_result(uid, iid, result)
                        return 1
                except Exception as e:
                    logger.error(f"AI Skip for {student_match.get('user_id')}: {e}")
                return 0

        if top_students:
            results = await asyncio.gather(
                *(bounded_student_match(s) for s in top_students),
                return_exceptions=False,
            )
            success = sum(results)

        logger.info(
            f"Background processing for new internship {iid} completed. "
            f"Analyzed {success} top students (vector-filtered from {len(students)} total)."
        )
    except Exception as e:
        logger.error(f"Background processing failed for new internship {iid}: {e}")


@router.post("/upload-and-analyze")
@router.post("/api/upload-and-analyze")
async def upload_and_analyze(
    background_tasks: BackgroundTasks,
    user_id: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")

    temp_path = None
    try:
        profile = get_user_profile(user_id)
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDFs are supported.")

        content = await file.read()

        if len(content) > MAX_CV_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_CV_FILE_SIZE // (1024*1024)}MB.",
            )

        if len(content) < 100:
            raise HTTPException(status_code=400, detail="File appears to be empty or corrupted.")

        storage_filename = f"{uuid.uuid4()}.pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            temp_path = tmp.name

        supabase.storage.from_("cvs").upload(
            storage_filename, content, {"content-type": "application/pdf"}
        )
        url_resp = supabase.storage.from_("cvs").create_signed_url(
            storage_filename, 604800
        )
        cv_url = url_resp.get("signedURL") or url_resp.get("signedUrl")

        # Run PDF text extraction off the event loop (blocking I/O)
        cv_text = await asyncio.to_thread(extract_text, temp_path)

        if not cv_text or len(cv_text.strip()) < MIN_CV_TEXT_LENGTH:
            logger.warning(f"CV text extraction yielded insufficient text for user {user_id} ({len(cv_text.strip())} chars)")
            raise HTTPException(
                status_code=400,
                detail="Could not extract enough text from your PDF. "
                "Please ensure your CV is not a scanned image and contains selectable text.",
            )

        # Clean and normalize the extracted text
        cv_text = clean_cv_text(cv_text)

        # Parse CV into structured fields (skills, experience, education, projects)
        # This is the key refinement: done ONCE at upload, reused for every match
        cv_structured = await parse_cv_structured(cv_text)

        # Store CV text, URL, and structured data
        save_cv_text_and_url(user_id, cv_url, cv_text, cv_structured=cv_structured)

        internships = fetch_internships()
        if internships:
            background_tasks.add_task(
                process_matches_in_background, user_id, cv_text, internships, cv_structured
            )

        return {
            "message": "CV uploaded. AI matching is processing in the background.",
            "cv_url": cv_url,
            "text_length": len(cv_text),
            "internships_count": len(internships),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/upload-and-analyze] Fatal: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="CV upload failed. Please try again.")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/analyze-new-internship")
@router.post("/api/analyze-new-internship")
async def analyze_new_internship(
    payload: AnalyzeNewInternshipRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    try:
        iid = payload.internship_id
        res_job = supabase.table("internships").select("*").eq("id", iid).execute()
        if not res_job.data:
            raise HTTPException(status_code=404, detail="Internship not found.")

        job = res_job.data[0]
        res_students = (
            supabase.table("profiles")
            .select("id, cv_text, cv_structured")
            .eq("role", "student")
            .neq("cv_text", None)
            .execute()
        )
        students = res_students.data or []

        if students:
            background_tasks.add_task(
                process_new_internship_background, iid, job, students
            )

        return {
            "message": f"AI matching for new internship started in the background for {len(students)} students."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/analyze-new-internship] Fatal: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to start analysis.")


@router.post("/analyze-existing-cv")
@router.post("/api/analyze-existing-cv")
async def analyze_existing(
    payload: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        p = get_user_profile(payload.user_id)
        if not p.get("cv_text"):
            raise HTTPException(status_code=400, detail="No CV found. Please upload a CV first.")

        # Load stored structured data if available
        cv_structured = None
        raw_structured = p.get("cv_structured")
        if raw_structured:
            import json as _json
            try:
                cv_structured = _json.loads(raw_structured) if isinstance(raw_structured, str) else raw_structured
            except (ValueError, TypeError):
                pass

        jobs = fetch_internships()
        if jobs:
            background_tasks.add_task(
                process_matches_in_background, payload.user_id, p["cv_text"], jobs, cv_structured
            )

        return {"message": "Re-analysis started in the background."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/analyze-existing-cv] Fatal: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Re-analysis failed.")


@router.post("/refresh-cv-url")
@router.post("/api/refresh-cv-url")
def refresh_url(payload: AnalyzeRequest, current_user=Depends(get_current_user)):
    # Authorization: Student can refresh their own, or an employer can refresh any student's
    if (
        payload.user_id != current_user.id
        and current_user.user_metadata.get("role") != "employer"
        and getattr(current_user, "role", None) != "employer"
    ):
        # Double check role from profile if not in JWT
        profile = get_user_profile(current_user.id)
        if profile.get("role") != "employer" and profile.get("role") != "admin":
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You do not have permission to refresh this URL.",
            )

    try:
        p = get_user_profile(payload.user_id)
        url = p.get("cv_url", "")
        if not url:
            raise HTTPException(status_code=404, detail="No CV URL found.")

        filename = ""
        # Improved URL parsing: extract storage path safely
        from urllib.parse import urlparse, unquote
        parsed = urlparse(url)
        path = unquote(parsed.path)
        if "cvs/" in path:
            parts = path.split("cvs/")
            if len(parts) > 1:
                filename = parts[1].split("?")[0]

        if not filename:
            raise ValueError(f"Could not parse filename from URL: {url}")

        # Refresh for another 7 days
        signed = supabase.storage.from_("cvs").create_signed_url(filename, 604800)
        new_url = signed.get("signedURL") or signed.get("signedUrl")

        if not new_url:
            raise ValueError("Supabase failed to generate a new signed URL")

        save_cv_text_and_url(payload.user_id, new_url, p.get("cv_text", ""))
        return {"cv_url": new_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/refresh-cv-url] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to refresh CV URL.")


@router.get("/my-matches")
@router.get("/api/my-matches")
def get_my_matches(user_id: str, current_user=Depends(get_current_user)):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: User ID mismatch.")
    try:
        res = (
            supabase.table("match_results").select("*").eq("user_id", user_id).execute()
        )
        return {"matches": res.data or []}
    except Exception as e:
        logger.error(f"Error fetching matches: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch matches.")


@router.get("/recommendations")
@router.get("/api/recommendations")
def get_recommendations(
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    min_score: int = Query(25, ge=0, le=100),
    category: str = Query(None),
):
    """
    Returns precomputed internship recommendations for the current user,
    ranked by match score. Excludes internships already applied to.
    """
    try:
        user_id = current_user.id
        offset = (page - 1) * page_size

        # Get internships the user already applied to
        applied_res = (
            supabase.table("applied_internships")
            .select("internship_id")
            .eq("user_id", user_id)
            .execute()
        )
        applied_ids = {a["internship_id"] for a in (applied_res.data or [])}

        # Get match results with internship details, ordered by score
        query = (
            supabase.table("match_results")
            .select("internship_id, match_score, matching_skills, missing_skills, reasoning, updated_at, internships(id, role, company, category, description, created_at)")
            .eq("user_id", user_id)
            .gte("match_score", min_score)
            .order("match_score", desc=True)
        )

        res = query.execute()
        rows = res.data or []

        # Post-filter: remove applied internships and optionally filter by category
        recommendations = []
        for row in rows:
            if row["internship_id"] in applied_ids:
                continue
            internship = row.get("internships")
            if not internship:
                continue
            if category and internship.get("category", "").lower() != category.lower():
                continue

            # Enforce diversity: max 3 per company
            company = internship.get("company", "")
            company_count = sum(
                1 for r in recommendations
                if r.get("company", "").lower() == company.lower()
            )
            if company_count >= 3:
                continue

            recommendations.append({
                "internship_id": row["internship_id"],
                "role": internship.get("role"),
                "company": company,
                "category": internship.get("category"),
                "description": internship.get("description", "")[:300],
                "match_score": row["match_score"],
                "matching_skills": row.get("matching_skills", []),
                "missing_skills": row.get("missing_skills", []),
                "reasoning": row.get("reasoning", ""),
                "matched_at": row.get("updated_at"),
                "posted_at": internship.get("created_at"),
            })

        # Paginate the filtered results
        total = len(recommendations)
        paginated = recommendations[offset : offset + page_size]

        return {
            "recommendations": paginated,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
            },
        }
    except Exception as e:
        logger.error(f"Error fetching recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch recommendations.")


@router.get("/debug/match-results/{user_id}")
def debug_results(user_id: str, current_user=Depends(verify_admin)):
    """Admin-only debug endpoint for inspecting match results."""
    try:
        res = (
            supabase.table("match_results").select("*").eq("user_id", user_id).execute()
        )
        return {"user_id": user_id, "count": len(res.data), "data": res.data}
    except Exception as e:
        logger.error(f"Debug match-results error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch debug data.")
