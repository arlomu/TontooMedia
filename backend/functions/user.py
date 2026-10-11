"""User-Funktionen: Registrieren und Einloggen.

Gehört zu backend/functions/ – ein Funktionsbereich, eine Datei.
Baut auf storage.Storage (SQLite) auf und gibt nur öffentliche
User-Dicts zurück (ohne Passwort-Hash).

Regeln sind 1:1 wie im Frontend (Register/Login/Einstellungen):
  - Name: 1–40 Zeichen
  - Username: 3–20 Zeichen, nur a–z, 0–9, Punkt, Unterstrich
  - Passwort: mindestens 4 Zeichen
  - Bio: höchstens 160 Zeichen
  - Avatar: PNG/JPEG/WebP bis 3 MB, wird auf max. 1024x1024 verkleinert
"""
import io
import re
from pathlib import Path
from typing import Optional

try:
    from ..logger import get_logger
    from ..storage import Storage
except ImportError:  # direkter Start, backend/ liegt auf sys.path
    from logger import get_logger
    from storage import Storage

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None

log = get_logger("tontoo.functions.user")

USERNAME_RE = re.compile(r"^[a-z0-9._]{3,20}$")
MIN_PASSWORD_LEN = 4
MAX_NAME_LEN = 40
MAX_BIO_LEN = 160
MAX_AVATAR_BYTES = 3 * 1024 * 1024
AVATAR_SIZE = 1024

# <Projekt>/backend/functions/user.py -> <Projekt>/db/avatars/
AVATAR_DIR = Path(__file__).resolve().parent.parent.parent / "db" / "avatars"


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


def validate_profile(name: str, username: str, bio: str) -> list:
    """Prüft Profil-Daten, gibt eine Liste mit Fehlermeldungen zurück (leer = ok)."""
    errors = []
    name = (name or "").strip()
    username = (username or "").strip()
    bio = (bio or "").strip()
    if not name:
        errors.append("Bitte einen Namen eingeben.")
    elif len(name) > MAX_NAME_LEN:
        errors.append(f"Der Name darf höchstens {MAX_NAME_LEN} Zeichen haben.")
    if not username:
        errors.append("Bitte einen Username eingeben.")
    elif not USERNAME_RE.match(username):
        errors.append("Username: 3–20 Zeichen, nur a–z, 0–9, Punkt und Unterstrich.")
    if len(bio) > MAX_BIO_LEN:
        errors.append(f"Die Bio darf höchstens {MAX_BIO_LEN} Zeichen haben.")
    return errors


def update_profile(storage: Storage, user_id: int, name: str, username: str, bio: str) -> dict:
    """Aktualisiert Name/Username/Bio. Gibt den öffentlichen User zurück.

    Wirft ValueError mit deutscher Meldung bei ungültigen Daten oder
    bereits vergebenem Username.
    """
    errors = validate_profile(name, username, bio)
    if errors:
        raise ValueError(" ".join(errors))
    try:
        storage.update_profile(user_id, name.strip(), username.strip(), (bio or "").strip())
    except ValueError:
        raise ValueError(f"Username '{username.strip()}' ist bereits vergeben.")
    user = storage.get_user_by_id(user_id)
    assert user is not None
    log.info("Profil gespeichert: id=%d", user_id)
    return _public(user)


def save_avatar(storage: Storage, user_id: int, data: bytes) -> str:
    """Speichert ein Avatar-Bild (PNG, max. 1024x1024). Gibt den Dateinamen zurück.

    Wirft ValueError bei zu großen Dateien oder ungültigen/unlesbaren Bildern.
    """
    if Image is None:
        raise ValueError("Bildverarbeitung ist auf dem Server nicht verfügbar.")
    if not data or len(data) > MAX_AVATAR_BYTES:
        raise ValueError("Das Bild darf höchstens 3 MB groß sein.")
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception:
        raise ValueError("Das ist kein lesbares PNG-, JPEG- oder WebP-Bild.")
    if img.format not in ("PNG", "JPEG", "JPG", "WEBP"):
        raise ValueError("Nur PNG, JPEG oder WebP sind erlaubt.")
    img = img.convert("RGB")
    img.thumbnail((AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS)
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"user_{int(user_id)}.png"
    img.save(AVATAR_DIR / filename, format="PNG")
    storage.set_avatar(user_id, filename)
    log.info("Avatar gespeichert: id=%d (%s)", user_id, filename)
    return filename


def clear_avatar(storage: Storage, user_id: int) -> None:
    """Löscht den Avatar (Datei + DB-Eintrag), danach gilt wieder der Standard."""
    user = storage.get_user_by_id(user_id)
    if user and user.get("avatar"):
        try:
            (AVATAR_DIR / user["avatar"]).unlink(missing_ok=True)
        except OSError:
            pass
    storage.set_avatar(user_id, None)
    log.info("Avatar zurückgesetzt: id=%d", user_id)
