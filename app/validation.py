import os

from app.config import settings
from app.errors import UploadTooLargeError, UploadValidationError


def safe_filename(filename: str) -> str:
    """Sanitize an uploaded filename to prevent path traversal and control chars.

    Normalizes Windows and POSIX separators, keeps only the basename, and rejects
    anything unsafe. The stored name can never contain a path separator.
    """
    name = (filename or "").replace("\\", "/").rsplit("/", 1)[-1]
    name = name.strip()
    if not name:
        raise UploadValidationError("Filename is empty")
    if name in {".", ".."}:
        raise UploadValidationError("Invalid filename")
    if len(name) > settings.MAX_UPLOAD_FILENAME_LENGTH:
        raise UploadValidationError("Filename is too long")
    if any(ord(ch) < 32 or ord(ch) == 127 for ch in name):
        raise UploadValidationError("Filename contains control characters")
    return name


def validate_extension(filename: str) -> str:
    """Return the lowercased extension if it is in the allowed set."""
    allowed = {
        e.strip().lower()
        for e in settings.ALLOWED_UPLOAD_EXTENSIONS.split(",")
        if e.strip()
    }
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed:
        raise UploadValidationError(
            f"Unsupported file type '{ext or 'unknown'}'. "
            f"Allowed: {', '.join(sorted(allowed))}"
        )
    return ext


async def read_upload_limited(file) -> bytes:
    """Read an UploadFile streaming, aborting if it exceeds the size limit."""
    total = 0
    parts = []
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > settings.MAX_UPLOAD_SIZE_BYTES:
            raise UploadTooLargeError(
                f"File exceeds the maximum allowed size of "
                f"{settings.MAX_UPLOAD_SIZE_BYTES} bytes"
            )
        parts.append(chunk)
    return b"".join(parts)