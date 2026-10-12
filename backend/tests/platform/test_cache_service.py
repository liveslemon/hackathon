"""
Tests for TwoLayerCache service (services/cache_service.py).
"""

import time
from services.cache_service import TwoLayerCache


def test_cache_set_and_get():
    """Cache correctly stores and retrieves entries in memory."""
    cache = TwoLayerCache(prefix="test:", max_memory_size=10, ttl_seconds=60)
    cache.set("key1", {"score": 95, "name": "Python"})

    val = cache.get("key1")
    assert val == {"score": 95, "name": "Python"}


def test_cache_ttl_expiry():
    """Cache expires items older than ttl_seconds."""
    cache = TwoLayerCache(prefix="test:", max_memory_size=10, ttl_seconds=1)
    cache.set("ephemeral", "data")

    # Manually back-date timestamp beyond ttl
    cache.memory_cache["ephemeral"]["timestamp"] = time.time() - 2.0

    assert cache.get("ephemeral") is None
    assert "ephemeral" not in cache.memory_cache


def test_cache_lru_eviction():
    """Cache evicts oldest item when max_memory_size is reached."""
    cache = TwoLayerCache(prefix="test:", max_memory_size=3, ttl_seconds=3600)
    now = time.time()

    cache.set("k1", "v1")
    cache.memory_cache["k1"]["timestamp"] = now - 30

    cache.set("k2", "v2")
    cache.memory_cache["k2"]["timestamp"] = now - 20

    cache.set("k3", "v3")
    cache.memory_cache["k3"]["timestamp"] = now - 10

    # Adding 4th item evicts k1 (oldest timestamp)
    cache.set("k4", "v4")

    assert cache.get("k1") is None
    assert cache.get("k2") == "v2"
    assert cache.get("k3") == "v3"
    assert cache.get("k4") == "v4"


def test_cache_delete_and_clear():
    """Cache delete and clear methods remove entries."""
    cache = TwoLayerCache(prefix="test:", max_memory_size=10, ttl_seconds=60)
    cache.set("a", 1)
    cache.set("b", 2)

    cache.delete("a")
    assert cache.get("a") is None
    assert cache.get("b") == 2

    cache.clear()
    assert cache.get("b") is None
    assert len(cache.memory_cache) == 0
