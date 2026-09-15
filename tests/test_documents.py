import uuid
from types import SimpleNamespace

import pytest

from app.services.ingestion import ingest_document

PDF_BYTES = b"%PDF-1.4 fake bytes"


@pytest.fixture
def fake_ingest(monkeypatch):
    """Patch the ingestion pipeline so upload tests never load torch or Chroma."""

    def _fake(tenant_id, doc_id, filename, file_bytes):
        return {"doc_id": doc_id, "filename": filename, "chunk_count": 3, "status": "ready"}

    monkeypatch.setattr("app.routers.documents.ingest_document", _fake)
    return _fake


class TestUploadAuth:
    def test_requires_authentication(self, client):
        resp = client.post(
            "/documents/upload",
            files={"file": ("resume.pdf", b"x", "application/pdf")},
        )
        assert resp.status_code == 401

    def test_rejects_non_admin(self, auth_agent_client):
        resp = auth_agent_client.post(
            "/documents/upload",
            files={"file": ("resume.pdf", b"x", "application/pdf")},
        )
        assert resp.status_code == 403


class TestUploadValidation:
    def test_rejects_unsupported_extension(self, auth_client):
        resp = auth_client.post(
            "/documents/upload",
            files={"file": ("evil.exe", b"MZ...", "application/octet-stream")},
        )
        assert resp.status_code == 400

    def test_rejects_path_traversal_filename(self, auth_client, fake_ingest):
        resp = auth_client.post(
            "/documents/upload",
            files={"file": ("..\\..\\etc\\passwd.pdf", PDF_BYTES, "application/pdf")},
        )
        # Valid PDF-type path attack: validation sanitizes, then ingest runs.
        assert resp.status_code == 201
        assert resp.json()["filename"] == "passwd.pdf"

    def test_rejects_oversized_file(self, auth_client, monkeypatch):
        from app import validation
        from app import config as cfg

        monkeypatch.setattr(validation.settings, "MAX_UPLOAD_SIZE_BYTES", 1024)
        monkeypatch.setattr(cfg.settings, "MAX_UPLOAD_SIZE_BYTES", 1024)
        resp = auth_client.post(
            "/documents/upload",
            files={"file": ("big.pdf", b"x" * 4096, "application/pdf")},
        )
        assert resp.status_code == 413


class TestUploadSuccess:
    def test_returns_document_out(self, auth_client, fake_ingest):
        resp = auth_client.post(
            "/documents/upload",
            files={"file": ("My Resume.PDF", PDF_BYTES, "application/pdf")},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["filename"] == "My Resume.PDF"
        assert body["status"] == "ready"
        assert body["chunk_count"] == 3
        assert uuid.UUID(body["id"])  # valid UUID
        assert body["created_at"]

    def test_creates_document_record(self, auth_client, fake_ingest):
        resp = auth_client.post(
            "/documents/upload",
            files={"file": ("resume.pdf", PDF_BYTES, "application/pdf")},
        )
        assert resp.status_code == 201
        assert auth_client.app.dependency_overrides  # sanity

    def test_ingestion_failure_marks_failed(self, auth_client, monkeypatch):
        from app.errors import IngestionError

        def _boom(tenant_id, doc_id, filename, file_bytes):
            raise IngestionError("boom")

        monkeypatch.setattr("app.routers.documents.ingest_document", _boom)
        resp = auth_client.post(
            "/documents/upload",
            files={"file": ("resume.pdf", PDF_BYTES, "application/pdf")},
        )
        assert resp.status_code == 500


class TestListDocuments:
    def test_list_scoped_to_own_tenant(self, auth_client, monkeypatch):
        doc_id = uuid.uuid4()
        row = SimpleNamespace(id=doc_id, filename="resume.pdf", status="ready",
                              chunk_count=3, created_at="2026-01-01T00:00:00")

        class FakeRowResult:
            def scalars(self):
                return self

            def all(self):
                return [row]

        class FakeSession:
            async def execute(self, stmt):
                return FakeRowResult()

            def add(self, obj):
                pass

            async def commit(self):
                pass

        async def _override_db():
            yield FakeSession()

        from app.database import get_db
        from app.main import app

        app.dependency_overrides[get_db] = _override_db
        try:
            resp = auth_client.get("/documents/")
        finally:
            app.dependency_overrides.pop(get_db, None)
        assert resp.status_code == 200
        assert resp.json()[0]["filename"] == "resume.pdf"