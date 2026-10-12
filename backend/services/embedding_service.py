import logging
from typing import Optional

import httpx
from core.config import settings
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

# COHERE AI Configuration
EMBEDDING_DIM = 1024  # Cohere embed-english-v3.0 output dimension

_EMBEDDING_CLIENT = httpx.AsyncClient(
    timeout=httpx.Timeout(getattr(settings, "EMBEDDING_TIMEOUT", 30.0), connect=10.0),
    limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def get_embedding(text: str) -> Optional[list[float]]:
    """
    Fetches embeddings from Cohere API.
    Returns None if text is empty/whitespace to avoid storing zero vectors in pgvector.
    Strictly forbids local fallback to protect server resources.
    """
    if not text or not text.strip():
        return None

    if not settings.COHERE_API_KEY:
        logger.error(
            "[AI/Embed] CRITICAL: COHERE_API_KEY is missing. AI features will fail."
        )
        raise RuntimeError("AI Embedding service is misconfigured: Missing API Key.")

    try:
        resp = await _EMBEDDING_CLIENT.post(
            "https://api.cohere.com/v1/embed",
            headers={
                "Authorization": f"Bearer {settings.COHERE_API_KEY}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json={
                "texts": [text[:6000]],
                "model": "embed-english-v3.0",
                "input_type": "search_document",
            },
        )
        resp.raise_for_status()
        data = resp.json()

        # Basic validation of the response
        if "embeddings" not in data or not data["embeddings"]:
            raise ValueError("Cohere API returned empty embeddings.")

        embedding = data["embeddings"][0]
        if not isinstance(embedding, list) or len(embedding) != EMBEDDING_DIM:
            raise ValueError(
                f"Expected {EMBEDDING_DIM}-dimension embedding, got {len(embedding) if isinstance(embedding, list) else type(embedding)}"
            )

        return [float(x) for x in embedding]

    except httpx.HTTPStatusError as e:
        logger.error(
            f"[AI/Embed] Cohere API error ({e.response.status_code}): {e.response.text}"
        )
        raise
    except Exception as e:
        logger.error(f"[AI/Embed] Unexpected failure reaching Cohere: {e}")
        raise


async def get_local_embedding(text: str):
    """Utility function for manual debugging, not used by the main application."""
    logger.warning("[AI/Embed] Manual call to get_local_embedding requested.")
    raise NotImplementedError("Local embedding is disabled to save server resources.")
