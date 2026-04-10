import math
import re
import logging

try:
    import numpy as np
except ImportError:
    np = None

logger = logging.getLogger(__name__)

def compute_cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    """Computes cosine similarity between two vectors."""
    if not vec1 or not vec2:
        return 0.0
    if len(vec1) != len(vec2):
        logger.warning("Vector dimension mismatch in cosine similarity.")
        return 0.0
        
    if np is not None:
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        norm_v1 = np.linalg.norm(v1)
        norm_v2 = np.linalg.norm(v2)
        if norm_v1 == 0 or norm_v2 == 0:
            return 0.0
        return float(np.dot(v1, v2) / (norm_v1 * norm_v2))
    else:
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm_a = math.sqrt(sum(a * a for a in vec1))
        norm_b = math.sqrt(sum(b * b for b in vec2))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)

ALIASES = {
    "js": "javascript", "reactjs": "react", "node": "nodejs", 
    "ts": "typescript", "postgres": "postgresql", "python3": "python"
}

def extract_keywords(text: str) -> set[str]:
    """Extract normalized words and aliases from text."""
    if not text:
        return set()
    clean_text = re.sub(r'[^\w\s]', ' ', text.lower())
    words = set(clean_text.split())
    stopwords = {"and", "the", "to", "of", "in", "a", "for", "with", "on", "is", "as", "at", "by", "an", "be", "this", "that", "it", "are", "or"}
    filtered_words = words - stopwords
    
    final_set = set()
    for w in filtered_words:
        final_set.add(ALIASES.get(w, w))
    return final_set

def analyze_skills(cv_text: str, map_of_requirements: list[str]) -> tuple[list[str], list[str], float]:
    """
    Returns (matching_skills, missing_skills, keyword_match_ratio)
    """
    cv_keywords = extract_keywords(cv_text)
    
    matching_skills = []
    missing_skills = []
    
    total_req_weight = 0
    matched_req_weight = 0
    
    for req in map_of_requirements:
        req_clean = req.strip()
        if not req_clean:
            continue
            
        req_words = extract_keywords(req_clean)
        if not req_words:
            continue
            
        intersection = cv_keywords.intersection(req_words)
        match_ratio = len(intersection) / len(req_words)
        
        display_req = req_clean[:50] + "..." if len(req_clean) > 50 else req_clean
        
        total_req_weight += 1
        
        if match_ratio >= 0.3:
            matching_skills.append(display_req)
            matched_req_weight += 1
        else:
            missing_skills.append(display_req)
            
    keyword_score = (matched_req_weight / total_req_weight) if total_req_weight > 0 else 0.0
            
    return matching_skills[:5], missing_skills[:5], keyword_score
