import uuid

import pytest
from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.database import get_db
from app.main import app
from app.models import User, UserRole


class FakeSession:
    """Minimal async session for tests that never touch the database."""

    def __init__(self):
        self.added = []

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        pass

    async def execute(self, stmt):
        return FakeResult([])


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None


@pytest.fixture
def admin_user():
    return User(
        id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        email="admin@example.com",
        hashed_password="not-a-real-hash",
        role=UserRole.admin,
    )


@pytest.fixture
def agent_user():
    return User(
        id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        email="agent@example.com",
        hashed_password="not-a-real-hash",
        role=UserRole.agent,
    )


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_client(admin_user, monkeypatch):
    """TestClient with dependency overrides: authenticated admin + fake DB."""
    async def _override_user():
        return admin_user

    async def _override_db():
        yield FakeSession()

    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_db] = _override_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def auth_agent_client(agent_user):
    """TestClient authenticated as an agent (no DB override)."""
    async def _override_user():
        return agent_user

    app.dependency_overrides[get_current_user] = _override_user
    yield TestClient(app)
    app.dependency_overrides.clear()