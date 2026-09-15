import logging

import chromadb
from chromadb.config import Settings

from app.config import settings
from app.errors import VectorStoreError

logger = logging.getLogger(__name__)

# =============================================================================
# MULTI-TENANCY ISOLATION — ONE COLLECTION PER TENANT
# =============================================================================
# Each tenant gets their own ChromaDB collection. This is a stronger isolation
# guarantee than storing all tenants in one collection and filtering by a
# metadata field. With separate collections, a similarity search physically
# CANNOT return another tenant's data — there is no metadata filter to forget,
# no query parameter to accidentally omit. The data simply does not exist in
# the collection being searched. This is isolation by architecture, not by
# convention.
# =============================================================================


class VectorStore:
    """Chroma-backed vector store with one isolated collection per tenant."""

    def __init__(self, persist_path: str | None = None, client=None):
        self._client = client or chromadb.PersistentClient(
            path=persist_path or settings.CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False),
        )

    @staticmethod
    def _collection_name(tenant_id: str) -> str:
        return f"tenant_{tenant_id}"

    def add_chunks(
        self, tenant_id: str, doc_id: str, chunks: list[str], embeddings: list[list[float]]
    ) -> None:
        """Store text chunks into the tenant's isolated Chroma collection."""
        try:
            collection = self._client.get_or_create_collection(
                name=self._collection_name(tenant_id)
            )
            ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
            metadatas = [{"doc_id": str(doc_id), "chunk_index": i} for i in range(len(chunks))]
            collection.add(
                ids=ids,
                documents=chunks,
                embeddings=embeddings,
                metadatas=metadatas,
            )
        except VectorStoreError:
            raise
        except Exception as e:
            logger.error("Vector store write failed for doc %s", doc_id)
            raise VectorStoreError("Failed to write chunks to vector store") from e

    def query(
        self, tenant_id: str, query_embedding: list[float], top_k: int = 5
    ) -> list[dict]:
        """Search ONLY within the tenant's own collection.

        Returns a list of dicts with 'text', 'doc_id', 'chunk_index', and 'distance'.
        """
        try:
            collection = self._client.get_or_create_collection(
                name=self._collection_name(tenant_id)
            )
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
            )
        except VectorStoreError:
            raise
        except Exception as e:
            logger.error("Vector store query failed for tenant %s", tenant_id)
            raise VectorStoreError("Failed to query vector store") from e

        retrieved = []
        for i in range(len(results["ids"][0])):
            retrieved.append({
                "text": results["documents"][0][i],
                "doc_id": results["metadatas"][0][i]["doc_id"],
                "chunk_index": results["metadatas"][0][i]["chunk_index"],
                "distance": results["distances"][0][i],
            })
        return retrieved

    def heartbeat(self) -> bool:
        """Return True if the Chroma client can reach its store."""
        try:
            self._client.heartbeat()
            return True
        except Exception:
            return False


vector_store = VectorStore()


def add_chunks(tenant_id: str, doc_id: str, chunks: list[str], embeddings: list[list[float]]) -> None:
    return vector_store.add_chunks(tenant_id, doc_id, chunks, embeddings)


def query_tenant(tenant_id: str, query_embedding: list[float], top_k: int = 5) -> list[dict]:
    return vector_store.query(tenant_id, query_embedding, top_k)