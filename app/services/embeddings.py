from __future__ import annotations

import logging
import threading

from app.errors import EmbeddingError

logger = logging.getLogger(__name__)

_model = None
_model_lock = threading.Lock()


def _get_model():
    """Load the sentence-transformers model lazily on first use.

    Lazy loading keeps torch out of memory until an embedding is actually
    needed, dramatically reducing startup memory on low-RAM machines.
    """
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                try:
                    from sentence_transformers import SentenceTransformer

                    logger.info("Loading sentence-transformers model all-MiniLM-L6-v2")
                    _model = SentenceTransformer("all-MiniLM-L6-v2")
                    logger.info("Sentence-transformers model loaded")
                except Exception as e:
                    raise EmbeddingError(
                        f"Failed to load embedding model: {e.__class__.__name__}"
                    ) from e
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    try:
        return _get_model().encode(texts, convert_to_numpy=True).tolist()
    except EmbeddingError:
        raise
    except Exception as e:
        raise EmbeddingError(f"Embedding generation failed: {e.__class__.__name__}") from e


def embed_query(text: str) -> list[float]:
    try:
        return _get_model().encode([text], convert_to_numpy=True).tolist()[0]
    except EmbeddingError:
        raise
    except Exception as e:
        raise EmbeddingError(f"Embedding generation failed: {e.__class__.__name__}") from e