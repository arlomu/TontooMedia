"""Short-Funktionen: Upload, ffmpeg-Verarbeitung, Thumbnails, Löschen.

Gehört zu backend/functions/ – ein Funktionsbereich, eine Datei.
Baut auf storage.Storage (SQLite) auf.

Pipeline (alles lokal, kein Cloud):
  1. Upload entgegennehmen (mp4/mov/webm, max. 300 MB, max. 90 s)
  2. ffmpeg: auf 9:16 HD (1080x1920) + 60fps normalisieren (H.264 + AAC)
  3. Thumbnail: custom Bild oder automatisch mittlerer Frame (360x640)
  4. Metadaten in db/shorts-Tabelle, Dateien in db/media/

Regeln wie im Frontend-Wizard: max. 1:30, nur Öffentlich/Privat.
"""
import io
import json
import shutil
import subprocess
import time
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

log = get_logger("tontoo.functions.shorts")

MAX_DURATION = 90.0
MAX_UPLOAD_BYTES = 300 * 1024 * 1024
OUT_W, OUT_H = 1080, 1920  # 9:16 HD
OUT_FPS = 60
THUMB_W, THUMB_H = 360, 640
VISIBILITIES = ("Öffentlich", "Privat")

# <Projekt>/backend/functions/shorts.py -> <Projekt>/db/media/
MEDIA_DIR = Path(__file__).resolve().parent.parent.parent / "db" / "media"
VIDEO_DIR = MEDIA_DIR / "videos"
THUMB_DIR = MEDIA_DIR / "thumbs"


def _ffmpeg() -> str:
    exe = shutil.which("ffmpeg")
    if not exe:
        raise ValueError("ffmpeg ist auf dem Server nicht installiert.")
    return exe


def _ffprobe() -> str:
    exe = shutil.which("ffprobe")
    if not exe:
        raise ValueError("ffprobe ist auf dem Server nicht installiert.")
    return exe


def probe_video(path: Path) -> dict:
    """Liest Dauer/Sekunden, Breite, Höhe aus einer Videodatei (ffprobe)."""
    try:
        out = subprocess.run(
            [_ffprobe(), "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height,duration",
             "-show_entries", "format=duration", "-of", "json", str(path)],
            capture_output=True, text=True, timeout=60, check=True,
        )
        info = json.loads(out.stdout or "{}")
    except (subprocess.SubprocessError, ValueError, OSError) as e:
        raise ValueError(f"Video konnte nicht gelesen werden: {e}")
    streams = info.get("streams") or []
    fmt = info.get("format") or {}
    dur = float((streams[0].get("duration") if streams else None) or fmt.get("duration") or 0)
    if dur <= 0:
        raise ValueError("Video hat keine lesbare Dauer.")
    return {
        "duration": dur,
        "width": int((streams[0].get("width") if streams else 0) or 0),
        "height": int((streams[0].get("height") if streams else 0) or 0),
    }


def process_video(src: Path, dst: Path) -> None:
    """Normalisiert auf 9:16 HD + 60fps (H.264 + AAC, faststart)."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            [_ffmpeg(), "-y", "-i", str(src),
             "-vf", f"scale={OUT_W}:{OUT_H}:force_original_aspect_ratio=increase,"
                    f"crop={OUT_W}:{OUT_H},fps={OUT_FPS}",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
             "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
             str(dst)],
            capture_output=True, text=True, timeout=600, check=True,
        )
    except subprocess.TimeoutExpired:
        raise ValueError("Verarbeitung hat zu lange gedauert.")
    except subprocess.CalledProcessError as e:
        raise ValueError(f"ffmpeg-Fehler: {(e.stderr or '')[-300:]}")


def middle_thumb(video: Path, duration: float, dst: Path) -> None:
    """Fischt den mittleren Frame als 360x640-Thumbnail (ffmpeg)."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    at = max(0.1, min(duration / 2, max(duration - 0.1, 0.1)))
    try:
        subprocess.run(
            [_ffmpeg(), "-y", "-ss", str(at), "-i", str(video),
             "-frames:v", "1",
             "-vf", f"scale={THUMB_W}:{THUMB_H}:force_original_aspect_ratio=increase,"
                    f"crop={THUMB_W}:{THUMB_H}",
             str(dst)],
            capture_output=True, text=True, timeout=120, check=True,
        )
    except (subprocess.SubprocessError, OSError) as e:
        raise ValueError(f"Thumbnail-Fehler: {e}")


