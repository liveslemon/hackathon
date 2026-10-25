import logging
import hashlib
from services.embedding_service import get_embedding
from services.llm_service import generate_completion
from services.matching_service import compute_cosine_similarity, analyze_skills
from services.cv_parser_service import compute_structured_match, parse_job_structured
from services.cache_service import embedding_cache, match_result_cache

logger = logging.getLogger(__name__)

async def get_cached_embedding(text: str) -> list[float]:
    """Wraps get_embedding with memory cache to save API calls."""
    if not text:
        return []
        
    text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
    cached = embedding_cache.get(text_hash)
    if cached is not None:
        return cached
        
    embedding = await get_embedding(text)
    embedding_cache.set(text_hash, embedding)
    return embedding

from services.match_scoring import score_pair, SCORE_VERSION

async def compute_match_score(cv_text: str, job: dict, cv_structured: dict = None) -> dict:
    """
    Computes CV-to-Job match score using the canonical score_pair module.
    Deterministic, cheap: structured skills overlap + embedding cosine + keywords.
    """
    import asyncio

    job_id = job.get("id", "unknown_job")
    cv_hash = hashlib.sha256(cv_text.encode("utf-8")).hexdigest()[:16]
    cache_key = f"{cv_hash}_{job_id}_v{SCORE_VERSION}"

    cached_result = match_result_cache.get(cache_key)
    if cached_result:
        logger.info(f"Serving match from cache for Job: {job_id}")
        return cached_result

    job_title = job.get("title") or job.get("role") or ""
    job_desc = job.get("description", "")
    reqs = job.get("requirements", "")
    company = job.get("company", "")
    req_skills = job.get("required_skills") or []

    if isinstance(reqs, list):
        reqs_text = ", ".join(str(r) for r in reqs if r)
    else:
        reqs_text = str(reqs or "")

    full_job_text = f"Role: {job_title}. Company: {company}. Description: {job_desc}. Requirements: {reqs_text}"
    sim_score = 0.5
    try:
        cv_emb, job_emb = await asyncio.gather(
            get_cached_embedding(cv_text[:6000]),
            get_cached_embedding(full_job_text),
        )
        if cv_emb and job_emb:
            sim_score = compute_cosine_similarity(cv_emb, job_emb)
    except Exception as e:
        logger.warning(f"Embedding failed for job {job_id}: {e}")

    student_features = {
        "text": cv_text,
        "structured": cv_structured,
    }
    job_features = {
        "role": job_title,
        "company": company,
        "requirements": reqs_text,
        "required_skills": req_skills,
        "description": job_desc,
        "category": job.get("category", ""),
        "field": job.get("field", ""),
        "cosine_similarity": sim_score,
    }

    scored = score_pair(student_features, job_features)

    result = {
        "internship_id": job_id,
        "match_score": scored["match_score"],
        "matching_skills": scored["matching_skills"],
        "missing_skills": scored["missing_skills"],
        "reasoning": scored["instant_reasoning"],
        "instant_reasoning": scored["instant_reasoning"],
        "score_breakdown": scored["breakdown"],
        "inputs_hash": scored["inputs_hash"],
        "score_version": SCORE_VERSION,
    }

    match_result_cache.set(cache_key, result)
    return result
    parts = []
    if breakdown:
        parts.append(f"Skills match: {breakdown.get('skills', 0)}%")
        parts.append(f"Experience fit: {breakdown.get('experience', 0)}%")
        if breakdown.get('education', 0) > 50:
            parts.append(f"Education alignment: {breakdown.get('education', 0)}%")
    if semantic > 0:
        parts.append(f"Semantic similarity: {semantic}%")
    return f"Match score {final}%. " + ", ".join(parts) + "." if parts else f"Match score: {final}%."

def _contact_block(student_name: str, user_email: str, phone: str = "") -> str:
    """Contact header for a letter. Lines without data are left out rather
    than filled with placeholders like "[phone number]"."""
    lines = [f"Name: {student_name}"]
    if user_email and user_email != "[email]":
        lines.append(f"Email: {user_email}")
    if phone and phone.strip():
        lines.append(f"Phone: {phone.strip()}")
    return "\n".join(lines)


