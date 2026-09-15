import uuid

import pytest

from app.errors import EmbeddingError, LLMError, VectorStoreError
from app.routers import chat as chat_module


def _chunk(text="Worked as AI Backend Developer at HeyBobo.AI from the resume."):
    return {
        "text": text,
        "doc_id": "1d400e0f-bc61-4336-a27d-fdd228b225c3",
        "chunk_index": 2,
        "distance": 1.338,
    }


@pytest.fixture
def chat_deps(monkeypatch, admin_user):
    """Patch the chat endpoint's heavy dependencies with real-shaped fakes."""
    monkeypatch.setattr(chat_module, "embed_query", lambda q: [0.1] * 384)
    monkeypatch.setattr(chat_module, "query_tenant", lambda t, q, top_k: [_chunk()])
    monkeypatch.setattr(
        chat_module, "generate_answer", lambda q, c: "AI Backend Developer at HeyBobo.AI."
    )


@pytest.fixture
def chat_client(auth_client, chat_deps):
    return auth_client


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class FakeSession:
    def __init__(self, rows=None):
        self._rows = rows or []

    def add(self, obj):
        pass

    async def commit(self):
        pass

    async def execute(self, stmt):
        return FakeResult(self._rows)


class TestChatSuccess:
    def test_returns_answer_and_real_sources(self, chat_client):
        resp = chat_client.post(
            "/chat/", json={"question": "What is Muhammad Sami's job title?"}
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["answer"] == "AI Backend Developer at HeyBobo.AI."
        assert len(body["sources"]) == 1
        src = body["sources"][0]
        assert src["doc_id"] == "1d400e0f-bc61-4336-a27d-fdd228b225c3"
        assert src["chunk_index"] == 2
        assert isinstance(src["distance"], float)
        assert src["preview"].startswith("Worked as AI Backend Developer")

    def test_resolves_real_filename_from_db(self, auth_client, chat_deps, monkeypatch):
        from app.database import get_db
        from app.main import app

        doc_uuid = uuid.UUID("1d400e0f-bc61-4336-a27d-fdd228b225c3")

        async def _override_db():
            yield FakeSession(rows=[(doc_uuid, "Muhammad_Sami_Resume (2).pdf")])

        app.dependency_overrides[get_db] = _override_db
        try:
            resp = auth_client.post(
                "/chat/", json={"question": "What is Muhammad Sami's job title?"}
            )
        finally:
            app.dependency_overrides.pop(get_db, None)

        assert resp.status_code == 200
        assert resp.json()["sources"][0]["filename"] == "Muhammad_Sami_Resume (2).pdf"


class TestChatValidation:
    def test_empty_question_rejected(self, chat_client):
        resp = chat_client.post("/chat/", json={"question": ""})
        assert resp.status_code == 422

    def test_missing_question_rejected(self, chat_client):
        resp = chat_client.post("/chat/", json={})
        assert resp.status_code == 422

    def test_too_long_question_rejected(self, chat_client):
        resp = chat_client.post("/chat/", json={"question": "a" * 2001})
        assert resp.status_code == 422


class TestChatErrorPaths:
    def test_embedding_failure_returns_500(self, auth_client, monkeypatch):
        def _fail(q):
            raise EmbeddingError("no model")

        monkeypatch.setattr(chat_module, "embed_query", _fail)
        resp = auth_client.post("/chat/", json={"question": "hello"})
        assert resp.status_code == 500

    def test_vectorstore_failure_returns_503(self, auth_client, monkeypatch):
        def _fail(t, q, top_k):
            raise VectorStoreError("chroma down")

        monkeypatch.setattr(chat_module, "embed_query", lambda q: [0.1] * 384)
        monkeypatch.setattr(chat_module, "query_tenant", _fail)
        resp = auth_client.post("/chat/", json={"question": "hello"})
        assert resp.status_code == 503

    def test_llm_failure_returns_502(self, auth_client, monkeypatch):
        def _fail(q, c):
            raise LLMError("groq down")

        monkeypatch.setattr(chat_module, "embed_query", lambda q: [0.1] * 384)
        monkeypatch.setattr(chat_module, "query_tenant", lambda t, q, top_k: [_chunk()])
        monkeypatch.setattr(chat_module, "generate_answer", _fail)
        resp = auth_client.post("/chat/", json={"question": "hello"})
        assert resp.status_code == 502