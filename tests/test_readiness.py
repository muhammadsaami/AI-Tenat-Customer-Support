import pytest

from app.main import app


class TestHealth:
    def test_health_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
        assert resp.json()["app"] == "SupportPilot"

    def _break_db(self, monkeypatch, chroma_ok: bool):
        class BrokenEngine:
            def connect(self):
                return self

            async def __aenter__(self):
                raise ConnectionRefusedError()

            async def __aexit__(self, *args):
                return None

        monkeypatch.setattr("app.main.engine", BrokenEngine())
        monkeypatch.setattr("app.main.vector_store.heartbeat", lambda: chroma_ok)

    def test_readiness_returns_503_when_db_errors(self, client, monkeypatch):
        self._break_db(monkeypatch, chroma_ok=True)
        resp = client.get("/health/ready")
        assert resp.status_code == 503
        body = resp.json()
        assert body["status"] == "not_ready"
        assert body["checks"]["postgres"] == "error"
        assert body["checks"]["chroma"] == "ok"

    def test_readiness_reports_chroma_down(self, client, monkeypatch):
        self._break_db(monkeypatch, chroma_ok=False)
        resp = client.get("/health/ready")
        assert resp.status_code == 503
        assert resp.json()["checks"]["chroma"] == "error"