"""User-Funktionen: Registrieren und Einloggen.

Gehört zu backend/functions/ – ein Funktionsbereich, eine Datei.
Baut auf storage.Storage (SQLite) auf und gibt nur öffentliche
User-Dicts zurück (ohne Passwort-Hash).

Regeln sind 1:1 wie im Frontend (Register/Login/Einstellungen):
  - Name: 1–40 Zeichen
  - Username: 3–20 Zeichen, nur a–z, 0–9, Punkt, Unterstrich
  - Passwort: mindestens 4 Zeichen
"""
import re
from typing import Optional

try:
    from ..logger import get_logger
    from ..storage import Storage
except ImportError:  # direkter Start, backend/ liegt auf sys.path
    from logger import get_logger
    from storage import Storage

log = get_logger("tontoo.functions.user")

USERNAME_RE = re.compile(r"^[a-z0-9._]{3,20}$")
MIN_PASSWORD_LEN = 4
MAX_NAME_LEN = 40


def _public(user: dict) -> dict:
    """Gibt den User ohne Passwort-Hash zurück."""
    user = dict(user)
    user.pop("password_hash", None)
    return user


def validate_new_user(name: str, username: str, password: str) -> list:
    """Prüft Registrierungs-Daten, gibt eine Liste mit Fehlermeldungen zurück (leer = ok)."""
    errors = []
    name = (name or "").strip()
    username = (username or "").strip()
    if not name:
        errors.append("Bitte einen Namen eingeben.")
    elif len(name) > MAX_NAME_LEN:
        errors.append(f"Der Name darf höchstens {MAX_NAME_LEN} Zeichen haben.")
    if not username:
        errors.append("Bitte einen Username eingeben.")
    elif not USERNAME_RE.match(username):
        errors.append("Username: 3–20 Zeichen, nur a–z, 0–9, Punkt und Unterstrich.")
    if not password or len(password) < MIN_PASSWORD_LEN:
        errors.append(f"Das Passwort muss mindestens {MIN_PASSWORD_LEN} Zeichen haben.")
    return errors


def register(storage: Storage, name: str, username: str, password: str) -> dict:
    """Registriert einen User. Gibt den öffentlichen User zurück.

    Wirft ValueError mit deutscher Meldung bei ungültigen Daten oder
    bereits vergebenem Username.
    """
    errors = validate_new_user(name, username, password)
    if errors:
        raise ValueError(" ".join(errors))
    username = username.strip()
    try:
        user_id = storage.create_user(name.strip(), username, password)
    except ValueError:
        raise ValueError(f"Username '{username}' ist bereits vergeben.")
    log.info("User registriert: %s (id=%d)", username, user_id)
    user = storage.find_user(username)
    assert user is not None
    return _public(user)


def login(storage: Storage, username: str, password: str) -> dict:
    """Loggt einen User ein. Gibt den öffentlichen User zurück.

    Wirft ValueError bei falschem Username oder Passwort (absichtlich
    dieselbe Meldung für beides).
    """
    username = (username or "").strip()
    if not username or not password:
        raise ValueError("Bitte Username und Passwort eingeben.")
    user = storage.check_password(username, password)
    if user is None:
        raise ValueError("Username oder Passwort ist falsch.")
    log.info("User eingeloggt: %s", username)
    return user


def get_user(storage: Storage, username: str) -> Optional[dict]:
    """Holt einen User per Username (ohne Hash), oder None."""
    user = storage.find_user((username or "").strip())
    return _public(user) if user else None
