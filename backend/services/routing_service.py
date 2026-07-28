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

async def compute_match_score(cv_text: str, job: dict, cv_structured: dict = None) -> dict:
    """
    Orchestrates the CV-to-Job match process using a refined multi-stage pipeline:

    Stage 1: Structured match (fast, no AI calls) — compares parsed CV fields vs parsed job fields
    Stage 2: Semantic embedding similarity — captures meaning beyond exact keywords
    Stage 3: Blend scores — 55% structured + 35% semantic + 10% keyword overlap
    Stage 4: LLM reasoning — only for matches scoring >= 40 (cost optimization)

    If cv_structured is provided (pre-parsed at upload time), Stage 1 is essentially free.
    """
    import asyncio

    job_id = job.get("id", "unknown_job")
    cv_hash = hashlib.sha256(cv_text.encode("utf-8")).hexdigest()[:16]
    cache_key = f"{cv_hash}_{job_id}"

    cached_result = match_result_cache.get(cache_key)
    if cached_result:
        logger.info(f"Serving match from cache for Job: {job_id}")
        return cached_result

    job_title = job.get("title") or job.get("role") or ""
    job_desc = job.get("description", "")
    reqs = job.get("requirements", "")
    company = job.get("company", "")

    if isinstance(reqs, list):
        reqs_text = ", ".join(reqs)
        req_list = reqs
    else:
        reqs_text = str(reqs)
        req_list = [r.strip() for r in reqs_text.replace(",", "\n").split("\n") if r.strip()]

    # --- Stage 1: Structured Match (fast path, no AI calls) ---
    structured_score = 0
    structured_matched = []
    structured_missing = []
    breakdown = {}

    if cv_structured:
        # Parse job structure (cached per job or computed here)
        job_structured = job.get("_parsed_structure")
        if not job_structured:
            job_structured = await parse_job_structured(job)

        struct_result = compute_structured_match(cv_structured, job_structured)
        structured_score = struct_result["score"]
        structured_matched = struct_result["matched_skills"]
        structured_missing = struct_result["missing_skills"]
        breakdown = struct_result["breakdown"]

    # --- Stage 2: Semantic Embedding Similarity ---
    full_job_text = f"Role: {job_title}. Company: {company}. Description: {job_desc}. Requirements: {reqs_text}"
    semantic_percent = 0
    embedding_failed = False

    try:
        cv_emb, job_emb = await asyncio.gather(
            get_cached_embedding(cv_text[:6000]),
            get_cached_embedding(full_job_text),
        )
        if cv_emb and job_emb:
            sim_score = compute_cosine_similarity(cv_emb, job_emb)
            # Calibrated: cosine 0.30 = 0%, 0.50 = 50%, 0.70+ = 100%
            semantic_percent = max(0, min(100, int((sim_score - 0.3) * 250)))
    except Exception as e:
        logger.warning(f"Embedding failed for job {job_id}: {e}")
        embedding_failed = True

    # --- Stage 2b: Keyword fallback (if no structured data available) ---
    keyword_percent = 0
    if not cv_structured:
        _, _, keyword_ratio = analyze_skills(cv_text, req_list)
        keyword_percent = int(keyword_ratio * 100)

    # --- Stage 3: Blended Score ---
    if cv_structured and not embedding_failed:
        # Best case: structured + semantic
        # Structured is more accurate (field-level matching), semantic adds depth
        final_score = int(structured_score * 0.55 + semantic_percent * 0.35 + keyword_percent * 0.10)
    elif cv_structured:
        # Embeddings failed but structured works
        final_score = structured_score
    elif not embedding_failed:
        # No structured data, fall back to old approach
        final_score = int(semantic_percent * 0.60 + keyword_percent * 0.40)
    else:
        # Both failed — keyword only
        final_score = keyword_percent

    final_score = max(0, min(100, final_score))

    # Use structured skills if available, otherwise fall back to keyword extraction
    if structured_matched or structured_missing:
        matching = structured_matched
        missing = structured_missing
    else:
        matching_kw, missing_kw, _ = analyze_skills(cv_text, req_list)
        matching = matching_kw
        missing = missing_kw

    # --- Stage 4: LLM Reasoning (only for meaningful matches, saves cost) ---
    reasoning = _build_fallback_reasoning(final_score, structured_score, semantic_percent, breakdown)

    if final_score >= 40:
        try:
            reasoning_prompt = (
                f"You are an AI career matching assistant. In 2-3 concise sentences, explain why this candidate "
                f"is a {final_score}% match for this role.\n\n"
                f"Role: {job_title} at {company}\n"
                f"Requirements: {reqs_text[:500]}\n\n"
                f"Candidate Skills Found: {', '.join(matching[:8]) if matching else 'None identified'}\n"
                f"Missing Skills: {', '.join(missing[:5]) if missing else 'None'}\n"
                f"Score breakdown: Skills {breakdown.get('skills', 'N/A')}%, "
                f"Experience {breakdown.get('experience', 'N/A')}%, "
                f"Education {breakdown.get('education', 'N/A')}%\n\n"
                f"Be specific. Mention which skills make them strong and what gaps exist. No markdown."
            )
            reasoning = await generate_completion(
                reasoning_prompt,
                system_message="You provide brief, factual career match explanations. No markdown, no bullet points. 2-3 sentences max.",
            )
        except Exception as e:
            logger.warning(f"LLM reasoning failed for job {job_id}: {e}")

    result = {
        "internship_id": job_id,
        "match_score": final_score,
        "matching_skills": matching,
        "missing_skills": missing,
        "reasoning": reasoning.strip(),
        "score_breakdown": breakdown,
    }

    match_result_cache.set(cache_key, result)
    return result


def _build_fallback_reasoning(final: int, structured: int, semantic: int, breakdown: dict) -> str:
    """Generates a descriptive fallback reasoning string when LLM is skipped."""
    parts = []
    if breakdown:
        parts.append(f"Skills match: {breakdown.get('skills', 0)}%")
        parts.append(f"Experience fit: {breakdown.get('experience', 0)}%")
        if breakdown.get('education', 0) > 50:
            parts.append(f"Education alignment: {breakdown.get('education', 0)}%")
    if semantic > 0:
        parts.append(f"Semantic similarity: {semantic}%")
    return f"Match score {final}%. " + ", ".join(parts) + "." if parts else f"Match score: {final}%."

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

async def generate_cover_letter_stream(student_name: str, user_email: str, profile_text: str, job: dict, existing_letter: str = ""):
    """
    Streams a professional motivation letter using the LLM Service.
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
        polished = await generate_completion(user_prompt, system_message=system_prompt, model="llama-3.3-70b-versatile")
        return polished.strip()
    except Exception as e:
        logger.error(f"Routing Service - Logbook Enhance Failed: {e}")
        raise ValueError("Could not enhance logbook entry at this time.")
