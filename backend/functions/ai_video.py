"""KI-Video-Jobs: TontooVideo-CLI im Hintergrund starten, Phasen tracken,
fertiges Video automatisch als Short importieren.

Mehrere Jobs laufen gleichzeitig (max. MAX_CONCURRENT, auch über
verschiedene User verteilt) – die CLI ist parallel-safe (eigene run_ids,
FreeRouter wird geteilt).
"""

from __future__ import annotations

import logging
import re
import subprocess
import sys
import threading
import time
import uuid

from pathlib import Path
from typing import Optional

log = logging.getLogger("tontoo.functions.ai_video")

# TontooVideo-CLI (anderes Laufwerk, selber PC).
AI_DIR = Path("T:/TontooVideo/app")
AI_CLI = "cli.py"

# Max. gleichzeitige CLI-Runs (PC schonen), Rest wartet.
MAX_CONCURRENT = 3
# Abbruch, falls die CLI länger braucht (4–6 Min sind normal).
JOB_TIMEOUT = 30 * 60

MAX_PROMPT_LEN = 500
MAX_TITLE_LEN = 100  # wie create_short (sonst scheitert der Import)
MAX_TAGS = 5
MAX_THUMB_BYTES = 3 * 1024 * 1024

# Status: wartet -> sucht -> schneidet -> musik -> fertig | fehler
PHASE_SEARCH = "sucht"
PHASE_CUT = "schneidet"
PHASE_MUSIC = "musik"

_slots = threading.Semaphore(MAX_CONCURRENT)
_jobs: dict = {}
_jobs_lock = threading.Lock()


def phase_of_line(line: str) -> Optional[str]:
    """Erkennt Phasen-Wechsel in CLI-stdout (None = keine Änderung).

    Marker aus cli.py: PROGRESS (Suche fertig) -> Timeline,
    TOOL render_final (Rendern inkl. Musik), FERTIG/VIDEO OK (fertig),
    FEHLER/FEHLGESCHLAGEN (Fehler, Status setzt der Worker).
    """
    low = line or ""
    if ">>> PROGRESS:" in low:
        return PHASE_CUT
    if "TOOL render_final:" in low:
        return PHASE_MUSIC
    return None


def is_failed_line(line: str) -> bool:
    low = line or ""
    return "FEHLGESCHLAGEN:" in low or "FEHLER:" in low


TOOL_RE = re.compile(r"\] TOOL ([A-Za-z0-9_]+):")


def tool_of_line(line: str) -> Optional[str]:
    """Tool-Namen aus CLI-stdout ziehen (`[..] TOOL <name>: ..`), sonst None."""
    m = TOOL_RE.search(line or "")
    return m.group(1) if m else None


def videos_dir() -> Path:
    # db/media/videos neben der Backend-DB (wie functions/shorts.py).
    base = Path(__file__).resolve().parent.parent.parent / "db" / "media" / "videos"
    base.mkdir(parents=True, exist_ok=True)
    return base


def validate_job(title: str, tags, prompt: str, thumb: Optional[bytes]) -> tuple:
    """Prüft Eingaben, gibt (title, tags, prompt) bereinigt zurück (ValueError sonst)."""
    clean_title = (title or "").strip()
    if not clean_title:
        raise ValueError("Bitte einen Titel eingeben.")
    if len(clean_title) > MAX_TITLE_LEN:
        raise ValueError(f"Der Titel darf höchstens {MAX_TITLE_LEN} Zeichen haben.")
    clean_tags = []
    for t in (tags or [])[:MAX_TAGS]:
        tag = str(t or "").lstrip("#").strip()[:20]
        if tag:
            clean_tags.append(tag)
    clean_prompt = (prompt or "").strip()
    if not clean_prompt:
        raise ValueError("Bitte einen Prompt eingeben.")
    if len(clean_prompt) > MAX_PROMPT_LEN:
        raise ValueError(f"Der Prompt darf höchstens {MAX_PROMPT_LEN} Zeichen haben.")
    if thumb is not None and len(thumb) > MAX_THUMB_BYTES:
        raise ValueError("Das Thumbnail darf höchstens 3 MB groß sein.")
    return clean_title, clean_tags, clean_prompt


def get_job(job_id: str) -> Optional[dict]:
    with _jobs_lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def list_user_jobs(user_id: int) -> list:
    with _jobs_lock:
        rows = [j for j in _jobs.values() if j["user_id"] == user_id]
    rows.sort(key=lambda j: j["created"], reverse=True)
    return [public_job(j) for j in rows[:20]]


def public_job(job: dict) -> dict:
    return {
        "id": job["id"],
        "status": job["status"],
        "title": job.get("title") or "",
        "message": job.get("message") or "",
        "shortId": job.get("short_id"),
        "tools": list(job.get("tools") or []),
        "created": job.get("created") or 0,
    }


