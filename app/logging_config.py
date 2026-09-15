import logging
import sys

_LOG_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
_LOG_DATE_FORMAT = "%Y-%m-%dT%H:%M:%S%z"


def setup_logging() -> None:
    """Configure structured, consistent logging for the whole application.

    Format is stable and machine-parseable. Call exactly once at startup.
    """
    logging.basicConfig(
        level=logging.INFO,
        format=_LOG_FORMAT,
        datefmt=_LOG_DATE_FORMAT,
        stream=sys.stdout,
        force=True,
    )