import asyncio

import pytest

from app.errors import UploadTooLargeError, UploadValidationError
from app.validation import read_upload_limited, safe_filename, validate_extension


class TestSafeFilename:
    def test_does_not_change_basename(self):
        assert safe_filename("resume.pdf") == "resume.pdf"

    def test_strips_windows_path_segments(self):
        assert safe_filename("C:\\Users\\evil\\resume.pdf") == "resume.pdf"

    def test_strips_unix_path_segments(self):
        assert safe_filename("../../etc/passwd.pdf") == "passwd.pdf"

    def test_dot_dot_rejected(self):
        with pytest.raises(UploadValidationError):
            safe_filename("..")

    def test_empty_rejected(self):
        with pytest.raises(UploadValidationError):
            safe_filename("")

    def test_control_characters_rejected(self):
        with pytest.raises(UploadValidationError):
            safe_filename("evil\x00.pdf")

    def test_too_long_rejected(self):
        with pytest.raises(UploadValidationError):
            safe_filename("a" * 300 + ".pdf")


class TestValidateExtension:
    def test_valid_extension(self):
        assert validate_extension("RESUME.PDF") == ".pdf"

    def test_invalid_extension_rejected(self):
        with pytest.raises(UploadValidationError):
            validate_extension("malware.exe")

    def test_no_extension_rejected(self):
        with pytest.raises(UploadValidationError):
            validate_extension("malware")


class FakeFile:
    def __init__(self, data, chunk_size=1024 * 1024):
        self.data = data
        self.chunk_size = chunk_size
        self._pos = 0

    async def read(self, n):
        part = self.data[self._pos : self._pos + n]
        self._pos += n
        return part


class TestReadUploadLimited:
    def test_small_file_returned(self):
        async def _run():
            return await read_upload_limited(FakeFile(b"x" * 100))

        assert asyncio.run(_run()) == b"x" * 100

    def test_oversized_file_rejected(self, monkeypatch):
        from app import validation

        monkeypatch.setattr(validation.settings, "MAX_UPLOAD_SIZE_BYTES", 1024)

        async def _run():
            return await read_upload_limited(FakeFile(b"x" * 2048))

        with pytest.raises(UploadTooLargeError):
            asyncio.run(_run())