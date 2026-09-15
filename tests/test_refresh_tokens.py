import asyncio
import uuid
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from jose import jwt as pyjwt
from fastapi.testclient import TestClient

from app.auth import hash_password
from app.config import settings
from app.database import get_db
from app.main import app
from app.models import RefreshToken, User, UserRole
from app.refresh_tokens import (
    RefreshTokenRepo,
    RotationResult,
    create_login_refresh,
    hash_refresh_token,
    revoke_family_by_token,
    rotate_refresh_token,
)


NOW = datetime.utcnow()


class DictRepo(RefreshTokenRepo):
    """In-memory repo implementing the RefreshTokenRepo interface."""

    def __init__(self, tokens=None, users=None):
        self._tokens = {t.token_hash: t for t in (tokens or [])}
        if users is None:
            self.users = {}
        elif isinstance(users, dict):
            self.users = dict(users)
        else:
            self.users = {u.id: u for u in users}
        self.added = []
        self.commits = 0

    async def get_by_hash(self, token_hash):
        return self._tokens.get(token_hash)

    async def get_family(self, family_id):
        return [t for t in self._tokens.values() if t.family_id == family_id]

    async def get_user(self, user_id):
        return self.users.get(user_id)

    async def add(self, record):
        self.added.append(record)
        self._tokens[record.token_hash] = record

    async def commit(self):
        self.commits += 1

    def tokens_in_family(self, family_id):
        return [t for t in self._tokens.values() if t.family_id == family_id]


def make_user(**overrides):
    defaults = dict(
        id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        email="user@example.com",
        hashed_password=hash_password("password123"),
        role=UserRole.admin,
    )
    defaults.update(overrides)
    return User(**defaults)


def make_token(user, raw, **overrides):
    defaults = dict(
        user_id=user.id,
        token_hash=hash_refresh_token(raw),
        family_id=uuid.uuid4(),
        expires_at=NOW + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS),
        revoked_at=None,
    )
    defaults.update(overrides)
    return RefreshToken(**defaults)


def _decode(access_token):
    return pyjwt.decode(
        access_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )


def _create(repo, user):
    return asyncio.run(create_login_refresh(repo, user))


def _rot(repo, token):
    return asyncio.run(rotate_refresh_token(repo, token))


def _revoke(repo, token):
    return asyncio.run(revoke_family_by_token(repo, token))


class TestLoginAccessToken:
    def test_login_returns_access_and_refresh(self):
        user = make_user()
        class UserResult:
            def scalar_one_or_none(self):
                return user

        class LoginSession:
            def __init__(self):
                self.added = []

            def add(self, obj):
                self.added.append(obj)

            async def commit(self):
                pass

            async def execute(self, stmt):
                return UserResult()

        async def _override_db():
            yield LoginSession()

        app.dependency_overrides[get_db] = _override_db
        try:
            client = TestClient(app)
            resp = client.post(
                "/auth/login",
                content='{"email":"user@example.com","password":"password123"}',
                headers={"Content-Type": "application/json"},
            )
        finally:
            app.dependency_overrides.pop(get_db, None)
        assert resp.status_code == 200
        body = resp.json()
        assert body["token_type"] == "bearer"
        assert body["access_token"]
        assert body["refresh_token"]

        payload = _decode(body["access_token"])
        assert payload["sub"] == str(user.id)
        assert payload["tenant_id"] == str(user.tenant_id)
        assert payload["role"] == "admin"
        assert payload["exp"] - payload["iat"] == settings.JWT_EXPIRE_MINUTES * 60

    def test_only_digest_stored_not_raw(self):
        user = make_user()
        repo = DictRepo(users={user.id: user})
        raw = _create(repo, user)
        assert raw not in repo._tokens
        assert hash_refresh_token(raw) in repo._tokens
        assert len(repo._tokens.values()) == 1


