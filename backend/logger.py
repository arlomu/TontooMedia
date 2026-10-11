"""Zentraler Logger für TontooMedia (Backend + alle Module)."""
import logging
import sys

_INITIALIZED = False

COLORS = {
    "DEBUG": "\033[36m",    # cyan
    "INFO": "\033[32m",     # green
    "WARNING": "\033[33m",  # yellow
    "ERROR": "\033[31m",    # red
    "CRITICAL": "\033[41m", # red bg
}
RESET = "\033[0m"


class _ColorFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        level = record.levelname
        if sys.stdout.isatty():
            color = COLORS.get(level, "")
            record.levelname = f"{color}{level:<8}{RESET}" if color else level
        return super().format(record)


def setup(level: int = logging.INFO) -> None:
    """Richtet das Root-Logging einmalig ein."""
    global _INITIALIZED
    if _INITIALIZED:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        _ColorFormatter("[%(asctime)s] %(levelname)s %(name)s: %(message)s", "%H:%M:%S")
    )
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)
    _INITIALIZED = True


def get_logger(name: str = "tontoo") -> logging.Logger:
    """Gibt einen benannten Logger zurück. Stellt Setup sicher."""
    setup()
    return logging.getLogger(name)
