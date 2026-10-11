"""Storage für TontooMedia: SQLite-Datenbank in <Projekt>/db/users.db."""

import hashlib
import secrets
import sqlite3
import time
from pathlib import Path
from typing import Optional

try:
    from .logger import get_logger
except ImportError:  # direkter Start via `python backend/storage.py`
    from logger import get_logger

log = get_logger("tontoo.storage")

# <Projekt>/backend/storage.py -> <Projekt>/db/users.db + sessions.db
DB_DIR = Path(__file__).resolve().parent.parent / "db"
DB_PATH = DB_DIR / "users.db"
SESSION_DB_PATH = DB_DIR / "sessions.db"

# Login-Sessions halten 3 Jahre (überleben auch Backend-Restarts).
SESSION_TTL = 3 * 365 * 24 * 3600

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    avatar TEXT,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shorts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    visibility TEXT NOT NULL DEFAULT 'Öffentlich',
    comments_off INTEGER NOT NULL DEFAULT 0,
    filename TEXT NOT NULL,
    thumb TEXT,
    duration REAL NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 0,
    height INTEGER NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS short_likes (
    short_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (short_id, user_id)
);
CREATE TABLE IF NOT EXISTS short_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_likes_short ON short_likes(short_id);
CREATE INDEX IF NOT EXISTS idx_comments_short ON short_comments(short_id);
"""

_SESSION_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
"""


def _hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


