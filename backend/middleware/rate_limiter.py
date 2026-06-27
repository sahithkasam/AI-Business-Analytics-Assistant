"""
Redis-backed sliding-window rate limiter.
Uses a sorted set per client IP: members are timestamped request IDs,
score is the Unix timestamp. Old entries outside the window are pruned atomically.
"""
import time
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from config.settings import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        redis = request.app.state.redis
        window = settings.RATE_LIMIT_WINDOW
        max_requests = settings.RATE_LIMIT_REQUESTS

        key = f"rl:{client_ip}"
        now = time.time()
        member = f"{now:.6f}:{id(request)}"  # unique per request

        async with redis.pipeline(transaction=True) as pipe:
            pipe.zremrangebyscore(key, 0, now - window)   # drop expired
            pipe.zadd(key, {member: now})                  # record this request
            pipe.zcard(key)                                # count in window
            pipe.expire(key, window)                       # auto-expire the key
            _, _, count, _ = await pipe.execute()

        if count > max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {max_requests} requests per {window} seconds.",
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, max_requests - count))
        return response