async def generate_cover_letter(student_name: str, user_email: str, profile_text: str, job: dict, existing_letter: str = "", phone: str = "") -> str:
    """
    Generates or enhances a professional motivation letter using the LLM Service.
    If existing_letter is provided, enhances it. Otherwise, drafts from scratch.
    """
    job_title = job.get("title") or job.get("role") or "Internship"
    company = job.get("company", "the Company")
    job_desc = job.get("description", "")
    
    system_prompt = "You are an expert career advisor who writes compelling, authentic motivation letters that focus on genuine interest and alignment with the company's mission."
    
    contact_block = _contact_block(student_name, user_email, phone)
    
    if existing_letter.strip():
        # ENHANCE MODE: use a strict editing system prompt
        system_prompt = (
            "You are a professional text editor. Your ONLY job is to polish and improve text that is given to you. "
            "You must NEVER write new content from scratch. You must NEVER ignore the input text. "
            "The output must contain the same core sentences as the input, with improved grammar, vocabulary, and flow."
        )
        user_prompt = (
            f"EDIT the following motivation letter for a {job_title} position at {company}. "
            f"This is the student's own writing. Your job is to IMPROVE it, not replace it.\n\n"
            f"Add this contact header at the very top:\n{contact_block}\n\n"
            f"STUDENT'S TEXT TO EDIT:\n\"\"\"\n{existing_letter}\n\"\"\"\n\n"
            f"RULES:\n"
            f"1. The student's original sentences MUST appear in your output (improved but recognizable).\n"
            f"2. Fix grammar, spelling, and awkward phrasing.\n"
            f"3. You may add 1-2 short sentences or a closing paragraph to strengthen the letter, but they must relate to what the student already wrote.\n"
            f"4. Do NOT add achievements, skills, or experiences that the student did not mention.\n"
            f"5. Do NOT write a completely new letter. If I cannot see the student's original ideas in your output, you have failed.\n"
            f"6. No email headers (Subject/To/From). Format as a motivation letter.\n"
        )
    else:
        # DRAFT MODE: write from scratch
        user_prompt = (
            f"Write a professional Motivation Letter for {company} - {job_title}.\n\n"
            f"JOB DESCRIPTION:\n{job_desc}\n\n"
            f"CV (for reference only — do NOT copy or repeat it):\n{profile_text}\n\n"
            f"INSTRUCTIONS:\n"
            f"1. Place these contact details at the very top:\n{contact_block}\n"
            f"2. Focus on WHY the student wants to join {company} specifically — what excites them about the role and mission.\n"
            f"3. Show genuine enthusiasm and how the student's interests align with the company's work.\n"
            f"4. Do NOT simply list or repeat what's in the CV. Instead, connect 1-2 relevant experiences to the role naturally.\n"
            f"5. Highlight the student's eagerness to learn and contribute, not just past achievements.\n"
            f"6. Format as a Motivation Letter (no email headers like Subject/To/From, no email signatures).\n"
            f"7. Start with a professional salutation after the contact info.\n"
            f"8. Keep it concise and captivating — no more than 350 words after the contact block.\n"
        )
    
    try:
        letter = await generate_completion(user_prompt, system_message=system_prompt)
        return letter
    except Exception as e:
        logger.error(f"Routing Service - Cover Letter Fallback Failed: {e}")
        raise ValueError("Could not generate cover letter at this time. All API providers failed.")

