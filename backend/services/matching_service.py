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
        logger.warning("Empty vector provided for cosine similarity computation.")
        return 0.0
    if len(vec1) != len(vec2):
        logger.error(f"Vector dimension mismatch: {len(vec1)} vs {len(vec2)}. Embedding model may have changed.")
        raise ValueError(f"Vector dimension mismatch: {len(vec1)} vs {len(vec2)}")
        
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
    "js": "javascript", "reactjs": "react", "react.js": "react",
    "node": "nodejs", "node.js": "nodejs", "express.js": "express",
    "ts": "typescript", "postgres": "postgresql", "python3": "python",
    "py": "python", "cpp": "c++", "csharp": "c#", "c sharp": "c#",
    "mongo": "mongodb", "k8s": "kubernetes", "tf": "terraform",
    "aws": "amazon web services", "gcp": "google cloud",
    "azure": "microsoft azure", "ml": "machine learning",
    "ai": "artificial intelligence", "dl": "deep learning",
    "nlp": "natural language processing", "cv": "computer vision",
    "ux": "user experience", "ui": "user interface",
    "ci/cd": "continuous integration", "cicd": "continuous integration",
    "oop": "object oriented programming", "sql": "structured query language",
    "nosql": "non-relational database", "vue": "vuejs", "vue.js": "vuejs",
    "next": "nextjs", "next.js": "nextjs", "nuxt": "nuxtjs",
    "angular.js": "angular", "angularjs": "angular",
    "dotnet": ".net", "asp.net": ".net",
}

# Common multi-word tech skills to detect as single units
COMPOUND_SKILLS = [
    "machine learning", "deep learning", "data science", "data analysis",
    "data engineering", "project management", "version control",
    "cloud computing", "web development", "mobile development",
    "natural language processing", "computer vision", "software engineering",
    "agile methodology", "test driven development", "object oriented",
    "rest api", "restful api", "api development", "graphic design",
    "digital marketing", "content creation", "social media",
    "supply chain", "business analysis", "financial analysis",
    "user experience", "user interface", "full stack",
]

def extract_keywords(text: str) -> set[str]:
    """Extract normalized words, aliases, and compound skills from text."""
    if not text:
        return set()
    clean_text = re.sub(r'[^\w\s.#+/]', ' ', text.lower())

    # Extract compound skills first
    found_compounds = set()
    for skill in COMPOUND_SKILLS:
        if skill in clean_text:
            found_compounds.add(skill)

    words = set(clean_text.split())
    stopwords = {
        "and", "the", "to", "of", "in", "a", "for", "with", "on", "is",
        "as", "at", "by", "an", "be", "this", "that", "it", "are", "or",
        "we", "our", "will", "can", "have", "has", "been", "was", "were",
        "not", "but", "from", "they", "their", "you", "your", "all",
        "would", "should", "could", "also", "more", "about", "such",
        "than", "other", "into", "over", "its", "may", "must", "shall",
        "very", "just", "able", "who", "which", "each", "do", "does",
        "did", "had", "get", "got", "use", "used", "using",
    }
    filtered_words = words - stopwords

    final_set = set()
    for w in filtered_words:
        if len(w) <= 1:
            continue
        final_set.add(ALIASES.get(w, w))

    return final_set | found_compounds

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
        # Use a weighted ratio: single-word requirements need exact match,
        # multi-word requirements need at least 40% overlap
        threshold = 0.5 if len(req_words) <= 2 else 0.35
        match_ratio = len(intersection) / len(req_words)
        
        display_req = req_clean[:80] + "..." if len(req_clean) > 80 else req_clean
        
        total_req_weight += 1
        
        if match_ratio >= threshold:
            matching_skills.append(display_req)
            matched_req_weight += 1
        else:
            missing_skills.append(display_req)
            
    keyword_score = (matched_req_weight / total_req_weight) if total_req_weight > 0 else 0.0
            
    return matching_skills[:8], missing_skills[:8], keyword_score
