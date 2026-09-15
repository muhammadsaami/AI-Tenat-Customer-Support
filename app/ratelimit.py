"""In-process sliding-window rate limiter. No external dependencies."""

import time
from collections import deque
from typing import Deque, Dict, Optional

from app.config import settings


class SlidingWindowRateLimiter:
    """Sliding-window limiter keyed on an arbitrary string.

    Memory-efficient: expired timestamps are pruned on every access and
    stale keys are dropped once the key table grows beyond a cap. The
    window/maximum are read from settings at call time so tests can tune
    them without rebuilding the object.
    """

    _CLEANUP_INTERVAL = 60.0
    _MAX_KEYS = 10_000

    def __init__(self) -> None:
        self._attempts: Dict[str, Deque[float]] = {}
        self._last_cleanup: float = 0.0

    def _prune(self, key: str, now: float) -> Optional[Deque[float]]:
        dq = self._attempts.get(key)
        if dq is None:
            return None
        while dq and now - dq[0] > settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS:
            dq.popleft()
        if not dq:
            del self._attempts[key]
            return None
        return dq

    @property
    def limit(self) -> int:
        return settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS

    def allowed(self, key: str) -> bool:
        if not settings.LOGIN_RATE_LIMIT_ENABLED:
            return True
        now = time.monotonic()
        dq = self._prune(key, now)
        return dq is None or len(dq) < self.limit

    def record_failure(self, key: str) -> None:
        now = time.monotonic()
        self._prune(key, now)
        self._attempts.setdefault(key, deque()).append(now)
        self._maybe_cleanup(now)

    def clear(self, key: str) -> None:
        self._attempts.pop(key, None)

    def remaining(self, key: str) -> int:
        now = time.monotonic()
        dq = self._prune(key, now)
        count = len(dq) if dq else 0
        return max(0, self.limit - count)

    def _maybe_cleanup(self, now: float) -> None:
        if now - self._last_cleanup < self._CLEANUP_INTERVAL:
            return
        self._last_cleanup = now
        if len(self._attempts) <= self._MAX_KEYS:
            return
        stale = [key for key, dq in self._attempts.items() if not dq]
        for key in stale:
            del self._attempts[key]

    def reset(self) -> None:
        self._attempts.clear()
        self._last_cleanup = 0.0


login_limiter = SlidingWindowRateLimiter()