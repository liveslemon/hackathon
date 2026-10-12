import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status
from .security import get_current_user

# In-memory sliding-window limiter, keyed per user or IP per bucket.
# Per-process only: with N workers the effective limit is N x limit.
# Move to Redis/Upstash if the backend is scaled horizontally.
_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(bucket: str, limit: int, window_seconds: int):
    """Dependency factory: authenticates the user and caps calls to `limit` per window."""

    async def dependency(current_user=Depends(get_current_user)):
        key = f"{bucket}:{current_user.id}"
        now = time.monotonic()
        hits = _hits[key]
        while hits and now - hits[0] > window_seconds:
            hits.popleft()
        if len(hits) >= limit:
            retry_after = int(window_seconds - (now - hits[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )
        hits.append(now)
        return current_user

    return dependency


def rate_limit_ip(bucket: str, limit: int, window_seconds: int):
    """Dependency factory: caps unauthenticated calls to `limit` per window based on client IP."""

    async def dependency(request: Request):
        # Extract real client IP behind reverse proxies (Render / Cloudflare)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        key = f"{bucket}:ip:{client_ip}"
        now = time.monotonic()
        hits = _hits[key]
        while hits and now - hits[0] > window_seconds:
            hits.popleft()
        if len(hits) >= limit:
            retry_after = int(window_seconds - (now - hits[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )
        hits.append(now)
        return client_ip

    return dependency
