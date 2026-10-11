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
    parent_id INTEGER,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS short_comment_likes (
    comment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (comment_id, user_id)
);
CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL,
    followed_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (follower_id, followed_id)
);
CREATE TABLE IF NOT EXISTS communities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image TEXT,
    rules TEXT NOT NULL DEFAULT '[]',
    creator_id INTEGER,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS community_follows (
    user_id INTEGER NOT NULL,
    community_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, community_id)
);
CREATE TABLE IF NOT EXISTS community_visits (
    user_id INTEGER NOT NULL,
    community_id INTEGER NOT NULL,
    visited_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, community_id)
);
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    images TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id);
CREATE TABLE IF NOT EXISTS post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    parent_id INTEGER,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS post_comment_likes (
    comment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_pcomments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_pcomment_likes ON post_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows(followed_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_cfollow_user ON community_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_cfollow_comm ON community_follows(community_id);
CREATE INDEX IF NOT EXISTS idx_cvisit_user ON community_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_short ON short_likes(short_id);
CREATE INDEX IF NOT EXISTS idx_comments_short ON short_comments(short_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes ON short_comment_likes(comment_id);
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
        # Replies kamen später: parent_id bei alten short_comments ergänzen.
        try:
            ccols = {row[1] for row in self._conn.execute("PRAGMA table_info(short_comments)").fetchall()}
        except Exception:
            ccols = set()
        if ccols and "parent_id" not in ccols:
            self._conn.execute("ALTER TABLE short_comments ADD COLUMN parent_id INTEGER")
        # Regeln kamen später: rules-Spalte bei alten communities ergänzen.
        try:
            cmcols = {row[1] for row in self._conn.execute("PRAGMA table_info(communities)").fetchall()}
        except Exception:
            cmcols = set()
        if cmcols and "rules" not in cmcols:
            self._conn.execute("ALTER TABLE communities ADD COLUMN rules TEXT NOT NULL DEFAULT '[]'")

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
        conn.execute(
            "DELETE FROM follows WHERE follower_id = ? OR followed_id = ?",
            (user_id, user_id),
        )
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

    # ---------- Folgen ----------

    def toggle_follow(self, follower_id: int, followed_id: int) -> bool:
        """Folgen umschalten. Gibt True zurück, wenn jetzt gefolgt wird.

        Wirft ValueError bei Selbst-Follow."""
        if follower_id == followed_id:
            raise ValueError("Du kannst dir nicht selbst folgen.")
        conn = self._require()
        row = conn.execute(
            "SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?",
            (follower_id, followed_id),
        ).fetchone()
        if row:
            conn.execute(
                "DELETE FROM follows WHERE follower_id = ? AND followed_id = ?",
                (follower_id, followed_id),
            )
            conn.commit()
            return False
        conn.execute(
            "INSERT INTO follows (follower_id, followed_id, created_at) VALUES (?, ?, ?)",
            (follower_id, followed_id, int(time.time())),
        )
        conn.commit()
        return True

    def follower_count(self, user_id: int) -> int:
        """Anzahl Follower eines Users."""
        conn = self._require()
        row = conn.execute(
            "SELECT COUNT(*) FROM follows WHERE followed_id = ?", (user_id,)
        ).fetchone()
        return row[0] if row else 0

    def is_following(self, follower_id: int, followed_id: int) -> bool:
        """Prüft, ob follower_id dem followed_id folgt."""
        conn = self._require()
        row = conn.execute(
            "SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?",
            (follower_id, followed_id),
        ).fetchone()
        return row is not None

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
            " EXISTS(SELECT 1 FROM short_likes l2 WHERE l2.short_id = s.id AND l2.user_id = ?) AS liked,"
            " EXISTS(SELECT 1 FROM follows f WHERE f.followed_id = s.user_id AND f.follower_id = ?) AS following"
            " FROM shorts s JOIN users u ON u.id = s.user_id"
            " WHERE s.visibility = 'Öffentlich'"
            " ORDER BY s.id DESC LIMIT ? OFFSET ?",
            (vid, vid, limit, offset),
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def list_user_shorts(
        self, user_id: int, viewer_id: Optional[int], include_private: bool = False
    ) -> list:
        """Shorts eines Users, neueste zuerst (mit Autor + Zählern, wie der Feed).

        Fremde sehen nur öffentliche Shorts, der Besitzer (include_private=True)
        auch private."""
        conn = self._require()
        vid = viewer_id or -1
        vis = "" if include_private else "AND s.visibility = 'Öffentlich'"
        cur = conn.execute(
            "SELECT s.id, s.user_id, s.title, s.tags, s.visibility, s.comments_off,"
            " s.filename, s.thumb, s.duration, s.width, s.height, s.views, s.created_at,"
            " u.username, u.name AS author_name, u.avatar AS author_avatar,"
            " (SELECT COUNT(*) FROM short_likes l WHERE l.short_id = s.id) AS likes,"
            " (SELECT COUNT(*) FROM short_comments c WHERE c.short_id = s.id) AS comments_n,"
            " EXISTS(SELECT 1 FROM short_likes l2 WHERE l2.short_id = s.id AND l2.user_id = ?) AS liked"
            " FROM shorts s JOIN users u ON u.id = s.user_id"
            f" WHERE s.user_id = ? {vis}"
            " ORDER BY s.id DESC",
            (vid, user_id),
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

    def list_comments(self, short_id: int, viewer_id: Optional[int] = None) -> list:
        """Kommentare zu einem Short, älteste zuerst, Replies (1 Stufe) eingenistet."""
        conn = self._require()
        vid = viewer_id or -1
        cur = conn.execute(
            "SELECT c.id, c.text, c.parent_id, c.created_at, u.username,"
            " u.name AS author_name, u.avatar AS author_avatar,"
            " (SELECT COUNT(*) FROM short_comment_likes l WHERE l.comment_id = c.id) AS likes,"
            " EXISTS(SELECT 1 FROM short_comment_likes l2"
            "  WHERE l2.comment_id = c.id AND l2.user_id = ?) AS liked"
            " FROM short_comments c JOIN users u ON u.id = c.user_id"
            " WHERE c.short_id = ? ORDER BY c.id ASC",
            (vid, short_id),
        )
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, row)) for row in cur.fetchall()]
        by_id = {r["id"]: {**r, "replies": []} for r in rows}
        top = []
        for r in rows:
            node = by_id[r["id"]]
            pid = r.get("parent_id")
            if pid and pid in by_id:
                by_id[pid]["replies"].append(node)
            elif not pid:
                top.append(node)
        return top

    def get_comment(self, comment_id: int) -> Optional[dict]:
        conn = self._require()
        cur = conn.execute(
            "SELECT id, short_id, user_id, parent_id FROM short_comments WHERE id = ?",
            (comment_id,),
        )
        row = cur.fetchone()
        return dict(zip([d[0] for d in cur.description], row)) if row else None

    def add_comment(self, short_id: int, user_id: int, text: str,
                    parent_id: Optional[int] = None) -> int:
        """Legt einen Kommentar (oder Reply) an, gibt die neue ID zurück."""
        conn = self._require()
        cur = conn.execute(
            "INSERT INTO short_comments (short_id, user_id, text, parent_id, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (short_id, user_id, text, parent_id, int(time.time())),
        )
        conn.commit()
        return cur.lastrowid

    def toggle_comment_like(self, comment_id: int, user_id: int) -> bool:
        """Kommentar-Like umschalten. Gibt True zurück, wenn jetzt gelikt ist."""
        conn = self._require()
        row = conn.execute(
            "SELECT 1 FROM short_comment_likes WHERE comment_id = ? AND user_id = ?",
            (comment_id, user_id),
        ).fetchone()
        if row:
            conn.execute(
                "DELETE FROM short_comment_likes WHERE comment_id = ? AND user_id = ?",
                (comment_id, user_id),
            )
            conn.commit()
            return False
        conn.execute(
            "INSERT INTO short_comment_likes (comment_id, user_id, created_at)"
            " VALUES (?, ?, ?)",
            (comment_id, user_id, int(time.time())),
        )
        conn.commit()
        return True

    def comment_like_count(self, comment_id: int) -> int:
        conn = self._require()
        row = conn.execute(
            "SELECT COUNT(*) FROM short_comment_likes WHERE comment_id = ?",
            (comment_id,),
        ).fetchone()
        return row[0] if row else 0

    def delete_short_extras(self, short_id: int) -> None:
        """Löscht Likes + Kommentare (+ deren Likes) zu einem Short."""
        conn = self._require()
        conn.execute("DELETE FROM short_likes WHERE short_id = ?", (short_id,))
        conn.execute(
            "DELETE FROM short_comment_likes WHERE comment_id IN"
            " (SELECT id FROM short_comments WHERE short_id = ?)",
            (short_id,),
        )
        conn.execute("DELETE FROM short_comments WHERE short_id = ?", (short_id,))
        conn.commit()

    # ---------- Folgen (Liste + Konto-Cleanup) ----------

    def list_followed(self, follower_id: int) -> list:
        """Gefolgte User mit Kennzahlen (Shorts + Follower)."""
        conn = self._require()
        cur = conn.execute(
            "SELECT u.id, u.username, u.name, u.avatar,"
            " (SELECT COUNT(*) FROM shorts s"
            "   WHERE s.user_id = u.id AND s.visibility = 'Öffentlich') AS shorts_n,"
            " (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) AS followers_n"
            " FROM follows fo JOIN users u ON u.id = fo.followed_id"
            " WHERE fo.follower_id = ? ORDER BY u.username ASC",
            (follower_id,),
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def delete_user_extras(self, user_id: int) -> None:
        """Räumt Follows/Likes/Kommentare eines gelöschten Kontos weg."""
        conn = self._require()
        conn.execute("DELETE FROM follows WHERE follower_id = ? OR followed_id = ?", (user_id, user_id))
        conn.execute("DELETE FROM short_likes WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM short_comment_likes WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM short_comments WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM community_follows WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM community_visits WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM post_comment_likes WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM post_comments WHERE user_id = ?", (user_id,))
        conn.commit()

    # ---------- Communities ----------

    @staticmethod
    def _row_dict(cur, row) -> Optional[dict]:
        return dict(zip([d[0] for d in cur.description], row)) if row else None

    def create_community(
        self,
        slug: str,
        name: str,
        description: str,
        creator_id: int,
        image: Optional[str] = None,
        rules_json: str = "[]",
    ) -> dict:
        """Legt eine Community an (slug eindeutig). Gibt die Zeile zurück."""
        conn = self._require()
        now = int(time.time())
        cur = conn.execute(
            "INSERT INTO communities (slug, name, description, image, rules, creator_id, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (slug, name, description, image, rules_json, creator_id, now),
        )
        conn.commit()
        return self.get_community_by_id(cur.lastrowid)

    def set_community_image(self, community_id: int, filename: str) -> None:
        conn = self._require()
        conn.execute(
            "UPDATE communities SET image = ? WHERE id = ?",
            (filename, community_id),
        )
        conn.commit()

    def update_community(
        self, community_id: int, description: str, rules_json: str
    ) -> None:
        """Aktualisiert Beschreibung + Regeln (JSON) einer Community."""
        conn = self._require()
        conn.execute(
            "UPDATE communities SET description = ?, rules = ? WHERE id = ?",
            (description, rules_json, community_id),
        )
        conn.commit()

    def get_community_by_id(self, community_id: int) -> Optional[dict]:
        conn = self._require()
        cur = conn.execute(
            "SELECT * FROM communities WHERE id = ?", (community_id,)
        )
        return self._row_dict(cur, cur.fetchone())

    def get_community(self, slug: str) -> Optional[dict]:
        conn = self._require()
        cur = conn.execute(
            "SELECT * FROM communities WHERE slug = ?", (slug,)
        )
        return self._row_dict(cur, cur.fetchone())

    def community_with_stats(self, community_id: int, viewer_id: Optional[int] = None) -> Optional[dict]:
        """Community-Zeile plus Mitgliederzahl + followed-Flag für den Viewer."""
        conn = self._require()
        cur = conn.execute(
            "SELECT c.*, (SELECT COUNT(*) FROM community_follows f"
            " WHERE f.community_id = c.id) AS members_n,"
            " (SELECT COUNT(*) FROM community_follows f2"
            " WHERE f2.community_id = c.id AND f2.user_id = ?) AS followed,"
            " (SELECT u.username FROM users u WHERE u.id = c.creator_id) AS creator"
            " FROM communities c WHERE c.id = ?",
            (viewer_id if viewer_id is not None else -1, community_id),
        )
        return self._row_dict(cur, cur.fetchone())

    def list_communities(self, viewer_id: Optional[int] = None) -> list:
        """Alle Communities (neueste zuerst) mit Kennzahlen + followed-Flag."""
        conn = self._require()
        vid = viewer_id if viewer_id is not None else -1
        cur = conn.execute(
            "SELECT c.*, (SELECT COUNT(*) FROM community_follows f"
            " WHERE f.community_id = c.id) AS members_n,"
            " EXISTS(SELECT 1 FROM community_follows f2"
            " WHERE f2.community_id = c.id AND f2.user_id = ?) AS followed,"
            " (SELECT u.username FROM users u WHERE u.id = c.creator_id) AS creator"
            " FROM communities c ORDER BY c.id DESC",
            (vid,),
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def toggle_community_follow(self, user_id: int, community_id: int) -> bool:
        """Community-Follow umschalten. True = folgt jetzt."""
        conn = self._require()
        exists = conn.execute(
            "SELECT 1 FROM community_follows WHERE user_id = ? AND community_id = ?",
            (user_id, community_id),
        ).fetchone()
        if exists:
            conn.execute(
                "DELETE FROM community_follows WHERE user_id = ? AND community_id = ?",
                (user_id, community_id),
            )
            conn.commit()
            return False
        conn.execute(
            "INSERT INTO community_follows (user_id, community_id, created_at)"
            " VALUES (?, ?, ?)",
            (user_id, community_id, int(time.time())),
        )
        conn.commit()
        return True

    def community_follower_count(self, community_id: int) -> int:
        conn = self._require()
        row = conn.execute(
            "SELECT COUNT(*) FROM community_follows WHERE community_id = ?",
            (community_id,),
        ).fetchone()
        return row[0] if row else 0

    def list_followed_communities(self, user_id: int) -> list:
        """Gefolgte Communities mit Mitgliederzahl (für /followed)."""
        conn = self._require()
        cur = conn.execute(
            "SELECT c.*, (SELECT COUNT(*) FROM community_follows f"
            " WHERE f.community_id = c.id) AS members_n,"
            " (SELECT u.username FROM users u WHERE u.id = c.creator_id) AS creator"
            " FROM community_follows fo JOIN communities c ON c.id = fo.community_id"
            " WHERE fo.user_id = ? ORDER BY c.slug ASC",
            (user_id,),
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def record_community_visit(self, user_id: int, community_id: int) -> None:
        """Merkt sich den letzten Besuch (Upsert für die Sidebar-Historie)."""
        conn = self._require()
        conn.execute(
            "INSERT INTO community_visits (user_id, community_id, visited_at)"
            " VALUES (?, ?, ?)"
            " ON CONFLICT(user_id, community_id) DO UPDATE SET visited_at = excluded.visited_at",
            (user_id, community_id, int(time.time() * 1000)),
        )
        conn.commit()

    def list_recent_communities(self, user_id: int, limit: int = 5) -> list:
        """Zuletzt geöffnete Communities (neueste zuerst, max. `limit`)."""
        conn = self._require()
        vid = user_id
        cur = conn.execute(
            "SELECT c.*, (SELECT COUNT(*) FROM community_follows f"
            " WHERE f.community_id = c.id) AS members_n,"
            " EXISTS(SELECT 1 FROM community_follows f2"
            " WHERE f2.community_id = c.id AND f2.user_id = ?) AS followed,"
            " (SELECT u.username FROM users u WHERE u.id = c.creator_id) AS creator"
            " FROM community_visits v JOIN communities c ON c.id = v.community_id"
            " WHERE v.user_id = ? ORDER BY v.visited_at DESC LIMIT ?",
            (vid, user_id, limit),
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    # ---------- Posts in Communities ----------

    def create_post(
        self,
        community_id: int,
        user_id: int,
        title: str,
        text: str,
        tags_json: str,
        images_json: str = "[]",
    ) -> dict:
        """Legt einen Post an. Gibt die Zeile zurück."""
        conn = self._require()
        cur = conn.execute(
            "INSERT INTO posts (community_id, user_id, title, text, tags, images, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (community_id, user_id, title, text, tags_json, images_json, int(time.time())),
        )
        conn.commit()
        return self.get_post(cur.lastrowid)

    def get_post(self, post_id: int) -> Optional[dict]:
        conn = self._require()
        cur = conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,))
        return self._row_dict(cur, cur.fetchone())

    def set_post_images(self, post_id: int, images_json: str) -> None:
        conn = self._require()
        conn.execute(
            "UPDATE posts SET images = ? WHERE id = ?", (images_json, post_id)
        )
        conn.commit()

    def list_community_posts(self, community_id: int, viewer_id: Optional[int] = None) -> list:
        """Posts einer Community (neueste zuerst) mit Autor + Admin-Flag."""
        conn = self._require()
        cur = conn.execute(
            "SELECT p.*, u.username, u.name AS author_name, u.avatar AS author_avatar,"
            " (SELECT c.creator_id FROM communities c WHERE c.id = p.community_id) AS creator_id,"
            " (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS comments_n"
            " FROM posts p JOIN users u ON u.id = p.user_id"
            " WHERE p.community_id = ? ORDER BY p.id DESC",
            (community_id,),
        )
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, row)) for row in cur.fetchall()]
        for r in rows:
            r["can_delete"] = (
                viewer_id is not None and r.get("creator_id") == viewer_id
            )
        return rows

    def delete_post(self, post_id: int) -> Optional[dict]:
        """Löscht einen Post. Gibt die gelöschte Zeile (für Datei-Cleanup) zurück."""
        conn = self._require()
        row = self.get_post(post_id)
        if row is None:
            return None
        conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        self.delete_post_extras(post_id)
        conn.commit()
        return row

    def delete_post_extras(self, post_id: int) -> None:
        """Löscht Kommentare (+ deren Likes) zu einem Post."""
        conn = self._require()
        conn.execute(
            "DELETE FROM post_comment_likes WHERE comment_id IN"
            " (SELECT id FROM post_comments WHERE post_id = ?)",
            (post_id,),
        )
        conn.execute("DELETE FROM post_comments WHERE post_id = ?", (post_id,))
        conn.commit()

    def delete_community(self, community_id: int) -> dict:
        """Löscht Community + Posts + Follows + Visits.

        Gibt Dateinamen zum Aufräumen zurück: {image, post_images}.
        """
        conn = self._require()
        comm = self.get_community_by_id(community_id)
        if comm is None:
            return {"image": None, "post_images": []}
        cur = conn.execute(
            "SELECT images FROM posts WHERE community_id = ?", (community_id,)
        )
        post_images = []
        for (images_json,) in cur.fetchall():
            try:
                import json as _json

                imgs = _json.loads(images_json or "[]")
                if isinstance(imgs, list):
                    post_images.extend(imgs)
            except ValueError:
                pass
        conn.execute(
            "DELETE FROM post_comment_likes WHERE comment_id IN"
            " (SELECT id FROM post_comments WHERE post_id IN"
            "  (SELECT id FROM posts WHERE community_id = ?))",
            (community_id,),
        )
        conn.execute(
            "DELETE FROM post_comments WHERE post_id IN"
            " (SELECT id FROM posts WHERE community_id = ?)",
            (community_id,),
        )
        conn.execute("DELETE FROM posts WHERE community_id = ?", (community_id,))
        conn.execute(
            "DELETE FROM community_follows WHERE community_id = ?", (community_id,)
        )
        conn.execute(
            "DELETE FROM community_visits WHERE community_id = ?", (community_id,)
        )
        conn.execute("DELETE FROM communities WHERE id = ?", (community_id,))
        conn.commit()
        return {"image": comm.get("image"), "post_images": post_images}

    def list_user_posts(self, user_id: int) -> list:
        """Eigene Posts (neueste zuerst) mit Community + Autor (fürs Studio)."""
        conn = self._require()
        cur = conn.execute(
            "SELECT p.*, u.username, u.name AS author_name, u.avatar AS author_avatar,"
            " c.slug AS community_slug, c.name AS community_name,"
            " (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS comments_n"
            " FROM posts p JOIN users u ON u.id = p.user_id"
            " JOIN communities c ON c.id = p.community_id"
            " WHERE p.user_id = ? ORDER BY p.id DESC",
            (user_id,),
        )
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, row)) for row in cur.fetchall()]
        for r in rows:
            r["can_delete"] = True
        return rows

    def update_post(self, post_id: int, title: str, text: str, tags_json: str) -> None:
        """Aktualisiert Titel/Text/Tags eines Posts (Bilder bleiben)."""
        conn = self._require()
        conn.execute(
            "UPDATE posts SET title = ?, text = ?, tags = ? WHERE id = ?",
            (title, text, tags_json, post_id),
        )
        conn.commit()

    # ---------- Post-Kommentare (mit 1-stufigen Replies + Likes) ----------

    def list_post_comments(self, post_id: int, viewer_id: Optional[int] = None) -> list:
        """Kommentare zu einem Post, älteste zuerst, Replies (1 Stufe) eingenistet."""
        conn = self._require()
        vid = viewer_id or -1
        cur = conn.execute(
            "SELECT c.id, c.text, c.parent_id, c.created_at, u.username,"
            " u.name AS author_name, u.avatar AS author_avatar,"
            " (SELECT COUNT(*) FROM post_comment_likes l WHERE l.comment_id = c.id) AS likes,"
            " EXISTS(SELECT 1 FROM post_comment_likes l2"
            "  WHERE l2.comment_id = c.id AND l2.user_id = ?) AS liked"
            " FROM post_comments c JOIN users u ON u.id = c.user_id"
            " WHERE c.post_id = ? ORDER BY c.id ASC",
            (vid, post_id),
        )
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, row)) for row in cur.fetchall()]
        by_id = {r["id"]: {**r, "replies": []} for r in rows}
        top = []
        for r in rows:
            node = by_id[r["id"]]
            pid = r.get("parent_id")
            if pid and pid in by_id:
                by_id[pid]["replies"].append(node)
            elif not pid:
                top.append(node)
        return top

    def get_post_comment(self, comment_id: int) -> Optional[dict]:
        conn = self._require()
        cur = conn.execute(
            "SELECT id, post_id, user_id, parent_id FROM post_comments WHERE id = ?",
            (comment_id,),
        )
        row = cur.fetchone()
        return dict(zip([d[0] for d in cur.description], row)) if row else None

    def add_post_comment(self, post_id: int, user_id: int, text: str,
                         parent_id: Optional[int] = None) -> int:
        """Legt einen Kommentar (oder Reply) an, gibt die neue ID zurück."""
        conn = self._require()
        cur = conn.execute(
            "INSERT INTO post_comments (post_id, user_id, text, parent_id, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (post_id, user_id, text, parent_id, int(time.time())),
        )
        conn.commit()
        return cur.lastrowid

    def toggle_post_comment_like(self, comment_id: int, user_id: int) -> bool:
        """Post-Kommentar-Like umschalten. True = likt jetzt."""
        conn = self._require()
        row = conn.execute(
            "SELECT 1 FROM post_comment_likes WHERE comment_id = ? AND user_id = ?",
            (comment_id, user_id),
        ).fetchone()
        if row:
            conn.execute(
                "DELETE FROM post_comment_likes WHERE comment_id = ? AND user_id = ?",
                (comment_id, user_id),
            )
            conn.commit()
            return False
        conn.execute(
            "INSERT INTO post_comment_likes (comment_id, user_id, created_at)"
            " VALUES (?, ?, ?)",
            (comment_id, user_id, int(time.time())),
        )
        conn.commit()
        return True

    def post_comment_like_count(self, comment_id: int) -> int:
        conn = self._require()
        row = conn.execute(
            "SELECT COUNT(*) FROM post_comment_likes WHERE comment_id = ?",
            (comment_id,),
        ).fetchone()
        return row[0] if row else 0


if __name__ == "__main__":
    s = Storage()
    s.start()
    log.info("Users in DB: %d", s.count_users())
    s.stop()
