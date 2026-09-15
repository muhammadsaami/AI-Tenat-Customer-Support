import time

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.database import get_db
from app.main import app
from app.ratelimit import SlidingWindowRateLimiter, login_limiter


class EmptyResult:
    def scalar_one_or_none(self):
        return None


class EmptySession:
    async def execute(self, stmt):
        return EmptyResult()


@pytest.fixture(autouse=True)
def _rl_settings(monkeypatch):
    monkeypatch.setattr(settings, "LOGIN_RATE_LIMIT_MAX_ATTEMPTS", 3)
    monkeypatch.setattr(settings, "LOGIN_RATE_LIMIT_WINDOW_SECONDS", 300)
    yield
    login_limiter.reset()


@pytest.fixture
def rl_client():
    async def _override_db():
        yield EmptySession()

    app.dependency_overrides[get_db] = _override_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    login_limiter.reset()


def _login(client, email, password="nope"):
    return client.post(
        "/auth/login",
        content=f'{{"email":"{email}","password":"{password}"}}',
        headers={"Content-Type": "application/json"},
    )


class TestLoginRateLimitEndpoint:
    def test_allowed_attempts_then_429(self, rl_client):
        email = "rl-a@example.com"
        first = [_login(rl_client, email).status_code for _ in range(3)]
        assert first == [401, 401, 401]
        blocked = _login(rl_client, email)
        assert blocked.status_code == 429
        assert blocked.headers.get("retry-after") == "300"

    def test_429_persists_while_hot(self, rl_client):
        email = "rl-b@example.com"
        for _ in range(4):
            _login(rl_client, email)
        assert _login(rl_client, email).status_code == 429

    def test_different_email_unaffected(self, rl_client):
        email = "rl-c@example.com"
        for _ in range(4):
            _login(rl_client, email)
        assert _login(rl_client, email).status_code == 429
        other = _login(rl_client, "rl-c2@example.com")
        assert other.status_code == 401

    def test_window_expiry_recovers(self, rl_client, monkeypatch):
        email = "rl-d@example.com"
        for _ in range(4):
            _login(rl_client, email)
        blocked = _login(rl_client, email)
        assert blocked.status_code == 429
        monkeypatch.setattr(settings, "LOGIN_RATE_LIMIT_WINDOW_SECONDS", 0.000001)
        time.sleep(0.01)
        recovered = _login(rl_client, email)
        assert recovered.status_code == 401


class TestSlidingWindowRateLimiter:
    def test_unit_limits_then_recovers(self, monkeypatch):
        monkeypatch.setattr(settings, "LOGIN_RATE_LIMIT_MAX_ATTEMPTS", 2)
        monkeypatch.setattr(settings, "LOGIN_RATE_LIMIT_WINDOW_SECONDS", 300)
        limiter = SlidingWindowRateLimiter()
        key = "unit-a"
        assert limiter.allowed(key)
        limiter.record_failure(key)
        limiter.record_failure(key)
        assert not limiter.allowed(key)
        assert limiter.remaining(key) == 0
        monkeypatch.setattr(settings, "LOGIN_RATE_LIMIT_WINDOW_SECONDS", 0.000001)
        time.sleep(0.01)
        assert limiter.allowed(key)
        assert limiter.remaining(key) == 2

    def test_unit_clear_resets(self, monkeypatch):
        monkeypatch.setattr(settings, "LOGIN_RATE_LIMIT_MAX_ATTEMPTS", 1)
        limiter = SlidingWindowRateLimiter()
        key = "unit-b"
        limiter.record_failure(key)
        assert not limiter.allowed(key)
        limiter.clear(key)
        assert limiter.allowed(key)
        limiter.reset()
        assert limiter.allowed(key)

    def test_unit_disabled_bypasses(self, monkeypatch):
        monkeypatch.setattr(settings, "LOGIN_RATE_LIMIT_ENABLED", False)
        monkeypatch.setattr(settings, "LOGIN_RATE_LIMIT_MAX_ATTEMPTS", 1)
        limiter = SlidingWindowRateLimiter()
        key = "unit-c"
        for _ in range(50):
            limiter.record_failure(key)
        assert limiter.allowed(key)