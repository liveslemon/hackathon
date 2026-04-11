import httpx
import logging
from core.config import settings
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

# Lazy loaded local model
_local_model = None
LOCAL_EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output dimension

def get_local_embedding(text: str) -> list[float]:
    global _local_model
    if _local_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("[AI/Embed] Loading local SentenceTransformer model...")
            _local_model = SentenceTransformer("all-MiniLM-L6-v2")
        except ImportError:
            logger.error("[AI/Embed] sentence-transformers not installed. Returning zeros.")
            return [0.0] * 384
    return _local_model.encode(text).tolist()

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def get_embedding(text: str) -> list[float]:
    if not text or not text.strip():
        return [0.0] * LOCAL_EMBEDDING_DIM
        
    if not settings.COHERE_API_KEY:
        logger.warning("[AI/Embed] No COHERE API KEY. Using local fallback.")
        return get_local_embedding(text)
        
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
            return data["embeddings"][0]
    except Exception as e:
        logger.error(f"[get_embedding] Failed to reach Cohere: {e}. Using local fallback.")
        return get_local_embedding(text)
