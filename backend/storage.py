"""Storage-Platzhalter für TontooMedia.

Macht aktuell bewusst noch gar nichts.
Hier kommt später DB / Files / etc. hin.
"""

from typing import Any, Optional

try:
    from .logger import get_logger
except ImportError:  # direkter Start via `python backend/storage.py`
    from logger import get_logger

log = get_logger("tontoo.storage")


class Storage:
    """No-op Storage für die Basis. API steht schon, Logik folgt später."""

    def __init__(self) -> None:
        self._ready = False

    def start(self) -> None:
        """Startet Storage (aktuell nur Platzhalter)."""
        log.info("Storage gestartet (Platzhalter, keine Funktion).")
        self._ready = True

    def stop(self) -> None:
        """Stoppt Storage (aktuell nur Platzhalter)."""
        log.info("Storage gestoppt (Platzhalter).")
        self._ready = False

    @property
    def ready(self) -> bool:
        return self._ready

    # --- Platzhalter-API für später ---
    def get(self, key: str, default: Optional[Any] = None) -> Optional[Any]:
        return default

    def set(self, key: str, value: Any) -> None:
        log.debug("Storage.set(%s) ignoriert (Platzhalter).", key)

    def delete(self, key: str) -> None:
        log.debug("Storage.delete(%s) ignoriert (Platzhalter).", key)


if __name__ == "__main__":
    s = Storage()
    s.start()
