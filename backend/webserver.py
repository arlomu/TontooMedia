"""Webserver-Modul: startet das React-Frontend aus /frontend auf Port 3000."""
import shutil
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional

try:
    from .logger import get_logger
except ImportError:  # direkter Start via `python backend/webserver.py`
    from logger import get_logger

log = get_logger("tontoo.webserver")

PORT = 3000
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

_process: Optional[subprocess.Popen] = None
_server: Optional[ThreadingHTTPServer] = None


def _npm_cmd() -> Optional[str]:
    return shutil.which("npm")


def _has_react_dev_script() -> bool:
    pkg = FRONTEND_DIR / "package.json"
    if not pkg.exists():
        return False
    try:
        import json

        data = json.loads(pkg.read_text(encoding="utf-8"))
        scripts = data.get("scripts", {})
        return "dev" in scripts
    except Exception:
        return False


def start(port: int = PORT) -> None:
    """Startet den Frontend-Server (non-blocking).

    1. Wenn /frontend ein React-Projekt mit `npm run dev` ist -> Vite Dev-Server.
    2. Sonst Fallback: simpler statischer File-Server auf /frontend.
    """
    global _process, _server

    if not FRONTEND_DIR.exists():
        log.error("Frontend-Ordner nicht gefunden: %s", FRONTEND_DIR)
        raise FileNotFoundError(FRONTEND_DIR)

    if _has_react_dev_script() and _npm_cmd():
        npm = _npm_cmd()
        assert npm is not None
        cmd = [npm, "run", "dev", "--", "--port", str(port), "--host"]
        log.info("Starte React-Frontend: %s (cwd=%s)", " ".join(cmd), FRONTEND_DIR)
        # shell=False ist sicherer; npm.cmd wird via which() korrekt aufgelöst.
        _process = subprocess.Popen(cmd, cwd=str(FRONTEND_DIR))
        log.info("Frontend Dev-Server läuft auf http://localhost:%d", port)
        return

    # Fallback: statischer Server (z. B. wenn npm/node fehlt oder kein package.json)
    log.warning("Kein React dev-Script gefunden, nutze statischen Fallback-Server.")
    handler = lambda *args, **kwargs: SimpleHTTPRequestHandler(
        *args, directory=str(FRONTEND_DIR), **kwargs
    )
    _server = ThreadingHTTPServer(("0.0.0.0", port), handler)
    log.info("Statischer Frontend-Server auf http://localhost:%d (%s)", port, FRONTEND_DIR)
    import threading

    threading.Thread(target=_server.serve_forever, daemon=True).start()


def stop() -> None:
    """Stoppt den gestarteten Frontend-Server."""
    global _process, _server
    if _process is not None:
        log.info("Stoppe React-Frontend ...")
        _process.terminate()
        try:
            _process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            _process.kill()
        _process = None
    if _server is not None:
        log.info("Stoppe statischen Server ...")
        _server.shutdown()
        _server.server_close()
        _server = None


def run_forever(port: int = PORT) -> None:
    """Startet den Server und blockiert (für direkten Start)."""
    start(port)
    log.info("Webserver läuft. Strg+C zum Beenden.")
    try:
        if _process is not None:
            _process.wait()
        elif _server is not None:
            import time

            while True:
                time.sleep(3600)
    except KeyboardInterrupt:
        pass
    finally:
        stop()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_forever(port)
