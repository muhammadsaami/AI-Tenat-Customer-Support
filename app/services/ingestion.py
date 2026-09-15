import logging

from app.errors import EmbeddingError, IngestionError, VectorStoreError
from app.services.embeddings import embed_texts
from app.services.vectorstore import add_chunks

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF file using pypdf."""
    try:
        from pypdf import PdfReader
        import io

        reader = PdfReader(io.BytesIO(file_bytes))
        text_parts = []
        for page in reader.pages:
            text_parts.append(page.extract_text() or "")
        return "\n".join(text_parts)
    except Exception as e:
        logger.error("PDF extraction failed: %s", e.__class__.__name__)
        raise IngestionError("Failed to extract text from PDF") from e


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks.

    We use overlapping chunks because a relevant answer might fall exactly at
    the boundary between two non-overlapping chunks, causing it to be split
    across chunks and potentially missed entirely. The overlap ensures that
    any span of text is fully contained in at least one chunk.
    """
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def ingest_document(tenant_id: str, doc_id: str, filename: str, file_bytes: bytes) -> dict:
    """Full ingestion pipeline: extract → chunk → embed → store.

    Returns a summary dict with chunk count and status.
    """
    try:
        # Step 1: Extract text from PDF
        text = extract_text_from_pdf(file_bytes)

        # Step 2: Split into overlapping chunks
        chunks = chunk_text(text, chunk_size=500, overlap=50)

        # Step 3: Generate embeddings locally
        embeddings = embed_texts(chunks)

        # Step 4: Store in tenant's isolated vector collection
        add_chunks(tenant_id=tenant_id, doc_id=doc_id, chunks=chunks, embeddings=embeddings)

        logger.info(
            "Ingested doc_id=%s tenant_id=%s filename=%s chunks=%d status=ready",
            doc_id, tenant_id, filename, len(chunks),
        )
    except IngestionError:
        raise
    except EmbeddingError as e:
        logger.error("Embedding failed for doc_id=%s", doc_id)
        raise IngestionError("Document embedding failed") from e
    except VectorStoreError as e:
        logger.error("Vector store failed for doc_id=%s", doc_id)
        raise IngestionError("Document storage failed") from e
    except Exception as e:
        logger.error("Unexpected ingestion failure for doc_id=%s: %s", doc_id, e.__class__.__name__)
        raise IngestionError("Document ingestion failed") from e

    return {
        "doc_id": doc_id,
        "filename": filename,
        "chunk_count": len(chunks),
        "status": "ready",
    }