"""JSON-API für TontooMedia (Frontend auf Port 3000 -> API auf Port 3001).

Endpunkte (alle unter /api/...):
  POST   /api/register      {name, username, password} -> {user, token}
  POST   /api/login         {username, password} -> {user, token}
  DELETE /api/session       (Bearer-Token) -> {ok: true}
  GET    /api/me            (Bearer-Token) -> {user}
  PATCH  /api/me            {name?, username?, bio?} -> {user}
  POST   /api/me/avatar     {data: "data:image/...;base64,..."} -> {user}
  DELETE /api/me/avatar     -> {user} (zurück zum Standard)
  GET    /api/avatar/<datei>  Avatar-Bild (Fallback: Standard-Avatar)

Auth per `Authorization: Bearer <token>`. Alles Demo, kein HTTPS.
"""
import json
import sys
import threading
from base64 import b64decode
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional

try:
    from .functions.user import (
        clear_avatar,
        login,
        register,
        save_avatar,
        update_profile,
    )
    from .logger import get_logger
    from .storage import Storage
except ImportError:  # direkter Start via `python backend/api.py`
    from functions.user import (
        clear_avatar,
        login,
        register,
        save_avatar,
        update_profile,
    )
    from logger import get_logger
    from storage import Storage

log = get_logger("tontoo.api")

API_PORT = 3001
BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_AVATAR = BASE_DIR / "frontend" / "public" / "assets" / "Tontoo_Black.png"
AVATAR_DIR = BASE_DIR / "db" / "avatars"

# Serialisiert alle Storage-Zugriffe (SQLite-Verbindung ist geteilt).
DB_LOCK = threading.Lock()

_storage: Optional[Storage] = None
_server: Optional[ThreadingHTTPServer] = None


def avatar_url(filename: Optional[str]) -> str:
    """Relative Avatar-URL (Frontend hängt die API-Basis davor)."""
    return f"/api/avatar/{filename}" if filename else "/api/avatar/default"


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "username": user["username"],
        "bio": user.get("bio") or "",
        "avatarUrl": avatar_url(user.get("avatar")),
        "hasAvatar": bool(user.get("avatar")),
        "created_at": user["created_at"],
    }


class _Handler(BaseHTTPRequestHandler):
    server_version = "TontooAPI/0.1"

    # ---------- Helfer ----------

    def _send(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _ok(self, payload: dict) -> None:
        self._send(200, payload)

    def _fail(self, status: int, message: str) -> None:
        self._send(status, {"error": message})

    def _read_json(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > 5 * 1024 * 1024:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            return {}

    def _bearer(self) -> Optional[str]:
        auth = self.headers.get("Authorization") or ""
        if auth.startswith("Bearer "):
            return auth[7:].strip() or None
        return None

    def _auth_user(self):
        """Gibt (user_dict, user_id) zum Bearer-Token zurück, oder (None, None)."""
        token = self._bearer()
        if not token or _storage is None:
            return None, None
        with DB_LOCK:
            user_id = _storage.get_session_user_id(token)
            if user_id is None:
                return None, None
            user = _storage.get_user_by_id(user_id)
        return (user, user_id) if user else (None, None)

    # ---------- Routing ----------

    def do_OPTIONS(self) -> None:  # noqa: N802 (BaseHTTPRequestHandler-Konvention)
        self._send(204, {})

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/api/me":
            user, _ = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            return self._ok({"user": public_user(user)})
        if self.path.startswith("/api/avatar/"):
            return self._serve_avatar(self.path[len("/api/avatar/"):])
        return self._fail(404, "Unbekannter Endpunkt.")

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/api/register":
            body = self._read_json()
            try:
                with DB_LOCK:
                    user = register(
                        _storage,
                        body.get("name", ""),
                        body.get("username", ""),
                        body.get("password", ""),
                    )
                    token = _storage.create_session(user["id"])
            except ValueError as e:
                return self._fail(400, str(e))
            return self._send(201, {"user": public_user(user), "token": token})
        if self.path == "/api/login":
            body = self._read_json()
            try:
                with DB_LOCK:
                    user = login(_storage, body.get("username", ""), body.get("password", ""))
                    token = _storage.create_session(user["id"])
            except ValueError as e:
                return self._fail(401, str(e))
            return self._ok({"user": public_user(user), "token": token})
        if self.path == "/api/me/avatar":
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            data_url = self._read_json().get("data", "")
            try:
                _, _, b64 = data_url.partition(",")
                raw = b64decode(b64 or data_url)
            except Exception:
                return self._fail(400, "Ungültige Bilddaten.")
            try:
                with DB_LOCK:
                    save_avatar(_storage, user_id, raw)
                    fresh = _storage.get_user_by_id(user_id)
            except ValueError as e:
                return self._fail(400, str(e))
            return self._ok({"user": public_user(fresh)})
        return self._fail(404, "Unbekannter Endpunkt.")

    def do_PATCH(self) -> None:  # noqa: N802
        if self.path == "/api/me":
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            body = self._read_json()
            try:
                with DB_LOCK:
                    fresh = update_profile(
                        _storage,
                        user_id,
                        body.get("name", user["name"]),
                        body.get("username", user["username"]),
                        body.get("bio", user.get("bio") or ""),
                    )
            except ValueError as e:
                return self._fail(400, str(e))
            return self._ok({"user": public_user(fresh)})
        return self._fail(404, "Unbekannter Endpunkt.")

    def do_DELETE(self) -> None:  # noqa: N802
        if self.path == "/api/session":
            token = self._bearer()
            if token and _storage is not None:
                with DB_LOCK:
                    _storage.delete_session(token)
            return self._ok({"ok": True})
        if self.path == "/api/me/avatar":
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            with DB_LOCK:
                clear_avatar(_storage, user_id)
                fresh = _storage.get_user_by_id(user_id)
            return self._ok({"user": public_user(fresh)})
        return self._fail(404, "Unbekannter Endpunkt.")

    def _serve_avatar(self, name: str) -> None:
        target = (AVATAR_DIR / name) if name and name != "default" else None
        if target is None or not target.is_file():
            target = DEFAULT_AVATAR
        if not target.is_file():
            return self._fail(404, "Kein Avatar.")
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt: str, *args) -> None:  # noqa: N802
        log.debug("%s - %s", self.address_string(), fmt % args)


def start(storage: Storage, port: int = API_PORT) -> None:
    """Startet den API-Server (non-blocking, eigener Thread)."""
    global _storage, _server
    _storage = storage
    _server = ThreadingHTTPServer(("127.0.0.1", port), _Handler)
    log.info("API-Server auf http://localhost:%d", port)
    threading.Thread(target=_server.serve_forever, daemon=True).start()


def stop() -> None:
    """Stoppt den API-Server."""
    global _server
    if _server is not None:
        log.info("Stoppe API-Server ...")
        _server.shutdown()
        _server.server_close()
        _server = None


def run_forever(storage: Storage, port: int = API_PORT) -> None:
    """Startet den API-Server und blockiert (für direkten Start/Test)."""
    global _storage, _server
    _storage = storage
    _server = ThreadingHTTPServer(("127.0.0.1", port), _Handler)
    log.info("API-Server auf http://localhost:%d (Strg+C zum Beenden).", port)
    try:
        _server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop()


if __name__ == "__main__":
    from logger import setup as _setup

    _setup()
    _s = Storage()
    _s.start()
    try:
        run_forever(_s, int(sys.argv[1]) if len(sys.argv) > 1 else API_PORT)
    finally:
        _s.stop()
