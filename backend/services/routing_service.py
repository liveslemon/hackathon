import logging
import hashlib
from services.embedding_service import get_embedding
from services.llm_service import generate_completion
from services.matching_service import compute_cosine_similarity, analyze_skills
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

async def compute_match_score(cv_text: str, job: dict) -> dict:
    """
    Orchestrates the CV to Job match process.
    Uses embeddings for core scoring and keyword extraction for skills arrays.
    """
    job_id = job.get("id", "unknown_job")
    cv_hash = hashlib.md5(cv_text.encode("utf-8")).hexdigest()
    cache_key = f"{cv_hash}_{job_id}"
    
    cached_result = match_result_cache.get(cache_key)
    if cached_result:
        logger.info(f"Serving match from cache for Job: {job_id}")
        return cached_result

    # 1. Prepare Job Text
    job_title = job.get("title") or job.get("role") or ""
    job_desc = job.get("description", "")
    reqs = job.get("requirements", "")
    
    # Handle list requirements if stored as array
    if isinstance(reqs, list):
        reqs_text = " ".join(reqs)
        req_list = reqs
    else:
        reqs_text = str(reqs)
        req_list = [r.strip() for r in reqs_text.split('\n') if r.strip()]
        
    full_job_text = f"{job_title} {job_desc} {reqs_text}"
    
    # 2. Get Embeddings Contextually
    # Note: they run sequentially here, but you could run them via asyncio.gather for speed.
    import asyncio
    try:
        cv_emb, job_emb = await asyncio.gather(
            get_cached_embedding(cv_text),
            get_cached_embedding(full_job_text)
        )
    except Exception as e:
        logger.error(f"Embedding failed: {e}. Falling back to 50% match.")
        cv_emb, job_emb = [1.0], [0.0]  # Force a safe fallback 

    # 3. Compute Similarity
    sim_score = compute_cosine_similarity(cv_emb, job_emb)
    semantic_percent = max(0, min(100, int((sim_score - 0.2) * 125)))
    
    # 4. Extract Skills & Keyword Score
    matching, missing, keyword_ratio = analyze_skills(cv_text, req_list)
    keyword_percent = int(keyword_ratio * 100)
    
    # 5. Hybrid Score (70% semantic, 30% keyword)
    final_score = int((semantic_percent * 0.7) + (keyword_percent * 0.3))
    
    result = {
        "internship_id": job_id,
        "match_score": final_score,
        "matching_skills": matching,
        "missing_skills": missing,
        "reasoning": "Hybird Score: 70% Semantic Embedding Similarity, 30% Exact Keyword Overlap."
    }
    
    match_result_cache.set(cache_key, result)
    return result

async def generate_cover_letter(student_name: str, user_email: str, profile_text: str, job: dict, existing_letter: str = "") -> str:
    """
    Generates or enhances a professional motivation letter using the LLM Service.
    If existing_letter is provided, enhances it. Otherwise, drafts from scratch.
    """
    job_title = job.get("title") or job.get("role") or "Internship"
    company = job.get("company", "the Company")
    job_desc = job.get("description", "")
    
    system_prompt = "You are an expert career advisor who writes compelling, authentic motivation letters that focus on genuine interest and alignment with the company's mission."
    
    contact_block = (
        f"Name: {student_name}\n"
        f"Email: {user_email}\n"
        f"Phone: [phone number]"
    )
    
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
        polished = await generate_completion(user_prompt, system_message=system_prompt, model="llama-3.3-70b-versatile")
        return polished.strip()
    except Exception as e:
        logger.error(f"Routing Service - Logbook Enhance Failed: {e}")
        raise ValueError("Could not enhance logbook entry at this time.")
