class SupportPilotError(Exception):
    """Base class for all application-specific errors."""


class UploadValidationError(SupportPilotError):
    """Raised when an uploaded file fails validation (size, type, filename)."""


class UploadTooLargeError(UploadValidationError):
    """Raised when an uploaded file exceeds the configured size limit."""


class EmbeddingError(SupportPilotError):
    """Raised when embedding generation fails."""


class VectorStoreError(SupportPilotError):
    """Raised when the Chroma vector store is unavailable or fails."""


class IngestionError(SupportPilotError):
    """Raised when the document ingestion pipeline fails."""


class LLMError(SupportPilotError):
    """Raised when the LLM/upstream provider fails."""