"""Storage für TontooMedia: SQLite-Datenbank in <Projekt>/db/users.db."""

import hashlib
import sqlite3
import time
from pathlib import Path
from typing import Optional

try:
    from .logger import get_logger
except ImportError:  # direkter Start via `python backend/storage.py`
    from logger import get_logger

log = get_logger("tontoo.storage")

# <Projekt>/backend/storage.py -> <Projekt>/db/users.db
DB_DIR = Path(__file__).resolve().parent.parent / "db"
DB_PATH = DB_DIR / "users.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
"""


def _hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


class Storage:
    """SQLite-Storage. Legt db/users.db an und verwaltet die User-Tabelle."""

    def __init__(self, db_path: Path = DB_PATH) -> None:
        self.db_path = Path(db_path)
        self._conn: Optional[sqlite3.Connection] = None

    def start(self) -> None:
        """Erstellt db/-Ordner + users.db und stellt das Schema sicher."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.db_path))
        self._conn.execute(_SCHEMA)
        self._conn.commit()
        log.info("Storage gestartet (%s).", self.db_path)

    def stop(self) -> None:
        """Schließt die DB-Verbindung."""
        if self._conn is not None:
            self._conn.close()
            self._conn = None
        log.info("Storage gestoppt.")

    @property
    def ready(self) -> bool:
        return self._conn is not None

    def _require(self) -> sqlite3.Connection:
        if self._conn is None:
            raise RuntimeError("Storage ist nicht gestartet (start() vergessen?).")
        return self._conn

    def create_user(self, name: str, username: str, password: str) -> int:
        """Legt einen User an, gibt die neue ID zurück. Username muss eindeutig sein."""
        conn = self._require()
        try:
            cur = conn.execute(
                "INSERT INTO users (name, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (name.strip(), username.strip(), _hash(password), int(time.time())),
            )
        except sqlite3.IntegrityError:
            raise ValueError(f"Username '{username}' ist bereits vergeben.")
        conn.commit()
        log.info("User angelegt: %s", username)
        return cur.lastrowid

    def find_user(self, username: str) -> Optional[dict]:
        """Findet einen User per Username (case-sensitiv), oder None."""
        conn = self._require()
        cur = conn.execute(
            "SELECT id, name, username, password_hash, created_at FROM users WHERE username = ?",
            (username.strip(),),
        )
        row = cur.fetchone()
        if row is None:
            return None
        return {"id": row[0], "name": row[1], "username": row[2], "password_hash": row[3], "created_at": row[4]}

    def check_password(self, username: str, password: str) -> Optional[dict]:
        """Prüft Username + Passwort. Gibt den User (ohne Hash) zurück oder None."""
        user = self.find_user(username)
        if user is None or user["password_hash"] != _hash(password):
            return None
        user = dict(user)
        del user["password_hash"]
        return user

    def count_users(self) -> int:
        conn = self._require()
        return conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]


if __name__ == "__main__":
    s = Storage()
    s.start()
    log.info("Users in DB: %d", s.count_users())
    s.stop()
