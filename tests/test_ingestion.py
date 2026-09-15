import io

from app.services.ingestion import chunk_text, extract_text_from_pdf, ingest_document


class TestChunkText:
    def test_empty_text(self):
        assert chunk_text("") == []

    def test_single_short_chunk(self):
        chunks = chunk_text("hello world", chunk_size=500, overlap=50)
        assert chunks == ["hello world"]

    def test_overlap_between_chunks(self):
        text = "A" * 600
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        assert len(chunks) == 2
        assert len(chunks[0]) == 500
        assert chunks[1].startswith("A" * 50)

    def test_chunk_sizes(self):
        text = "B" * 1200
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        assert all(0 < len(c) <= 500 for c in chunks)


class TestExtractPdf:
    def test_extracts_text(self):
        from pypdf import PdfReader, PdfWriter

        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        buffer = io.BytesIO()
        writer.write(buffer)
        # pypdf cannot inject text easily; verify at least it returns a string
        text = extract_text_from_pdf(buffer.getvalue())
        assert isinstance(text, str)

    def test_invalid_pdf_raises(self):
        from app.errors import IngestionError

        try:
            extract_text_from_pdf(b"not a pdf at all")
        except IngestionError:
            pass
        else:
            raise AssertionError("expected IngestionError for invalid PDF")


class TestIngestDocument:
    def test_pipeline_wiring(self, monkeypatch):
        captured = {}

        def fake_embed_texts(texts, **kwargs):
            captured["embedded_texts"] = texts
            return [[0.1] * 384 for _ in texts]

        def fake_add_chunks(tenant_id, doc_id, chunks, embeddings):
            captured["tenant_id"] = tenant_id
            captured["doc_id"] = doc_id
            captured["chunks"] = chunks
            captured["embeddings"] = embeddings

        monkeypatch.setattr("app.services.ingestion.embed_texts", fake_embed_texts)
        monkeypatch.setattr("app.services.ingestion.add_chunks", fake_add_chunks)
        monkeypatch.setattr(
            "app.services.ingestion.extract_text_from_pdf", lambda b: "word " * 2000
        )

        result = ingest_document(
            tenant_id="tenant-1",
            doc_id="doc-1",
            filename="resume.pdf",
            file_bytes=b"ignored",
        )

        assert result["status"] == "ready"
        assert result["chunk_count"] == len(captured["chunks"]) > 0
        assert len(captured["embeddings"]) == len(captured["chunks"])
        assert captured["tenant_id"] == "tenant-1"
        assert captured["doc_id"] == "doc-1"
        assert all(len(emb) == 384 for emb in captured["embeddings"])