def cover_thumb(data: bytes, dst: Path) -> None:
    """Speichert ein Custom-Thumbnail (Bild, 360x640 Cover)."""
    if Image is None:
        raise ValueError("Bildverarbeitung ist auf dem Server nicht verfügbar.")
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise ValueError("Das ist kein lesbares Bild (PNG/JPEG/WebP).")
    # Cover-Zuschnitt auf 360x640
    scale = max(THUMB_W / img.width, THUMB_H / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left = (img.width - THUMB_W) // 2
    top = (img.height - THUMB_H) // 2
    img.crop((left, top, left + THUMB_W, top + THUMB_H)).save(dst, format="JPEG", quality=82)


def create_short(
    storage: Storage,
    user_id: int,
    video_bytes: bytes,
    video_name: str,
    title: str,
    tags: list,
    visibility: str,
    comments_off: bool,
    thumb_bytes: Optional[bytes] = None,
) -> dict:
    """Kompletter Upload: prüfen → verarbeiten → Thumbnail → DB. Gibt den Short zurück."""
    title = (title or "").strip()
    if not title:
        raise ValueError("Bitte einen Titel eingeben.")
    if len(title) > 100:
        raise ValueError("Der Titel darf höchstens 100 Zeichen haben.")
    if visibility not in VISIBILITIES:
        raise ValueError("Nur Öffentlich oder Privat sind erlaubt.")
    tags = [str(t).strip().lower().lstrip("#")[:20] for t in (tags or [])]
    tags = [t for t in tags if t][:8]
    if not video_bytes or len(video_bytes) > MAX_UPLOAD_BYTES:
        raise ValueError("Video fehlt oder ist größer als 300 MB.")

    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    tmp_in = VIDEO_DIR / f"up_{user_id}_{time.time_ns()}.part"
    try:
        tmp_in.write_bytes(video_bytes)
        info = probe_video(tmp_in)
        if info["duration"] > MAX_DURATION:
            raise ValueError(
                f"Zu lang ({info['duration']:.0f} s) – Shorts dürfen höchstens 1:30 sein."
            )
        out_name = f"short_{user_id}_{time.time_ns()}.mp4"
        process_video(tmp_in, VIDEO_DIR / out_name)

        if thumb_bytes:
            thumb_name = f"thumb_{user_id}_{time.time_ns()}.jpg"
            cover_thumb(thumb_bytes, THUMB_DIR / thumb_name)
        else:
            thumb_name = f"thumb_{user_id}_{time.time_ns()}.jpg"
            middle_thumb(VIDEO_DIR / out_name, info["duration"], THUMB_DIR / thumb_name)

        short_id = storage.create_short(
            user_id, title, json.dumps(tags, ensure_ascii=False), visibility,
            bool(comments_off), out_name, thumb_name,
            info["duration"], info["width"], info["height"],
        )
    finally:
        try:
            tmp_in.unlink(missing_ok=True)
        except OSError:
            pass
    short = storage.get_short(short_id)
    assert short is not None
    log.info("Short hochgeladen: id=%d (user=%d, %.1fs)", short_id, user_id, info["duration"])
    return short


def update_short(
    storage: Storage,
    user_id: int,
    short_id: int,
    title: Optional[str] = None,
    tags: Optional[list] = None,
    visibility: Optional[str] = None,
    comments_off: Optional[bool] = None,
    thumb_bytes: Optional[bytes] = None,
    remove_thumb: bool = False,
) -> dict:
    """Bearbeitet Titel/Tags/Sichtbarkeit/Kommentare/Thumbnail (nur eigene Shorts)."""
    short = storage.get_short(short_id)
    if short is None or short["user_id"] != user_id:
        raise ValueError("Short nicht gefunden.")
    if title is not None:
        title = title.strip()
        if not title:
            raise ValueError("Bitte einen Titel eingeben.")
        if len(title) > 100:
            raise ValueError("Der Titel darf höchstens 100 Zeichen haben.")
    tags_json = None
    if tags is not None:
        clean = [str(t).strip().lower().lstrip("#")[:20] for t in tags]
        tags_json = json.dumps([t for t in clean if t][:8], ensure_ascii=False)
    if visibility is not None and visibility not in VISIBILITIES:
        raise ValueError("Nur Öffentlich oder Privat sind erlaubt.")
    thumb_name = short["thumb"]
    if thumb_bytes:
        thumb_name = f"thumb_{user_id}_{time.time_ns()}.jpg"
        cover_thumb(thumb_bytes, THUMB_DIR / thumb_name)
        _remove_file(THUMB_DIR / (short["thumb"] or ""))
    elif remove_thumb:
        _remove_file(THUMB_DIR / (short["thumb"] or ""))
        thumb_name = None
        # Auto-Ersatz: mittlerer Frame aus dem fertigen Video
        if short.get("filename"):
            thumb_name = f"thumb_{user_id}_{time.time_ns()}.jpg"
            try:
                middle_thumb(VIDEO_DIR / short["filename"], short.get("duration") or 1, THUMB_DIR / thumb_name)
            except ValueError:
                thumb_name = None
    storage.update_short(
        short_id, title=title, tags=tags_json, visibility=visibility,
        comments_off=comments_off, thumb=thumb_name, clear_thumb=remove_thumb,
    )
    fresh = storage.get_short(short_id)
    assert fresh is not None
    return fresh


def delete_short(storage: Storage, user_id: int, short_id: int) -> None:
    """Löscht Short inkl. Video- und Thumbnail-Datei (nur eigene)."""
    short = storage.get_short(short_id)
    if short is None or short["user_id"] != user_id:
        raise ValueError("Short nicht gefunden.")
    _remove_file(VIDEO_DIR / (short.get("filename") or ""))
    _remove_file(THUMB_DIR / (short.get("thumb") or ""))
    storage.delete_short(short_id)
    log.info("Short gelöscht: id=%d (user=%d)", short_id, user_id)


def _remove_file(path: Path) -> None:
    try:
        if path.name:
            path.unlink(missing_ok=True)
    except OSError:
        pass
