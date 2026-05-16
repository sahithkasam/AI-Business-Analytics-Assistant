"""
Simple in-memory rate limiter (swap for Redis-backed in production).
"""
import time
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from config.settings import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._requests: dict = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Identify client by IP (use user ID for authenticated routes in prod)
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window = settings.RATE_LIMIT_WINDOW
        max_requests = settings.RATE_LIMIT_REQUESTS

        # Clean old timestamps
        self._requests[client_ip] = [
            ts for ts in self._requests[client_ip] if now - ts < window
        ]

        if len(self._requests[client_ip]) >= max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {max_requests} requests per {window} seconds.",
            )

        self._requests[client_ip].append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max_requests - len(self._requests[client_ip]))
        return response