class TestRefreshRotation:
    def test_refresh_success_mints_fresh_pair_same_family(self):
        user = make_user()
        family = uuid.uuid4()
        existing = make_token(user, "x" * 64, family_id=family)
        repo = DictRepo(tokens=[existing], users={user.id: user})

        result = _rot(repo, "x" * 64)

        assert result.status == "ok"
        assert result.access_token and result.refresh_token
        payload = _decode(result.access_token)
        assert payload["sub"] == str(user.id)

        consumed = repo._tokens[hash_refresh_token("x" * 64)]
        assert consumed.revoked_at is not None
        assert any(t.token_hash == hash_refresh_token(result.refresh_token) for t in repo.tokens_in_family(family))

    def test_old_token_rejected_and_family_revoked_on_reuse(self):
        user = make_user()
        family = uuid.uuid4()
        old = make_token(user, "x" * 64, family_id=family)
        repo = DictRepo(tokens=[old], users={user.id: user})

        first = _rot(repo, "x" * 64)
        assert first.status == "ok"
        # Second rotation from a still-valid member of the family.
        second = _rot(repo, first.refresh_token)
        assert second.status == "ok"
        # Reusing the *original* consumed token must be rejected and nuke the family.
        reuse = _rot(repo, "x" * 64)
        assert reuse.status == "invalid"
        assert all(t.revoked_at is not None for t in repo.tokens_in_family(family))

    def test_expired_token_rejected(self):
        user = make_user()
        expired = make_token(
            user,
            "y" * 64,
            expires_at=NOW - timedelta(minutes=1),
        )
        repo = DictRepo(tokens=[expired], users={user.id: user})
        assert _rot(repo, "y" * 64) == RotationResult(status="invalid")

    def test_unknown_token_rejected(self):
        repo = DictRepo()
        assert _rot(repo, "unknown-token") == RotationResult(status="invalid")

    def test_missing_user_rejected(self):
        user = make_user()
        token = make_token(user, "z" * 64)
        repo = DictRepo(tokens=[token])  # no user row
        assert _rot(repo, "z" * 64) == RotationResult(status="invalid")


class TestLogout:
    def test_logout_revokes_whole_family(self):
        user = make_user()
        family = uuid.uuid4()
        t1 = make_token(user, "t1" * 32, family_id=family)
        t2 = make_token(user, "t2" * 32, family_id=family)
        repo = DictRepo(tokens=[t1, t2], users={user.id: user})

        revoked = _revoke(repo, "t1" * 32)

        assert revoked is True
        assert all(t.revoked_at is not None for t in repo.tokens_in_family(family))
        assert _rot(repo, "t2" * 32).status == "invalid"
        assert _rot(repo, "t1" * 32).status == "invalid"

    def test_logout_unknown_token_is_false(self):
        repo = DictRepo()
        assert _revoke(repo, "nope") is False


class TestRefreshEndpoint:
    def test_refresh_endpoint_maps_ok(self, monkeypatch):
        async def _ok(db, token):
            return RotationResult(status="ok", access_token="acc", refresh_token="ref")

        monkeypatch.setattr("app.routers.auth.rotate_refresh_token", _ok)

        async def _override_db():
            yield None

        app.dependency_overrides[get_db] = _override_db
        try:
            resp = TestClient(app).post(
                "/auth/refresh",
                content='{"refresh_token":"' + "r" * 64 + '"}',
                headers={"Content-Type": "application/json"},
            )
        finally:
            app.dependency_overrides.pop(get_db, None)
        assert resp.status_code == 200
        assert resp.json() == {
            "access_token": "acc",
            "refresh_token": "ref",
            "token_type": "bearer",
        }

    def test_refresh_endpoint_maps_invalid(self, monkeypatch):
        async def _invalid(db, token):
            return RotationResult(status="invalid")

        monkeypatch.setattr("app.routers.auth.rotate_refresh_token", _invalid)

        async def _override_db():
            yield None

        app.dependency_overrides[get_db] = _override_db
        try:
            resp = TestClient(app).post(
                "/auth/refresh",
                content='{"refresh_token":"' + "i" * 64 + '"}',
                headers={"Content-Type": "application/json"},
            )
        finally:
            app.dependency_overrides.pop(get_db, None)
        assert resp.status_code == 401