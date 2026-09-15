import uuid

import pytest

from app.errors import VectorStoreError
from app.services.vectorstore import VectorStore


@pytest.fixture
def store(tmp_path):
    """A real Chroma-backed store isolated to a temp dir (no torch needed)."""
    return VectorStore(persist_path=str(tmp_path))


class TestVectorStore:
    def test_add_and_query_roundtrip(self, store):
        tenant = str(uuid.uuid4())
        doc_id = str(uuid.uuid4())
        chunks = ["cats eat fish", "dogs chase cars"]
        emb = [[1.0, 0.0], [0.0, 1.0]]

        store.add_chunks(tenant, doc_id, chunks, emb)

        results = store.query(tenant, [1.0, 0.0], top_k=1)
        assert len(results) == 1
        assert results[0]["text"] == "cats eat fish"
        assert results[0]["doc_id"] == doc_id
        assert results[0]["chunk_index"] == 0
        assert "distance" in results[0]

    def test_tenant_isolation(self, store):
        tenant_a = "tenant-a"
        tenant_b = "tenant-b"
        store.add_chunks(tenant_a, "docA", ["alpha secret A"], [[1.0, 0.0]])
        store.add_chunks(tenant_b, "docB", ["bravo secret B"], [[1.0, 0.0]])

        # A query in tenant A must NEVER see tenant B content.
        results = store.query(tenant_a, [1.0, 0.0], top_k=5)
        texts = [r["text"] for r in results]
        assert "alpha secret A" in texts
        assert "bravo secret B" not in texts

    def test_heartbeat(self, store):
        assert store.heartbeat() is True

    def test_module_wrappers_still_exist(self):
        from app.services import vectorstore as vs

        assert callable(vs.add_chunks)
        assert callable(vs.query_tenant)

    def test_failed_write_raises_vector_store_error(self, store):
        class BrokenClient:
            def get_or_create_collection(self, name):
                raise RuntimeError("chroma down")

        broken = VectorStore(client=BrokenClient())
        with pytest.raises(VectorStoreError):
            broken.add_chunks("t", "d", ["x"], [[0.0]])
        with pytest.raises(VectorStoreError):
            broken.query("t", [0.0])