import httpx
import logging
from core.config import settings
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

# COHERE AI Configuration
EMBEDDING_DIM = 1024  # Cohere embed-english-v3.0 output dimension

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def get_embedding(text: str) -> list[float]:
    """
    Fetches embeddings from Cohere API. 
    Strictly forbids local fallback to protect server resources.
    """
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIM
        
    if not settings.COHERE_API_KEY:
        logger.error("[AI/Embed] CRITICAL: COHERE_API_KEY is missing. AI features will fail.")
        raise RuntimeError("AI Embedding service is misconfigured: Missing API Key.")
        
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.cohere.com/v1/embed",
                headers={
                    "Authorization": f"Bearer {settings.COHERE_API_KEY}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                json={
                    "texts": [text],
                    "model": "embed-english-v3.0",
                    "input_type": "search_document"
                }
            )
            resp.raise_for_status()
            data = resp.json()
            
            # Basic validation of the response
            if "embeddings" not in data or not data["embeddings"]:
                raise ValueError("Cohere API returned empty embeddings.")
                
            return data["embeddings"][0]
            
    except httpx.HTTPStatusError as e:
        logger.error(f"[AI/Embed] Cohere API error ({e.response.status_code}): {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"[AI/Embed] Unexpected failure reaching Cohere: {e}")
        raise

# Keep local model code for administrative/fallback scripts only (not used in main flow)
async def get_local_embedding(text: str):
    """Utility function for manual debugging, not used by the main application."""
    logger.warning("[AI/Embed] Manual call to get_local_embedding requested.")
    # We leave the implementation out to keep the environment light
    raise NotImplementedError("Local embedding is disabled to save server resources.")