async def generate_cover_letter_stream(student_name: str, user_email: str, profile_text: str, job: dict, existing_letter: str = "", phone: str = ""):
    """
    Streams a professional motivation letter using the LLM Service.
    """
    job_title = job.get("title") or job.get("role") or "Internship"
    company = job.get("company", "the Company")
    job_desc = job.get("description", "")
    
    system_prompt = "You are an expert career advisor who writes compelling, authentic motivation letters that focus on genuine interest and alignment with the company's mission."
    
    contact_block = _contact_block(student_name, user_email, phone)
    
    if existing_letter.strip():
        # ENHANCE MODE: use a strict editing system prompt
        system_prompt = (
            "You are a professional text editor. Your ONLY job is to polish and improve text that is given to you. "
            "You must NEVER write new content from scratch. You must NEVER ignore the input text. "
            "The output must contain the same core sentences as the input, with improved grammar, vocabulary, and flow."
        )
        user_prompt = (
            f"EDIT the following motivation letter for a {job_title} position at {company}. "
            f"This is the student's own writing. Your job is to IMPROVE it, not replace it.\n\n"
            f"Add this contact header at the very top:\n{contact_block}\n\n"
            f"STUDENT'S TEXT TO EDIT:\n\"\"\"\n{existing_letter}\n\"\"\"\n\n"
            f"RULES:\n"
            f"1. The student's original sentences MUST appear in your output (improved but recognizable).\n"
            f"2. Fix grammar, spelling, and awkward phrasing.\n"
            f"3. You may add 1-2 short sentences or a closing paragraph to strengthen the letter, but they must relate to what the student already wrote.\n"
            f"4. Do NOT add achievements, skills, or experiences that the student did not mention.\n"
            f"5. Do NOT write a completely new letter. If I cannot see the student's original ideas in your output, you have failed.\n"
            f"6. No email headers (Subject/To/From). Format as a motivation letter.\n"
        )
    else:
        # DRAFT MODE: write from scratch
        user_prompt = (
            f"Write a professional Motivation Letter for {company} - {job_title}.\n\n"
            f"JOB DESCRIPTION:\n{job_desc}\n\n"
            f"CV (for reference only — do NOT copy or repeat it):\n{profile_text}\n\n"
            f"INSTRUCTIONS:\n"
            f"1. Place these contact details at the very top:\n{contact_block}\n"
            f"2. Focus on WHY the student wants to join {company} specifically — what excites them about the role and mission.\n"
            f"3. Show genuine enthusiasm and how the student's interests align with the company's work.\n"
            f"4. Do NOT simply list or repeat what's in the CV. Instead, connect 1-2 relevant experiences to the role naturally.\n"
            f"5. Highlight the student's eagerness to learn and contribute, not just past achievements.\n"
            f"6. Format as a Motivation Letter (no email headers like Subject/To/From, no email signatures).\n"
            f"7. Start with a professional salutation after the contact info.\n"
            f"8. Keep it concise and captivating — no more than 350 words after the contact block.\n"
        )
    
    try:
        from services.llm_service import generate_completion_stream
        async for chunk in generate_completion_stream(user_prompt, system_message=system_prompt):
            yield chunk
    except Exception as e:
        logger.error(f"Routing Service - Cover Letter Streaming Failed: {e}")
        yield "Error: Could not generate cover letter at this time."

async def enhance_logbook_entry(raw_activities: str) -> str:
    """
    Takes a rough draft of student logbook activities and uses the LLM to polish 
    it into professional, concise bullet points suitable for an official SIWES logbook.
    """
    system_prompt = (
        "You are a professional technical writer and editor. Your job is to take a student's rough notes "
        "about their daily internship activities and polish them into clear, professional, and concise bullet points. "
        "DO NOT add new tasks or skills they didn't mention. JUST enhance their grammar, vocabulary, and active voice. "
        "Remove filler words. Keep it strictly factual."
    )
    
    user_prompt = (
        "Please enhance the following daily logbook entry into professional bullet points.\n\n"
        f"STUDENT'S ROUGH NOTES:\n\"\"\"\n{raw_activities}\n\"\"\"\n\n"
        "OUTPUT FORMAT: Return ONLY the bulleted list. Do not include introductory or concluding text."
    )
    
    try:
        polished = await generate_completion(user_prompt, system_message=system_prompt)
        return polished.strip()
    except Exception as e:
        logger.error(f"Routing Service - Logbook Enhance Failed: {e}")
        raise ValueError("Could not enhance logbook entry at this time.")