def _set(job_id: str, **fields) -> None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job:
            job.update(fields)


def _prune() -> None:
    with _jobs_lock:
        done = [jid for jid, j in _jobs.items() if j["status"] in ("fertig", "fehler")]
        if len(_jobs) > 50:
            done.sort(key=lambda jid: _jobs[jid]["created"])
            for jid in done[: len(_jobs) - 50]:
                del _jobs[jid]


def start_job(storage, user_id: int, title: str, tags: list, prompt: str,
              thumb: Optional[bytes]) -> dict:
    """Legt einen KI-Job an und startet den Worker-Thread."""
    if not AI_DIR.is_dir() or not (AI_DIR / AI_CLI).is_file():
        raise ValueError("TontooVideo wurde nicht gefunden (T:/TontooVideo/app).")
    job_id = uuid.uuid4().hex[:8]
    job = {
        "id": job_id,
        "user_id": user_id,
        "title": title,
        "tags": tags,
        "prompt": prompt,
        "thumb": thumb,
        "status": "wartet",
        "message": "Wartet auf freien Slot …",
        "short_id": None,
        "tools": [],
        "created": int(time.time()),
    }
    with _jobs_lock:
        _jobs[job_id] = job
    _prune()
    thread = threading.Thread(
        target=_run_job, args=(storage, job_id), daemon=True,
        name=f"ai-video-{job_id}",
    )
    thread.start()
    log.info("AI-Job gestartet: %s (user=%d)", job_id, user_id)
    return public_job(job)


def _run_job(storage, job_id: str) -> None:
    job = get_job(job_id)
    if job is None:
        return
    out_path = videos_dir() / f"ai_{job_id}.mp4"
    # Slot begrenzt parallele Runs (mehrere User dürfen gleichzeitig).
    _set(job_id, status="wartet", message="Wartet auf freien Slot …")
    with _slots:
        _set(job_id, status=PHASE_SEARCH, message="Clips werden gesucht …")
        cmd = [sys.executable or "python", AI_CLI, job["prompt"], "-o", str(out_path)]
        try:
            proc = subprocess.Popen(
                cmd,
                cwd=str(AI_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
        except Exception as e:
            _set(job_id, status="fehler", message=f"CLI startet nicht: {e}")
            return
        tail: list = []
        try:
            assert proc.stdout is not None
            start = time.time()
            for line in proc.stdout:
                tail.append(line.rstrip())
                if len(tail) > 30:
                    tail.pop(0)
                # Debug: ausgeführte Tools mitschneiden (nur Namen, in Reihenfolge).
                tool = tool_of_line(line)
                if tool:
                    with _jobs_lock:
                        seen = _jobs.get(job_id, {}).get("tools") or []
                        if tool not in seen:
                            _jobs[job_id]["tools"] = (seen + [tool])[:50]
                phase = phase_of_line(line)
                if phase == PHASE_CUT:
                    _set(job_id, status=PHASE_CUT, message="Szenen werden geschnitten …")
                elif phase == PHASE_MUSIC:
                    _set(job_id, status=PHASE_MUSIC, message="Musik wird eingefügt …")
                if time.time() - start > JOB_TIMEOUT:
                    proc.kill()
                    _set(job_id, status="fehler",
                         message="Abgebrochen: Die Generierung dauert zu lange.")
                    return
            code = proc.wait(timeout=60)
        except Exception as e:
            try:
                proc.kill()
            except Exception:
                pass
            _set(job_id, status="fehler", message=f"CLI-Fehler: {e}")
            return
        if code != 0 or not out_path.is_file() or out_path.stat().st_size == 0:
            err = next((l for l in reversed(tail) if is_failed_line(l)), None)
            _set(job_id, status="fehler",
                 message=err or f"Generierung fehlgeschlagen (Code {code}).")
            try:
                out_path.unlink(missing_ok=True)
            except OSError:
                pass
            return
        # Fertig gerendert -> automatisch als Short importieren (normale Pipeline).
        try:
            from functions.shorts import create_short

            data = out_path.read_bytes()
            short = create_short(
                storage, job["user_id"], data, out_path.name,
                job["title"], job["tags"], "Öffentlich", False, job.get("thumb"),
            )
        except ValueError as e:
            _set(job_id, status="fehler", message=str(e))
            return
        except Exception as e:  # noqa: BLE001
            log.exception("AI-Import fehlgeschlagen: %s", job_id)
            _set(job_id, status="fehler", message=f"Import fehlgeschlagen: {e}")
            return
        finally:
            try:
                out_path.unlink(missing_ok=True)
            except OSError:
                pass
        _set(job_id, status="fertig", short_id=short["id"],
             message="Fertig! Dein Video ist bereit.")
        log.info("AI-Job fertig: %s -> short %d", job_id, short["id"])
