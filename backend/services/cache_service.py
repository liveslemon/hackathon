import time
import json
import logging
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
    except Exception as e:
        logger.warning(f"[Cache] Redis connection failed, falling back to memory-only: {e}")
        redis_client = None

class TwoLayerCache:
    """
    Two-layer caching: In-Memory LRU -> Redis
    """
    def __init__(self, prefix="cache:", max_memory_size=1000, ttl_seconds=3600):
        self.memory_cache = {}
        self.max_size = max_memory_size
        self.ttl_seconds = ttl_seconds
        self.prefix = prefix

    def get(self, key: str):
        if key in self.memory_cache:
            entry = self.memory_cache[key]
            if time.time() - entry["timestamp"] <= self.ttl_seconds:
                entry["timestamp"] = time.time()
                return entry["value"]
            else:
                del self.memory_cache[key]

        if redis_client:
            try:
                val = redis_client.get(f"{self.prefix}{key}")
                if val:
                    parsed = json.loads(val)
                    self._set_memory(key, parsed)
                    return parsed
            except Exception as e:
                pass
        return None

    def _set_memory(self, key: str, value: any):
        if len(self.memory_cache) >= self.max_size:
            oldest = min(self.memory_cache.keys(), key=lambda k: self.memory_cache[k]["timestamp"])
            del self.memory_cache[oldest]
        self.memory_cache[key] = {
            "value": value,
            "timestamp": time.time()
        }

    def set(self, key: str, value: any):
        self._set_memory(key, value)
        
        if redis_client:
            try:
                redis_client.setex(f"{self.prefix}{key}", self.ttl_seconds, json.dumps(value))
            except Exception as e:
                pass

embedding_cache = TwoLayerCache(prefix="embed:", max_memory_size=2000, ttl_seconds=86400)
match_result_cache = TwoLayerCache(prefix="match:", max_memory_size=5000, ttl_seconds=3600)
