import pytest

from app.services.embeddings import embed_query, embed_texts
from app.services.embeddings import _model, _get_model


class TestEmbeddingsSurface:
    def test_functions_exist(self):
        assert callable(embed_texts)
        assert callable(embed_query)

    def test_model_not_loaded_at_import(self):
        # Lazy loading: importing app modules must not pull torch into memory.
        assert _model is None

    def test_missing_model_load_raises_embedding_error(self, monkeypatch):
        import app.services.embeddings as emb

        def boom():
            raise RuntimeError("model download failed")

        monkeypatch.setattr(emb, "_get_model", boom)
        with pytest.raises(emb.EmbeddingError):
            embed_query("hello")

    def test_encode_failure_raises_embedding_error(self, monkeypatch):
        import app.services.embeddings as emb

        class FakeModel:
            def encode(self, *a, **k):
                raise RuntimeError("encode boom")

        monkeypatch.setattr(emb, "_get_model", lambda: FakeModel())
        with pytest.raises(emb.EmbeddingError):
            embed_texts(["hello"])


@pytest.mark.integration
def test_real_embedding_dimensions_integration():
    """Real model test — loads torch (skip by default; run with -m integration)."""
    result = embed_query("test embedding")
    assert isinstance(result, list)
    assert len(result) == 384
    assert all(isinstance(v, float) for v in result)

    batch = embed_texts(["one", "two"])
    assert len(batch) == 2
    assert len(batch[0]) == 384


@pytest.mark.integration
def test_real_model_is_minilm_integration():
    model = _get_model()
    assert model.get_sentence_embedding_dimension() == 384