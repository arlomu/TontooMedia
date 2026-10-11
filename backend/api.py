"""JSON-API für TontooMedia (Frontend auf Port 3000 -> API auf Port 3001).

Endpunkte (alle unter /api/...):
  POST   /api/register      {name, username, password} -> {user, token}
  POST   /api/login         {username, password} -> {user, token}
  DELETE /api/session       (Bearer-Token) -> {ok: true}
  GET    /api/me            (Bearer-Token) -> {user}
  PATCH  /api/me            {name?, username?, bio?} -> {user}
  POST   /api/me/avatar     {data: "data:image/...;base64,..."} -> {user}
  DELETE /api/me/avatar     -> {user} (zurück zum Standard)
  POST   /api/me/password   {current, new} -> {ok: true}
  DELETE /api/me            {username} (Bestätigung) -> {ok: true}
  GET    /api/avatar/<datei>  Avatar-Bild (Fallback: Standard-Avatar)
  GET    /api/shorts        (Bearer) -> {shorts: [...]} (eigene Shorts)
  POST   /api/shorts/upload (Bearer, multipart) -> {short}
  PATCH  /api/shorts/<id>   {title?, visibility?, removeThumb?} -> {short}
  POST   /api/shorts/<id>/thumb {data: dataURL} -> {short}
  DELETE /api/shorts/<id>   -> {ok: true}
   GET    /api/studio/overview?days=7|28|90 (Bearer) -> echte Kennzahlen + Tages-Buckets
   POST   /api/shorts/<id>/watch ({seconds}) -> echte Watch-Time buchen
   POST   /api/shorts/ai (Bearer, multipart title+tags+prompt+thumb?) -> {job} (KI-Video)
   GET    /api/shorts/ai (Bearer) -> {jobs: [...]} (eigene KI-Jobs)
   GET    /api/shorts/ai/<job> (Bearer) -> {job} (Status fürs Polling)
   GET    /api/feed/shorts   -> {shorts: [...]} (öffentlich, neueste zuerst)
   GET    /api/feed/start    -> {shorts: [...]} (Start-Shelf: Woche/3 Tage/Neu)
   GET    /api/feed/posts?sort=neu|top|diskutiert -> {posts: [...]} (7 Stück, mit Top-Kommentar)
   POST   /api/posts/<id>/like (Bearer) -> {liked, likes} (Toggle)
   GET    /api/users/<name>  -> {user, followers, followed, posts[], shorts[]} (404 wenn unbekannt)
   POST   /api/users/<name>/follow (Bearer) -> {followed, followers} (Toggle)
  POST   /api/shorts/<id>/like (Bearer) -> {liked, likes}
  GET    /api/shorts/<id>/comments -> {comments: [...]}
  POST   /api/shorts/<id>/comments (Bearer, {text, parent_id?}) -> {comment}
  POST   /api/comments/<id>/like (Bearer) -> {liked, likes}
  POST   /api/users/<name>/follow (Bearer) -> {followed, followers}
   GET    /api/followed (Bearer) -> {users: [...], communities: [...]}

   GET    /api/communities -> {communities: [...]} (öffentlich, neueste zuerst)
   POST   /api/communities (Bearer, multipart name+description+image) -> {community}
   GET    /api/communities/recent (Bearer) -> {communities: [...]} (letzte 5 Besuche)
   GET    /api/communities/<slug> -> {community} (404 wenn unbekannt)
   PATCH  /api/communities/<slug> (Bearer + Admin, multipart description+rules+image?) -> {community}
   DELETE /api/communities/<slug> (Bearer + Admin) -> {ok: true}
   GET    /api/communities/<slug>/posts -> {posts: [...]} (öffentlich, neueste zuerst)
   GET    /api/communities/<slug>/posts/<id> -> {post, community} (404 wenn unbekannt)
   GET    /api/posts/<id>/comments -> {comments: [...]} (öffentlich, älteste zuerst)
   POST   /api/posts/<id>/comments (Bearer, {text, parent_id?}) -> {comment}
   POST   /api/post-comments/<id>/like (Bearer) -> {liked, likes} (Toggle)
   POST   /api/communities/<slug>/posts (Bearer, multipart title+text+tags+image0+image1) -> {post}
   DELETE /api/communities/<slug>/posts/<id> (Bearer + Admin/Autor) -> {ok: true}
   GET    /api/me/posts (Bearer) -> {posts: [...]} (eigene Posts, fürs Studio)
   PATCH  /api/posts/<id> (Bearer + Autor, {title, text, tags}) -> {post}
   DELETE /api/posts/<id> (Bearer + Autor/Admin) -> {ok: true}
   POST   /api/communities/<slug>/follow (Bearer) -> {followed, followers} (Toggle)
   POST   /api/communities/<slug>/visit (Bearer) -> {ok: true} (Besuch merken)
  POST   /api/shorts/<id>/view -> {views}
  GET    /api/media/<datei>   Video/Thumbnail (mit Range-Support)

Auth per `Authorization: Bearer <token>`. Alles Demo, kein HTTPS.
"""
import json
import re
import sys
import threading
from base64 import b64decode
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional

