"""TontooMedia Backend - Main Entry Point.

Startet aktuell nur:
  - storage.py  (Platzhalter)
  - webserver.py (React-Frontend auf Port 3000)

Später kommt hier die eigentliche Main-Logic hin.
"""
import signal
import sys
import time
from pathlib import Path

# Ermöglicht `python backend/main.py` sowie `python -m backend.main`
sys.path.insert(0, str(Path(__file__).resolve().parent))

from logger import get_logger, setup  # noqa: E402
from storage import Storage  # noqa: E402
from webserver import PORT, start as start_webserver, stop as stop_webserver  # noqa: E402

setup()
log = get_logger("tontoo.main")

_running = True


def _on_shutdown(signum, frame):
    global _running
    log.info("Shutdown-Signal erhalten (%s), beende ...", signum)
    _running = False


def main() -> int:
    signal.signal(signal.SIGINT, _on_shutdown)
    if hasattr(signal, "SIGTERM"):
        try:
            signal.signal(signal.SIGTERM, _on_shutdown)
        except OSError:
            pass

    log.info("=== TontooMedia Backend startet ===")

    storage = Storage()
    storage.start()

    try:
        start_webserver(PORT)
    except FileNotFoundError:
        log.error("Webserver konnte nicht starten (Frontend-Ordner fehlt).")
        storage.stop()
        return 1
    except Exception as exc:  # noqa: BLE001
        log.error("Webserver-Fehler: %s", exc)
        storage.stop()
        return 1

    log.info("Backend läuft. Frontend: http://localhost:%d | Strg+C zum Beenden.", PORT)

    try:
        while _running:
            time.sleep(0.5)
    except KeyboardInterrupt:
        log.info("KeyboardInterrupt, beende ...")

    stop_webserver()
    storage.stop()
    log.info("=== TontooMedia Backend beendet ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
