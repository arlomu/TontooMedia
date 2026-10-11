"""Echte Posts in Communities: erstellen (mit Bildern), löschen, Community löschen."""

from __future__ import annotations

import io
import json
import logging

from typing import Optional

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None

from storage import Storage

log = logging.getLogger("tontoo.functions.posts")

POST_DIR_NAME = "posts"
MAX_IMAGE_BYTES = 3 * 1024 * 1024
IMAGE_SIZE = 1024
MAX_IMAGES = 2
MAX_TAGS = 5
MAX_TITLE_LEN = 140
MAX_TEXT_LEN = 5000


def _posts_dir(storage: Storage):
    from pathlib import Path

    base = Path(storage.db_path).resolve().parent / "media" / POST_DIR_NAME
    base.mkdir(parents=True, exist_ok=True)
    return base


def _remove_file(path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def _check_image(image_data: bytes):
    if Image is None:
        raise ValueError("Bildverarbeitung ist auf dem Server nicht verfügbar.")
    if not image_data or len(image_data) > MAX_IMAGE_BYTES:
        raise ValueError("Jedes Bild darf höchstens 3 MB groß sein.")
    try:
        img = Image.open(io.BytesIO(image_data))
        img.load()
    except Exception:
        raise ValueError("Das ist kein lesbares PNG-, JPEG- oder WebP-Bild.")
    if img.format not in ("PNG", "JPEG", "JPG", "WEBP"):
        raise ValueError("Nur PNG, JPEG oder WebP sind erlaubt.")
    return img


def _save_post_image(storage: Storage, post_id: int, index: int, image_data: bytes) -> str:
    img = _check_image(image_data).convert("RGB")
    img.thumbnail((IMAGE_SIZE, IMAGE_SIZE), Image.LANCZOS)
    filename = f"post_{post_id}_{index}.jpg"
    img.save(_posts_dir(storage) / filename, format="JPEG", quality=85)
    return filename


def _admin_community(storage: Storage, user_id: int, slug: str) -> dict:
    """Community-Zeile oder ValueError (404 / 403-Text für Fremde)."""
    comm = storage.get_community(slug)
    if comm is None:
        raise ValueError("Community nicht gefunden.")
    if comm.get("creator_id") != user_id:
        raise ValueError("Nur der Admin darf das.")
    return comm


def create_post(
    storage: Storage,
    user_id: int,
    slug: str,
    title: str,
    text: str,
    tags: list,
    images: list,
) -> dict:
    """Erstellt einen Post in der Community (Bilder: max. 2 Dateien als Bytes).

    Wirft ValueError mit deutscher Meldung bei ungültigen Daten.
    """
    comm = storage.get_community(slug)
    if comm is None:
        raise ValueError("Community nicht gefunden.")
    clean_title = (title or "").strip()
    if not clean_title:
        raise ValueError("Bitte einen Titel eingeben.")
    if len(clean_title) > MAX_TITLE_LEN:
        raise ValueError(f"Der Titel darf höchstens {MAX_TITLE_LEN} Zeichen haben.")
    clean_text = (text or "").strip()
    if len(clean_text) > MAX_TEXT_LEN:
        raise ValueError(f"Der Text darf höchstens {MAX_TEXT_LEN} Zeichen haben.")
    clean_tags = []
    for t in (tags or [])[:MAX_TAGS]:
        tag = str(t or "").lstrip("#").strip()[:20]
        if tag:
            clean_tags.append(tag)
    if not images:
        images = []
    if len(images) > MAX_IMAGES:
        raise ValueError(f"Höchstens {MAX_IMAGES} Bilder pro Post.")
    for data in images:
        _check_image(data)
    row = storage.create_post(
        comm["id"], user_id, clean_title, clean_text, json.dumps(clean_tags)
    )
    filenames = [
        _save_post_image(storage, row["id"], i, data)
        for i, data in enumerate(images)
    ]
    storage.set_post_images(row["id"], json.dumps(filenames))
    log.info("Post erstellt: id=%d in t/%s", row["id"], slug)
    return storage.get_post(row["id"])


def delete_post(storage: Storage, user_id: int, slug: str, post_id: int) -> None:
    """Löscht einen Post (Admin der Community oder Autor)."""
    comm = storage.get_community(slug)
    if comm is None:
        raise ValueError("Community nicht gefunden.")
    row = storage.get_post(post_id)
    if row is None or row.get("community_id") != comm["id"]:
        raise ValueError("Post nicht gefunden.")
    if comm.get("creator_id") != user_id and row.get("user_id") != user_id:
        raise ValueError("Nur der Admin oder der Autor darf das.")
    storage.delete_post(post_id)
    try:
        filenames = json.loads(row.get("images") or "[]")
    except ValueError:
        filenames = []
    base = _posts_dir(storage)
    for name in filenames if isinstance(filenames, list) else []:
        if name:
            _remove_file(base / str(name))
    log.info("Post gelöscht: id=%d in t/%s", post_id, slug)


def update_post(
    storage: Storage, user_id: int, post_id: int, title: str, text: str, tags: list
) -> dict:
    """Ändert Titel/Text/Tags des eigenen Posts (Bilder bleiben).

    Wirft ValueError mit deutscher Meldung (404 / fremde Posts).
    """
    row = storage.get_post(post_id)
    if row is None:
        raise ValueError("Post nicht gefunden.")
    if row.get("user_id") != user_id:
        raise ValueError("Das ist nicht dein Post.")
    clean_title = (title or "").strip()
    if not clean_title:
        raise ValueError("Bitte einen Titel eingeben.")
    if len(clean_title) > MAX_TITLE_LEN:
        raise ValueError(f"Der Titel darf höchstens {MAX_TITLE_LEN} Zeichen haben.")
    clean_text = (text or "").strip()
    if len(clean_text) > MAX_TEXT_LEN:
        raise ValueError(f"Der Text darf höchstens {MAX_TEXT_LEN} Zeichen haben.")
    clean_tags = []
    for t in (tags or [])[:MAX_TAGS]:
        tag = str(t or "").lstrip("#").strip()[:20]
        if tag:
            clean_tags.append(tag)
    storage.update_post(post_id, clean_title, clean_text, json.dumps(clean_tags))
    log.info("Post bearbeitet: id=%d", post_id)
    return storage.get_post(post_id)


def delete_community(storage: Storage, user_id: int, slug: str) -> None:
    """Löscht die Community samt Posts/Bildern/Follows (nur Admin)."""
    comm = _admin_community(storage, user_id, slug)
    removed = storage.delete_community(comm["id"])
    from pathlib import Path

    media = Path(storage.db_path).resolve().parent / "media"
    if removed.get("image"):
        _remove_file(media / "communities" / str(removed["image"]))
    for name in removed.get("post_images") or []:
        if name:
            _remove_file(media / POST_DIR_NAME / str(name))
    log.info("Community gelöscht: t/%s", slug)