try:
    from .functions.community import (
        create_community,
        rules_of,
        toggle_community_follow,
        update_community,
        visit_community,
    )
    from .functions.posts import (
        create_post,
        delete_community,
        delete_post,
        post_post_comment,
        toggle_post_comment_like,
        toggle_post_like,
        update_post,
    )
    from .functions.ai_video import (
        get_job as ai_get_job,
        list_user_jobs as ai_list_jobs,
        public_job as ai_public_job,
        start_job as ai_start_job,
        validate_job as ai_validate_job,
    )
    from .functions.shorts import (
        THUMB_DIR,
        VIDEO_DIR,
        add_view,
        add_watch,
        create_short,
        delete_short,
        post_comment,
        toggle_comment_like,
        toggle_like,
        update_short,
    )
    from .functions.user import (
        change_password,
        clear_avatar,
        delete_account,
        login,
        register,
        save_avatar,
        update_profile,
    )
    from .logger import get_logger
    from .storage import Storage
except ImportError:  # direkter Start via `python backend/api.py`
    from functions.community import (
        create_community,
        rules_of,
        toggle_community_follow,
        update_community,
        visit_community,
    )
    from functions.posts import (
        create_post,
        delete_community,
        delete_post,
        post_post_comment,
        toggle_post_comment_like,
        toggle_post_like,
        update_post,
    )
    from functions.ai_video import (
        get_job as ai_get_job,
        list_user_jobs as ai_list_jobs,
        public_job as ai_public_job,
        start_job as ai_start_job,
        validate_job as ai_validate_job,
    )
    from functions.shorts import (
        THUMB_DIR,
        VIDEO_DIR,
        add_view,
        add_watch,
        create_short,
        delete_short,
        post_comment,
        toggle_comment_like,
        toggle_like,
        update_short,
    )
    from functions.user import (
        change_password,
        clear_avatar,
        delete_account,
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
COMM_DIR = BASE_DIR / "db" / "media" / "communities"
POSTS_DIR = BASE_DIR / "db" / "media" / "posts"

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


def fmt_dur(seconds: float) -> str:
    """Sekunden -> 'm:ss' (z. B. 0:32)."""
    try:
        total = max(0, int(seconds))
    except (TypeError, ValueError):
        return "–"
    return f"{total // 60}:{total % 60:02d}"


def public_short(row: dict) -> dict:
    """Short-Datensatz fürs Frontend (Studio-Tabelle)."""
    import json as _json

    try:
        tags = _json.loads(row.get("tags") or "[]")
    except ValueError:
        tags = []
    created = row.get("created_at") or 0
    is_today = datetime.fromtimestamp(created).date() == datetime.now().date() if created else False
    return {
        "id": row["id"],
        "title": row["title"],
        "tags": tags,
        "visibility": row["visibility"],
        "commentsOff": bool(row.get("comments_off")),
        "dur": fmt_dur(row.get("duration") or 0),
        "seconds": round(float(row.get("duration") or 0), 1),
        "date": "heute" if is_today else (
            datetime.fromtimestamp(created).strftime("%d.%m.%Y") if created else "–"
        ),
        "views": row.get("views") or 0,
        "likes": 0,  # Interaktionen kommen später
        "comments": "–" if row.get("comments_off") else 0,
        "thumbUrl": f"/api/media/{row['thumb']}" if row.get("thumb") else None,
        "videoUrl": f"/api/media/{row['filename']}" if row.get("filename") else None,
    }


def date_label(created: int) -> str:
    """'heute HH:MM' oder 'TT.MM.JJJJ HH:MM'."""
    if not created:
        return "–"
    dt = datetime.fromtimestamp(created)
    day = "heute" if dt.date() == datetime.now().date() else dt.strftime("%d.%m.%Y")
    return f"{day} {dt.strftime('%H:%M')}"


def public_feed_short(row: dict) -> dict:
    """Öffentlicher Short für den /shorts-Viewer (mit Autor + Zählern)."""
    import json as _json

    try:
        tags = _json.loads(row.get("tags") or "[]")
    except ValueError:
        tags = []
    comments_off = bool(row.get("comments_off"))
    return {
        "id": row["id"],
        "title": row["title"],
        "tags": tags,
        "dur": fmt_dur(row.get("duration") or 0),
        "seconds": round(float(row.get("duration") or 0), 1),
        "views": row.get("views") or 0,
        "likes": row.get("likes") or 0,
        "liked": bool(row.get("liked")),
        "comments": "–" if comments_off else (row.get("comments_n") or 0),
        "commentsOff": comments_off,
        "date": date_label(row.get("created_at") or 0),
        "thumbUrl": f"/api/media/{row['thumb']}" if row.get("thumb") else None,
        "videoUrl": f"/api/media/{row['filename']}" if row.get("filename") else None,
        "author": {
            "username": row.get("username") or "?",
            "name": row.get("author_name") or row.get("username") or "?",
            "avatarUrl": avatar_url(row.get("author_avatar")),
            "following": bool(row.get("following")),
        },
    }


def public_community(row: dict) -> dict:
    """Community für Listen/Detail (mit Mitgliederzahl + followed-Flag)."""
    img = row.get("image")
    return {
        "slug": row["slug"],
        "name": row.get("name") or row["slug"],
        "desc": row.get("description") or "",
        "imageUrl": f"/api/media/{img}" if img else None,
        "members": row.get("members_n") or 0,
        "followed": bool(row.get("followed")),
        "creator": row.get("creator"),
        "rules": rules_of(row),
    }


def public_post(row: dict) -> dict:
    """Post für den Community-Feed (mit Autor + Admin-Delete-Flag)."""
    try:
        tags = json.loads(row.get("tags") or "[]")
    except ValueError:
        tags = []
    try:
        images = json.loads(row.get("images") or "[]")
    except ValueError:
        images = []
    return {
        "id": row["id"],
        "title": row.get("title") or "",
        "text": row.get("text") or "",
        "tags": tags if isinstance(tags, list) else [],
        "images": [
            f"/api/media/{n}" for n in (images if isinstance(images, list) else []) if n
        ],
        "author": {
            "username": row.get("username") or "?",
            "name": row.get("author_name") or row.get("username") or "?",
            "avatarUrl": avatar_url(row.get("author_avatar")),
        },
        "date": date_label(row.get("created_at") or 0),
        "canDelete": bool(row.get("can_delete")),
        "comments": row.get("comments_n") or 0,
        "likes": row.get("likes_n") or 0,
        "liked": bool(row.get("liked")),
        "topComment": row.get("top_comment"),
        "community": {
            "slug": row.get("community_slug") or "",
            "name": row.get("community_name") or "",
        },
    }


def public_followed_community(row: dict) -> dict:
    """Gefolgte Community für /followed (mit Mitgliederzahl)."""
    img = row.get("image")
    return {
        "slug": row["slug"],
        "name": row.get("name") or row["slug"],
        "desc": row.get("description") or "",
        "imageUrl": f"/api/media/{img}" if img else None,
        "members": row.get("members_n") or 0,
        "creator": row.get("creator"),
    }


def public_followed_user(row: dict) -> dict:
    """Gefolgter User für /followed (mit Kennzahlen)."""
    return {
        "username": row["username"],
        "name": row.get("name") or row["username"],
        "avatarUrl": avatar_url(row.get("avatar")),
        "shorts": row.get("shorts_n") or 0,
        "followers": row.get("followers_n") or 0,
    }


def public_comment(row: dict) -> dict:
    return {
        "id": row["id"],
        "text": row["text"],
        "parent_id": row.get("parent_id"),
        "likes": row.get("likes") or 0,
        "liked": bool(row.get("liked")),
        "date": date_label(row.get("created_at") or 0),
        "username": row.get("username") or "?",
        "name": row.get("author_name") or row.get("username") or "?",
        "avatarUrl": avatar_url(row.get("author_avatar")),
        "replies": [public_comment(r) for r in (row.get("replies") or [])],
    }


def parse_multipart(body: bytes, content_type: str) -> tuple:
    """Minimaler Multipart-Parser (ohne Deps).
    Gibt (fields: dict, files: {name: {filename, content_type, data}}) zurück."""
    fields, files = {}, {}
    m = re.search(r"boundary=([^;]+)", content_type or "")
    if not m or not body:
        return fields, files
    boundary = m.group(1).strip().strip('"').encode("latin-1")
    for chunk in body.split(b"--" + boundary):
        if b"\r\n\r\n" not in chunk:
            continue
        head, data = chunk.split(b"\r\n\r\n", 1)
        if data.endswith(b"\r\n"):
            data = data[:-2]
        if data.endswith(b"--"):
            data = data[:-2]
        disp, ctype = "", "application/octet-stream"
        for line in head.decode("latin-1").split("\r\n"):
            low = line.lower()
            if low.startswith("content-disposition:"):
                disp = line
            elif low.startswith("content-type:"):
                ctype = line.split(":", 1)[1].strip()
        nm = re.search(r'name="([^"]+)"', disp)
        if not nm:
            continue
        fn = re.search(r'filename="([^"]+)"', disp)
        if fn and fn.group(1):
            files[nm.group(1)] = {
                "filename": Path(fn.group(1)).name,
                "content_type": ctype,
                "data": data,
            }
        else:
            fields[nm.group(1)] = data.decode("utf-8", "replace")
    return fields, files


class _Handler(BaseHTTPRequestHandler):
    server_version = "TontooAPI/0.1"

    # ---------- Helfer ----------

    def _write(self, data: bytes) -> bool:
        """Body schreiben. False, wenn der Client schon weg ist (kein Fehler).

        Passiert ständig (StrictMode-Doppelcalls, Weiternavigieren, Polling) –
        soll keinen Traceback produzieren.
        """
        try:
            self.wfile.write(data)
            return True
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            return False

    def _send(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.end_headers()
        self._write(body)

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

    def _read_bytes(self, max_bytes: int) -> Optional[bytes]:
        """Liest den Body roh (für Multipart-Uploads). None bei zu groß/Fehler."""
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return None
        if length <= 0 or length > max_bytes:
            return None
        try:
            data = self.rfile.read(length)
        except Exception:
            return None
        return data if len(data) == length else None

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
        if self.path == "/api/me/posts":
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            with DB_LOCK:
                rows = _storage.list_user_posts(user_id)
            return self._ok({"posts": [public_post(r) for r in rows]})
        if self.path == "/api/shorts":
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            with DB_LOCK:
                rows = _storage.list_shorts(user_id)
            return self._ok({"shorts": [public_short(r) for r in rows]})
        if self.path == "/api/shorts/ai":
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            with DB_LOCK:
                jobs = ai_list_jobs(user_id)
            return self._ok({"jobs": jobs})
        m = re.fullmatch(r"/api/shorts/ai/([A-Za-z0-9_-]{1,32})", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            job = ai_get_job(m.group(1))
            if job is None or job["user_id"] != user_id:
                return self._fail(404, "Job nicht gefunden.")
            return self._ok({"job": ai_public_job(job)})
        if self.path == "/api/studio/overview" or self.path.startswith("/api/studio/overview?"):
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            qs = self.path.split("?", 1)[1] if "?" in self.path else ""
            days = 28
            for part in qs.split("&"):
                if part.startswith("days="):
                    try:
                        days = int(part.split("=", 1)[1])
                    except ValueError:
                        days = 28
            if days not in (7, 28, 90):
                return self._fail(400, "Unbekannter Zeitraum.")
            with DB_LOCK:
                overview = _storage.studio_overview(user_id, days)
            return self._ok({"overview": overview})
        if self.path == "/api/feed/shorts":
            _, viewer_id = self._auth_user()  # optional: ohne Token einfach kein liked
            with DB_LOCK:
                rows = _storage.list_feed_shorts(viewer_id)
            return self._ok({"shorts": [public_feed_short(r) for r in rows]})
        if self.path == "/api/feed/start":
            _, viewer_id = self._auth_user()  # optional: ohne Token einfach kein liked
            with DB_LOCK:
                rows = _storage.list_start_shorts(viewer_id)
            return self._ok({"shorts": [public_feed_short(r) for r in rows]})
        if self.path == "/api/feed/posts" or self.path.startswith("/api/feed/posts?"):
            _, viewer_id = self._auth_user()  # optional: ohne Token einfach kein liked
            qs = self.path.split("?", 1)[1] if "?" in self.path else ""
            sort = "neu"
            for part in qs.split("&"):
                if part.startswith("sort="):
                    sort = part.split("=", 1)[1]
            if sort not in ("neu", "top", "diskutiert"):
                return self._fail(400, "Unbekannte Sortierung.")
            with DB_LOCK:
                rows = _storage.list_feed_posts(sort, viewer_id)
            return self._ok({"posts": [public_post(r) for r in rows]})
        if self.path == "/api/followed":
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            with DB_LOCK:
                rows = _storage.list_followed(user_id)
                comms = _storage.list_followed_communities(user_id)
            return self._ok({
                "users": [public_followed_user(r) for r in rows],
                "communities": [public_followed_community(c) for c in comms],
            })
        if self.path == "/api/communities":
            _, viewer_id = self._auth_user()  # optional: ohne Login einfach kein followed
            with DB_LOCK:
                rows = _storage.list_communities(viewer_id)
            return self._ok({"communities": [public_community(r) for r in rows]})
        if self.path == "/api/communities/recent":
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            with DB_LOCK:
                rows = _storage.list_recent_communities(user_id)
            return self._ok({"communities": [public_community(r) for r in rows]})
        m = re.fullmatch(r"/api/communities/([a-z0-9._]{3,21})/posts/(\d+)", self.path)
        if m:
            _, viewer_id = self._auth_user()  # optional: ohne Login kein canDelete
            with DB_LOCK:
                comm = _storage.get_community(m.group(1))
                if comm is None:
                    return self._fail(404, "Community nicht gefunden.")
                rows = _storage.list_community_posts(comm["id"], viewer_id)
                match = next((r for r in rows if r["id"] == int(m.group(2))), None)
                if match is None:
                    return self._fail(404, "Post nicht gefunden.")
                full = _storage.community_with_stats(comm["id"], viewer_id)
            return self._ok({
                "post": public_post(match),
                "community": public_community(full),
            })
        m = re.fullmatch(r"/api/communities/([a-z0-9._]{3,21})/posts", self.path)
        if m:
            _, viewer_id = self._auth_user()  # optional: ohne Login kein canDelete
            with DB_LOCK:
                comm = _storage.get_community(m.group(1))
                if comm is None:
                    return self._fail(404, "Community nicht gefunden.")
                rows = _storage.list_community_posts(comm["id"], viewer_id)
            return self._ok({"posts": [public_post(r) for r in rows]})
        m = re.fullmatch(r"/api/communities/([a-z0-9._]{3,21})", self.path)
        if m:
            _, viewer_id = self._auth_user()  # optional: ohne Login einfach kein followed
            with DB_LOCK:
                comm = _storage.get_community(m.group(1))
                if comm is None:
                    return self._fail(404, "Community nicht gefunden.")
                full = _storage.community_with_stats(comm["id"], viewer_id)
            return self._ok({"community": public_community(full)})
        m = re.fullmatch(r"/api/users/([A-Za-z0-9._]{1,30})", self.path)
        if m:
            _, viewer_id = self._auth_user()  # optional: ohne Login einfach kein followed
            with DB_LOCK:
                target = _storage.find_user(m.group(1))
                if target is None:
                    return self._fail(404, "User nicht gefunden.")
                target_id = target["id"]
                followers = _storage.follower_count(target_id)
                followed = (
                    _storage.is_following(viewer_id, target_id)
                    if viewer_id
                    else False
                )
                rows = _storage.list_user_shorts(
                    target_id, viewer_id, include_private=(viewer_id == target_id)
                )
                post_rows = _storage.list_user_posts(target_id)
                for r in post_rows:
                    r["can_delete"] = viewer_id == target_id
            return self._ok({
                "user": public_user(target),
                "followers": followers,
                "followed": followed,
                "posts": [public_post(r) for r in post_rows],
                "shorts": [public_feed_short(r) for r in rows],
            })
        m = re.fullmatch(r"/api/posts/(\d+)/comments", self.path)
        if m:
            _, viewer_id = self._auth_user()  # optional: ohne Token einfach kein liked
            with DB_LOCK:
                post = _storage.get_post(int(m.group(1)))
                if post is None:
                    return self._fail(404, "Post nicht gefunden.")
                rows = _storage.list_post_comments(int(m.group(1)), viewer_id)
            return self._ok({"comments": [public_comment(c) for c in rows]})
        m = re.fullmatch(r"/api/shorts/(\d+)/comments", self.path)
        if m:
            _, viewer_id = self._auth_user()  # optional: ohne Token einfach kein liked
            with DB_LOCK:
                short = _storage.get_short(int(m.group(1)))
                if short is None or short["visibility"] != "Öffentlich":
                    return self._fail(404, "Short nicht gefunden.")
                rows = _storage.list_comments(int(m.group(1)), viewer_id)
            return self._ok({"comments": [public_comment(c) for c in rows]})
        if self.path.startswith("/api/avatar/"):
            return self._serve_avatar(self.path[len("/api/avatar/"):])
        if self.path.startswith("/api/media/"):
            return self._serve_media(self.path[len("/api/media/"):])
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
        if self.path == "/api/me/password":
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            body = self._read_json()
            try:
                with DB_LOCK:
                    change_password(_storage, user_id, body.get("current", ""), body.get("new", ""))
            except ValueError as e:
                return self._fail(400, str(e))
            return self._ok({"ok": True})
        if self.path == "/api/shorts/upload":
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            raw = self._read_bytes(350 * 1024 * 1024)
            if raw is None:
                return self._fail(413, "Upload ist leer oder größer als 350 MB.")
            fields, files = parse_multipart(raw, self.headers.get("Content-Type"))
            video = files.get("video")
            if not video or not video["data"]:
                return self._fail(400, "Kein Video dabei.")
            import json as _json

            try:
                tags = _json.loads(fields.get("tags") or "[]")
            except ValueError:
                tags = []
            thumb_file = files.get("thumb")
            try:
                with DB_LOCK:
                    short = create_short(
                        _storage, user_id, video["data"], video["filename"],
                        fields.get("title", ""), tags,
                        fields.get("visibility", "Öffentlich"),
                        fields.get("commentsOff", "") in ("1", "true", "True"),
                        thumb_file["data"] if thumb_file else None,
                    )
            except ValueError as e:
                return self._fail(400, str(e))
            with DB_LOCK:
                fresh = _storage.get_short(short["id"])
            return self._send(201, {"short": public_short(fresh)})
        if self.path == "/api/shorts/ai":
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            raw = self._read_bytes(8 * 1024 * 1024)
            if raw is None:
                return self._fail(413, "Upload ist leer oder größer als 8 MB.")
            fields, files = parse_multipart(raw, self.headers.get("Content-Type"))
            import json as _json2

            try:
                tags = _json2.loads(fields.get("tags") or "[]")
            except ValueError:
                tags = []
            thumb_file = files.get("thumb")
            thumb = thumb_file["data"] if thumb_file and thumb_file["data"] else None
            try:
                clean = ai_validate_job(
                    fields.get("title", ""), tags if isinstance(tags, list) else [],
                    fields.get("prompt", ""), thumb,
                )
            except ValueError as e:
                return self._fail(400, str(e))
            try:
                with DB_LOCK:
                    job = ai_start_job(_storage, user_id, *clean, thumb)
            except ValueError as e:
                return self._fail(400, str(e))
            return self._send(201, {"job": job})
        m = re.fullmatch(r"/api/shorts/(\d+)/thumb", self.path)
        if m:
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
                    fresh = update_short(_storage, user_id, int(m.group(1)), thumb_bytes=raw)
            except ValueError as e:
                return self._fail(400 if "gefunden" not in str(e) else 404, str(e))
            return self._ok({"short": public_short(fresh)})
        m = re.fullmatch(r"/api/users/([A-Za-z0-9._]{1,30})/follow", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            with DB_LOCK:
                target = _storage.find_user(m.group(1))
                if target is None:
                    return self._fail(404, "User nicht gefunden.")
                try:
                    followed = _storage.toggle_follow(user_id, target["id"])
                except ValueError as e:
                    return self._fail(400, str(e))
                followers = _storage.follower_count(target["id"])
            return self._ok({"followed": followed, "followers": followers})
        m = re.fullmatch(r"/api/communities/([a-z0-9._]{3,21})/follow", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            try:
                with DB_LOCK:
                    result = toggle_community_follow(_storage, user_id, m.group(1))
            except ValueError as e:
                msg = str(e)
                return self._fail(404 if "gefunden" in msg else 400, msg)
            return self._ok(result)
        m = re.fullmatch(r"/api/communities/([a-z0-9._]{3,21})/visit", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            try:
                with DB_LOCK:
                    visit_community(_storage, user_id, m.group(1))
            except ValueError as e:
                return self._fail(404, str(e))
            return self._ok({"ok": True})
        if self.path == "/api/communities":
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            raw = self._read_bytes(5 * 1024 * 1024)
            if raw is None:
                return self._fail(413, "Upload ist leer oder größer als 5 MB.")
            fields, files = parse_multipart(raw, self.headers.get("Content-Type"))
            image = files.get("image")
            try:
                with DB_LOCK:
                    comm = create_community(
                        _storage, user_id,
                        fields.get("name", ""), fields.get("description", ""),
                        image["data"] if image and image["data"] else None,
                    )
            except ValueError as e:
                msg = str(e)
                return self._fail(409 if "gibt es schon" in msg else 400, msg)
            with DB_LOCK:
                full = _storage.community_with_stats(comm["id"], user_id)
            return self._send(201, {"community": public_community(full)})
        m = re.fullmatch(r"/api/communities/([a-z0-9._]{3,21})/posts", self.path)
        if m:
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            raw = self._read_bytes(8 * 1024 * 1024)
            if raw is None:
                return self._fail(413, "Upload ist leer oder größer als 8 MB.")
            fields, files = parse_multipart(raw, self.headers.get("Content-Type"))
            import json as _json

            try:
                tags = _json.loads(fields.get("tags") or "[]")
            except ValueError:
                tags = []
            images = []
            for key in ("image0", "image1"):
                f = files.get(key)
                if f and f["data"]:
                    images.append(f["data"])
            try:
                with DB_LOCK:
                    row = create_post(
                        _storage, user_id, m.group(1),
                        fields.get("title", ""), fields.get("text", ""),
                        tags if isinstance(tags, list) else [], images,
                    )
                    full = _storage.list_community_posts(row["community_id"], user_id)
                    created = next((r for r in full if r["id"] == row["id"]), row)
            except ValueError as e:
                msg = str(e)
                return self._fail(404 if "gefunden" in msg else 400, msg)
            return self._send(201, {"post": public_post(created)})
        m = re.fullmatch(r"/api/shorts/(\d+)/like", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            try:
                with DB_LOCK:
                    result = toggle_like(_storage, user_id, int(m.group(1)))
            except ValueError as e:
                return self._fail(404, str(e))
            return self._ok(result)
        m = re.fullmatch(r"/api/posts/(\d+)/like", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            try:
                with DB_LOCK:
                    result = toggle_post_like(_storage, user_id, int(m.group(1)))
            except ValueError as e:
                return self._fail(404, str(e))
            return self._ok(result)
        m = re.fullmatch(r"/api/posts/(\d+)/comments", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            body = self._read_json()
            try:
                with DB_LOCK:
                    comment = post_post_comment(
                        _storage, user_id, int(m.group(1)),
                        body.get("text", ""), body.get("parent_id"),
                    )
            except ValueError as e:
                msg = str(e)
                return self._fail(404 if "gefunden" in msg else 400, msg)
            return self._send(201, {"comment": public_comment(comment)})
        m = re.fullmatch(r"/api/post-comments/(\d+)/like", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            try:
                with DB_LOCK:
                    result = toggle_post_comment_like(_storage, user_id, int(m.group(1)))
            except ValueError as e:
                return self._fail(404, str(e))
            return self._ok(result)
        m = re.fullmatch(r"/api/shorts/(\d+)/comments", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            body = self._read_json()
            try:
                with DB_LOCK:
                    comment = post_comment(
                        _storage, user_id, int(m.group(1)),
                        body.get("text", ""), body.get("parent_id"),
                    )
            except ValueError as e:
                msg = str(e)
                return self._fail(404 if "gefunden" in msg else 400, msg)
            comment["avatarUrl"] = avatar_url(comment.pop("author_avatar"))
            comment["date"] = date_label(comment.pop("created_at"))
            return self._send(201, {"comment": comment})
        m = re.fullmatch(r"/api/comments/(\d+)/like", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            try:
                with DB_LOCK:
                    result = toggle_comment_like(_storage, user_id, int(m.group(1)))
            except ValueError as e:
                return self._fail(404, str(e))
            return self._ok(result)
        m = re.fullmatch(r"/api/shorts/(\d+)/watch", self.path)
        if m:
            body = self._read_json()
            try:
                secs = float(body.get("seconds") or 0)
            except (TypeError, ValueError):
                return self._fail(400, "Ungültige Sekunden.")
            try:
                with DB_LOCK:
                    add_watch(_storage, int(m.group(1)), secs)
            except ValueError as e:
                return self._fail(404, str(e))
            return self._ok({"ok": True})
        m = re.fullmatch(r"/api/shorts/(\d+)/view", self.path)
        if m:
            try:
                with DB_LOCK:
                    views = add_view(_storage, int(m.group(1)))
            except ValueError as e:
                return self._fail(404, str(e))
            return self._ok({"views": views})
        return self._fail(404, "Unbekannter Endpunkt.")

    def do_PATCH(self) -> None:  # noqa: N802
        m = re.fullmatch(r"/api/posts/(\d+)", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            body = self._read_json()
            try:
                with DB_LOCK:
                    fresh = update_post(
                        _storage, user_id, int(m.group(1)),
                        body.get("title", ""), body.get("text", ""),
                        body.get("tags", []),
                    )
                    author = _storage.get_user_by_id(fresh["user_id"])
                    comm = _storage.get_community_by_id(fresh["community_id"])
                    enriched = {
                        **fresh,
                        "username": author["username"],
                        "author_name": author["name"],
                        "author_avatar": author.get("avatar"),
                        "can_delete": True,
                        "community_slug": comm["slug"],
                        "community_name": comm["name"],
                    }
            except ValueError as e:
                msg = str(e)
                if "gefunden" in msg:
                    return self._fail(404, msg)
                if "nicht dein" in msg:
                    return self._fail(403, msg)
                return self._fail(400, msg)
            return self._ok({"post": public_post(enriched)})
        m = re.fullmatch(r"/api/communities/([a-z0-9._]{3,21})", self.path)
        if m:
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            raw = self._read_bytes(5 * 1024 * 1024)
            if raw is None:
                return self._fail(413, "Upload ist leer oder größer als 5 MB.")
            fields, files = parse_multipart(raw, self.headers.get("Content-Type"))
            image = files.get("image")
            try:
                with DB_LOCK:
                    full = update_community(
                        _storage, user_id, m.group(1),
                        fields.get("description", ""),
                        fields.get("rules", "[]"),
                        image["data"] if image and image["data"] else None,
                    )
            except ValueError as e:
                msg = str(e)
                if "gefunden" in msg:
                    return self._fail(404, msg)
                if "Nur der Admin" in msg:
                    return self._fail(403, msg)
                return self._fail(400, msg)
            return self._ok({"community": public_community(full)})
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
        m = re.fullmatch(r"/api/shorts/(\d+)", self.path)
        if m:
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            body = self._read_json()
            kwargs = {}
            if "title" in body:
                kwargs["title"] = body["title"]
            if "tags" in body:
                kwargs["tags"] = body["tags"]
            if "visibility" in body:
                kwargs["visibility"] = body["visibility"]
            if "commentsOff" in body:
                kwargs["comments_off"] = bool(body["commentsOff"])
            if body.get("removeThumb"):
                kwargs["remove_thumb"] = True
            try:
                with DB_LOCK:
                    fresh = update_short(_storage, user_id, int(m.group(1)), **kwargs)
            except ValueError as e:
                msg = str(e)
                return self._fail(404 if "gefunden" in msg else 400, msg)
            return self._ok({"short": public_short(fresh)})
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
        if self.path == "/api/me":
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            try:
                with DB_LOCK:
                    delete_account(_storage, user_id, self._read_json().get("username", ""))
            except ValueError as e:
                return self._fail(400, str(e))
            return self._ok({"ok": True})
        m = re.fullmatch(r"/api/posts/(\d+)", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            try:
                with DB_LOCK:
                    row = _storage.get_post(int(m.group(1)))
                    if row is None:
                        return self._fail(404, "Post nicht gefunden.")
                    comm = _storage.get_community_by_id(row["community_id"])
                    if comm is None:
                        return self._fail(404, "Post nicht gefunden.")
                    delete_post(_storage, user_id, comm["slug"], row["id"])
            except ValueError as e:
                msg = str(e)
                if "gefunden" in msg:
                    return self._fail(404, msg)
                if "Nur der Admin oder der Autor" in msg:
                    return self._fail(403, msg)
                return self._fail(400, msg)
            return self._ok({"ok": True})
        m = re.fullmatch(r"/api/communities/([a-z0-9._]{3,21})/posts/(\d+)", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            try:
                with DB_LOCK:
                    delete_post(_storage, user_id, m.group(1), int(m.group(2)))
            except ValueError as e:
                msg = str(e)
                if "gefunden" in msg:
                    return self._fail(404, msg)
                if "Nur der Admin" in msg:
                    return self._fail(403, msg)
                return self._fail(400, msg)
            return self._ok({"ok": True})
        m = re.fullmatch(r"/api/communities/([a-z0-9._]{3,21})", self.path)
        if m:
            _, user_id = self._auth_user()
            if user_id is None:
                return self._fail(401, "Nicht eingeloggt.")
            try:
                with DB_LOCK:
                    delete_community(_storage, user_id, m.group(1))
            except ValueError as e:
                msg = str(e)
                if "gefunden" in msg:
                    return self._fail(404, msg)
                if "Nur der Admin" in msg:
                    return self._fail(403, msg)
                return self._fail(400, msg)
            return self._ok({"ok": True})
        m = re.fullmatch(r"/api/shorts/(\d+)", self.path)
        if m:
            user, user_id = self._auth_user()
            if user is None:
                return self._fail(401, "Nicht eingeloggt.")
            try:
                with DB_LOCK:
                    delete_short(_storage, user_id, int(m.group(1)))
            except ValueError as e:
                msg = str(e)
                return self._fail(404 if "gefunden" in msg else 400, msg)
            return self._ok({"ok": True})
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
        self._write(data)

    def _serve_media(self, name: str) -> None:
        """ Liefert Videos/Thumbnails/Community-Bilder aus db/media (mit Range-Support fürs Seeken)."""
        safe = Path(name).name
        if not safe or safe != name:
            return self._fail(404, "Nicht gefunden.")
        target = VIDEO_DIR / safe
        if not target.is_file():
            target = THUMB_DIR / safe
        if not target.is_file():
            target = COMM_DIR / safe
        if not target.is_file():
            target = POSTS_DIR / safe
        if not target.is_file():
            return self._fail(404, "Nicht gefunden.")
        ctype = {
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".mov": "video/quicktime",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }.get(target.suffix.lower(), "application/octet-stream")
        size = target.stat().st_size
        start, end = 0, size - 1
        partial = False
        range_header = self.headers.get("Range") or ""
        m = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
        if m and size > 0:
            rs, re_ = m.groups()
            try:
                if rs:
                    start = int(rs)
                if re_:
                    end = min(int(re_), size - 1)
                if 0 <= start <= end < size:
                    partial = True
            except ValueError:
                partial = False
                start, end = 0, size - 1
        length = end - start + 1
        self.send_response(206 if partial else 200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        if partial:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        if self.command == "HEAD":
            return
        with target.open("rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                if not self._write(chunk):
                    break
                remaining -= len(chunk)

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