class Storage:
    """SQLite-Storage. users.db für User, sessions.db für Login-Tokens."""

    def __init__(self, db_path: Path = DB_PATH) -> None:
        self.db_path = Path(db_path)
        self._conn: Optional[sqlite3.Connection] = None
        # Sessions leben in einer eigenen DB (sessions.db), daneben.
        self.session_db_path = self.db_path.parent / "sessions.db"
        self._sessions: Optional[sqlite3.Connection] = None

    def start(self) -> None:
        """Erstellt db/-Ordner + DBs und stellt die Schemas sicher."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        # check_same_thread=False: API-Threads nutzen dieselben Verbindungen
        # (Zugriffe werden außen per Lock serialisiert).
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.executescript(_SCHEMA)
        self._migrate()
        self._conn.commit()
        self._sessions = sqlite3.connect(str(self.session_db_path), check_same_thread=False)
        self._sessions.executescript(_SESSION_SCHEMA)
        self._sessions.execute("DELETE FROM sessions WHERE expires_at <= ?", (int(time.time()),))
        self._sessions.commit()
        log.info("Storage gestartet (%s + %s).", self.db_path, self.session_db_path)

    def _migrate(self) -> None:
        """Ergänzt Spalten bei alten DBs (users.db von vor bio/avatar)."""
        assert self._conn is not None
        cols = {row[1] for row in self._conn.execute("PRAGMA table_info(users)").fetchall()}
        if "bio" not in cols:
            self._conn.execute("ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''")
        if "avatar" not in cols:
            self._conn.execute("ALTER TABLE users ADD COLUMN avatar TEXT")
        # Sessions leben seitdem in sessions.db – alte Tabelle hier aufräumen.
        self._conn.execute("DROP TABLE IF EXISTS sessions")

    def stop(self) -> None:
        """Schließt die DB-Verbindungen."""
        if self._conn is not None:
            self._conn.close()
            self._conn = None
        if self._sessions is not None:
            self._sessions.close()
            self._sessions = None
        log.info("Storage gestoppt.")

    @property
    def ready(self) -> bool:
        return self._conn is not None and self._sessions is not None

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
            "SELECT id, name, username, password_hash, bio, avatar, created_at FROM users WHERE username = ?",
            (username.strip(),),
        )
        row = cur.fetchone()
        if row is None:
            return None
        return {"id": row[0], "name": row[1], "username": row[2], "password_hash": row[3],
                "bio": row[4] or "", "avatar": row[5], "created_at": row[6]}

    def get_user_by_id(self, user_id: int) -> Optional[dict]:
        """Findet einen User per ID (mit Hash, intern), oder None."""
        conn = self._require()
        cur = conn.execute(
            "SELECT id, name, username, password_hash, bio, avatar, created_at FROM users WHERE id = ?",
            (user_id,),
        )
        row = cur.fetchone()
        if row is None:
            return None
        return {"id": row[0], "name": row[1], "username": row[2], "password_hash": row[3],
                "bio": row[4] or "", "avatar": row[5], "created_at": row[6]}

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

    def update_profile(self, user_id: int, name: str, username: str, bio: str) -> None:
        """Aktualisiert Name/Username/Bio. Wirft ValueError bei vergebenem Username."""
        conn = self._require()
        try:
            conn.execute(
                "UPDATE users SET name = ?, username = ?, bio = ? WHERE id = ?",
                (name.strip(), username.strip(), (bio or "").strip(), user_id),
            )
        except sqlite3.IntegrityError:
            raise ValueError(f"Username '{username.strip()}' ist bereits vergeben.")
        conn.commit()
        log.info("Profil aktualisiert: id=%d", user_id)

    def set_avatar(self, user_id: int, filename: Optional[str]) -> None:
        """Setzt/löscht den Avatar-Dateinamen (Datei-Handling liegt in user.py)."""
        conn = self._require()
        conn.execute("UPDATE users SET avatar = ? WHERE id = ?", (filename, user_id))
        conn.commit()

    def set_password(self, user_id: int, password: str) -> None:
        """Setzt ein neues Passwort (wird intern gehasht)."""
        conn = self._require()
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (_hash(password), user_id),
        )
        conn.commit()

    def delete_user(self, user_id: int) -> None:
        """Löscht User + dessen Sessions unwiderruflich (Avatar-Datei: user.py)."""
        conn = self._require()
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        sessions = self._require_sessions()
        sessions.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        sessions.commit()
        log.info("User gelöscht: id=%d", user_id)

    def _require_sessions(self) -> sqlite3.Connection:
        if self._sessions is None:
            raise RuntimeError("Storage ist nicht gestartet (start() vergessen?).")
        return self._sessions

    def create_session(self, user_id: int) -> str:
        """Erstellt einen Login-Token für den User (3 Jahre gültig)."""
        conn = self._require_sessions()
        token = secrets.token_hex(32)
        now = int(time.time())
        conn.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, now, now + SESSION_TTL),
        )
        conn.commit()
        return token

    def get_session_user_id(self, token: str) -> Optional[int]:
        """Löst einen Login-Token zur User-ID auf, oder None (auch bei Ablauf)."""
        conn = self._require_sessions()
        cur = conn.execute(
            "SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?",
            (token, int(time.time())),
        )
        row = cur.fetchone()
        if row is None:
            # Abgelaufenen Token gleich mit aufräumen
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
            return None
        return row[0]

    def delete_session(self, token: str) -> None:
        """Löscht einen Login-Token (Logout)."""
        conn = self._require_sessions()
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()

    # ---------- Shorts ----------

    def create_short(
        self,
        user_id: int,
        title: str,
        tags: str,
        visibility: str,
        comments_off: bool,
        filename: str,
        thumb: Optional[str],
        duration: float,
        width: int,
        height: int,
    ) -> int:
        """Legt einen Short an, gibt die neue ID zurück. Tags als JSON-String."""
        conn = self._require()
        cur = conn.execute(
            "INSERT INTO shorts (user_id, title, tags, visibility, comments_off,"
            " filename, thumb, duration, width, height, views, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
            (user_id, title.strip(), tags, visibility, 1 if comments_off else 0,
             filename, thumb, duration, width, height, int(time.time())),
        )
        conn.commit()
        log.info("Short angelegt: id=%d (user=%d)", cur.lastrowid, user_id)
        return cur.lastrowid

    def list_shorts(self, user_id: int) -> list:
        """Alle Shorts eines Users, neueste zuerst (als Dicts)."""
        conn = self._require()
        cur = conn.execute(
            "SELECT id, user_id, title, tags, visibility, comments_off,"
            " filename, thumb, duration, width, height, views, created_at"
            " FROM shorts WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def get_short(self, short_id: int) -> Optional[dict]:
        """Holt einen Short per ID, oder None."""
        conn = self._require()
        cur = conn.execute(
            "SELECT id, user_id, title, tags, visibility, comments_off,"
            " filename, thumb, duration, width, height, views, created_at"
            " FROM shorts WHERE id = ?",
            (short_id,),
        )
        row = cur.fetchone()
        return dict(zip([d[0] for d in cur.description], row)) if row else None

    def update_short(
        self,
        short_id: int,
        title: Optional[str] = None,
        tags: Optional[str] = None,
        visibility: Optional[str] = None,
        comments_off: Optional[bool] = None,
        thumb: Optional[str] = None,
        clear_thumb: bool = False,
    ) -> None:
        """Aktualisiert Titel/Tags/Sichtbarkeit/Kommentare/Thumbnail (nur gesetzte Felder)."""
        conn = self._require()
        sets, vals = [], []
        if title is not None:
            sets.append("title = ?")
            vals.append(title.strip())
        if tags is not None:
            sets.append("tags = ?")
            vals.append(tags)
        if visibility is not None:
            sets.append("visibility = ?")
            vals.append(visibility)
        if comments_off is not None:
            sets.append("comments_off = ?")
            vals.append(1 if comments_off else 0)
        if thumb is not None:
            sets.append("thumb = ?")
            vals.append(thumb)
        elif clear_thumb:
            sets.append("thumb = NULL")
        if not sets:
            return
        vals.append(short_id)
        conn.execute(f"UPDATE shorts SET {', '.join(sets)} WHERE id = ?", vals)
        conn.commit()

    def delete_short(self, short_id: int) -> None:
        """Löscht einen Short-Datensatz (Dateien löscht functions/shorts.py)."""
        conn = self._require()
        conn.execute("DELETE FROM shorts WHERE id = ?", (short_id,))
        conn.commit()

    def count_views(self, user_id: int) -> int:
        """Summe aller Short-Aufrufe eines Users."""
        conn = self._require()
        row = conn.execute(
            "SELECT COALESCE(SUM(views), 0) FROM shorts WHERE user_id = ?", (user_id,)
        ).fetchone()
        return row[0] if row else 0

    # ---------- Feed / Likes / Kommentare ----------

    def list_feed_shorts(self, viewer_id: Optional[int], limit: int = 50, offset: int = 0) -> list:
        """Öffentliche Shorts aller User, neueste zuerst (mit Autor + Zählern)."""
        conn = self._require()
        vid = viewer_id or -1
        cur = conn.execute(
            "SELECT s.id, s.user_id, s.title, s.tags, s.visibility, s.comments_off,"
            " s.filename, s.thumb, s.duration, s.width, s.height, s.views, s.created_at,"
            " u.username, u.name AS author_name, u.avatar AS author_avatar,"
            " (SELECT COUNT(*) FROM short_likes l WHERE l.short_id = s.id) AS likes,"
            " (SELECT COUNT(*) FROM short_comments c WHERE c.short_id = s.id) AS comments_n,"
            " EXISTS(SELECT 1 FROM short_likes l2 WHERE l2.short_id = s.id AND l2.user_id = ?) AS liked"
            " FROM shorts s JOIN users u ON u.id = s.user_id"
            " WHERE s.visibility = 'Öffentlich'"
            " ORDER BY s.id DESC LIMIT ? OFFSET ?",
            (vid, limit, offset),
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def toggle_like(self, short_id: int, user_id: int) -> bool:
        """Like umschalten. Gibt True zurück, wenn jetzt gelikt ist."""
        conn = self._require()
        row = conn.execute(
            "SELECT 1 FROM short_likes WHERE short_id = ? AND user_id = ?",
            (short_id, user_id),
        ).fetchone()
        if row:
            conn.execute(
                "DELETE FROM short_likes WHERE short_id = ? AND user_id = ?",
                (short_id, user_id),
            )
            conn.commit()
            return False
        conn.execute(
            "INSERT INTO short_likes (short_id, user_id, created_at) VALUES (?, ?, ?)",
            (short_id, user_id, int(time.time())),
        )
        conn.commit()
        return True

    def like_count(self, short_id: int) -> int:
        conn = self._require()
        row = conn.execute(
            "SELECT COUNT(*) FROM short_likes WHERE short_id = ?", (short_id,)
        ).fetchone()
        return row[0] if row else 0

    def add_view(self, short_id: int) -> int:
        """Zählt einen Aufruf, gibt die neue Summe zurück."""
        conn = self._require()
        conn.execute("UPDATE shorts SET views = views + 1 WHERE id = ?", (short_id,))
        conn.commit()
        row = conn.execute("SELECT views FROM shorts WHERE id = ?", (short_id,)).fetchone()
        return row[0] if row else 0

    def list_comments(self, short_id: int) -> list:
        """Kommentare zu einem Short, älteste zuerst (mit Autor)."""
        conn = self._require()
        cur = conn.execute(
            "SELECT c.id, c.text, c.created_at, u.username, u.name AS author_name,"
            " u.avatar AS author_avatar"
            " FROM short_comments c JOIN users u ON u.id = c.user_id"
            " WHERE c.short_id = ? ORDER BY c.id ASC",
            (short_id,),
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def add_comment(self, short_id: int, user_id: int, text: str) -> int:
        """Legt einen Kommentar an, gibt die neue ID zurück."""
        conn = self._require()
        cur = conn.execute(
            "INSERT INTO short_comments (short_id, user_id, text, created_at)"
            " VALUES (?, ?, ?, ?)",
            (short_id, user_id, text, int(time.time())),
        )
        conn.commit()
        return cur.lastrowid

    def delete_short_extras(self, short_id: int) -> None:
        """Löscht Likes + Kommentare zu einem Short (bei Short-Löschung)."""
        conn = self._require()
        conn.execute("DELETE FROM short_likes WHERE short_id = ?", (short_id,))
        conn.execute("DELETE FROM short_comments WHERE short_id = ?", (short_id,))
        conn.commit()


if __name__ == "__main__":
    s = Storage()
    s.start()
    log.info("Users in DB: %d", s.count_users())
    s.stop()
