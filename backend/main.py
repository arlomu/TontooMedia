"""TontooMedia Backend - Main Entry Point.

Startet aktuell:
  - storage.py  (SQLite in db/users.db)
  - api.py      (JSON-API auf Port 3001)
  - webserver.py (React-Frontend auf Port 3000)

Später kommt hier die eigentliche Main-Logic hin.
"""
import signal
import sys
import time
from pathlib import Path

# Ermöglicht `python backend/main.py` sowie `python -m backend.main`
sys.path.insert(0, str(Path(__file__).resolve().parent))

from api import start as start_api, stop as stop_api  # noqa: E402
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
    start_api(storage)

    try:
        start_webserver(PORT)
    except FileNotFoundError:
        log.error("Webserver konnte nicht starten (Frontend-Ordner fehlt).")
        stop_api()
        storage.stop()
        return 1
    except Exception as exc:  # noqa: BLE001
        log.error("Webserver-Fehler: %s", exc)
        stop_api()
        storage.stop()
        return 1

    log.info("Backend läuft. Frontend: http://localhost:%d | Strg+C zum Beenden.", PORT)

    try:
        while _running:
            time.sleep(0.5)
    except KeyboardInterrupt:
        log.info("KeyboardInterrupt, beende ...")

    stop_webserver()
    stop_api()
    storage.stop()
    log.info("=== TontooMedia Backend beendet ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
