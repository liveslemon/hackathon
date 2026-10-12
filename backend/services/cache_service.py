import time
import json
import logging
from typing import Any, Optional
import redis
from core.config import settings

logger = logging.getLogger(__name__)

redis_client = None
if settings.REDIS_URL:
    try:
        redis_client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=2,
            socket_connect_timeout=2,
        )
        redis_client.ping()
        logger.info("[Cache] Redis connected.")
    except Exception as e:
        logger.warning(f"[Cache] Redis connection failed, falling back to memory-only: {e}")
        redis_client = None


class TwoLayerCache:
    """
    Two-layer caching: In-Memory LRU -> Redis.
    Falls back gracefully to in-memory only when Redis is unavailable.
    """
    def __init__(self, prefix: str = "cache:", max_memory_size: int = 1000, ttl_seconds: int = 3600):
        self.memory_cache: dict = {}
        self.max_size = max_memory_size
        self.ttl_seconds = ttl_seconds
        self.prefix = prefix

    def get(self, key: str) -> Optional[Any]:
        # Layer 1: Memory cache
        if key in self.memory_cache:
            entry = self.memory_cache[key]
            if time.time() - entry["timestamp"] <= self.ttl_seconds:
                entry["timestamp"] = time.time()
                return entry["value"]
            else:
                del self.memory_cache[key]

        # Layer 2: Redis cache
        if redis_client:
            try:
                val = redis_client.get(f"{self.prefix}{key}")
                if val:
                    parsed = json.loads(val)
                    self._set_memory(key, parsed)
                    return parsed
            except Exception as e:
                logger.warning(f"[Cache] Redis GET error for key {self.prefix}{key}: {e}")
        return None

    def _set_memory(self, key: str, value: Any):
        # Evict oldest entry only if adding a new key when cache is full
        if key not in self.memory_cache and len(self.memory_cache) >= self.max_size and self.memory_cache:
            oldest = min(self.memory_cache.keys(), key=lambda k: self.memory_cache[k]["timestamp"])
            del self.memory_cache[oldest]
        self.memory_cache[key] = {
            "value": value,
            "timestamp": time.time()
        }

    def set(self, key: str, value: Any):
        self._set_memory(key, value)

        if redis_client:
            try:
                payload = json.dumps(value, default=str)
                redis_client.setex(f"{self.prefix}{key}", self.ttl_seconds, payload)
            except Exception as e:
                logger.warning(f"[Cache] Redis SET error for key {self.prefix}{key}: {e}")

    def delete(self, key: str):
        if key in self.memory_cache:
            del self.memory_cache[key]

        if redis_client:
            try:
                redis_client.delete(f"{self.prefix}{key}")
            except Exception as e:
                logger.warning(f"[Cache] Redis DEL error for key {self.prefix}{key}: {e}")

    def clear(self):
        self.memory_cache.clear()
        if redis_client:
            try:
                keys = redis_client.keys(f"{self.prefix}*")
                if keys:
                    redis_client.delete(*keys)
            except Exception as e:
                logger.warning(f"[Cache] Redis CLEAR error: {e}")


embedding_cache = TwoLayerCache(
    prefix="embed:",
    max_memory_size=settings.EMBEDDING_CACHE_SIZE,
    ttl_seconds=settings.EMBEDDING_CACHE_TTL,
)
match_result_cache = TwoLayerCache(
    prefix="match:",
    max_memory_size=settings.MATCH_CACHE_SIZE,
    ttl_seconds=settings.MATCH_CACHE_TTL,
)
