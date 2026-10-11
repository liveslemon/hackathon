import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, status
from .security import get_current_user

# In-memory sliding-window limiter, keyed per user per bucket.
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
