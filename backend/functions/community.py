"""Echte Communities: anlegen, Bild speichern, folgen, besuchen."""

from __future__ import annotations

import io
import logging
import re
import sqlite3

from typing import Optional

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None

from storage import Storage

log = logging.getLogger("tontoo.functions.community")

COMM_DIR_NAME = "communities"
MAX_IMAGE_BYTES = 3 * 1024 * 1024
IMAGE_SIZE = 1024

# Slugs, die keine Community sein dürfen (API-Routen).
RESERVED_SLUGS = {"recent"}

SLUG_RE = re.compile(r"^[a-z0-9._]{3,21}$")


def slug_of(name: str) -> str:
    """Leitet den URL-Slug aus dem Anzeigenamen ab (wie das Frontend)."""
    return (name or "").strip().lower().replace(" ", "").replace("-", "")


def clean_slug(raw: str) -> str:
    return re.sub(r"[^a-z0-9._]", "", (raw or "").strip().lower())


def _comm_dir(storage: Storage):
    # db/media/communities neben videos/ + thumbs/
    from pathlib import Path

    base = Path(storage.db_path).resolve().parent / "media" / COMM_DIR_NAME
    base.mkdir(parents=True, exist_ok=True)
    return base


def create_community(
    storage: Storage,
    creator_id: int,
    name: str,
    description: str,
    image_data: Optional[bytes],
) -> dict:
    """Legt eine Community an (mit Bild + Auto-Follow des Erstellers).

    Wirft ValueError mit deutscher Meldung bei ungültigen Daten.
    """
    display = (name or "").strip()
    if not display:
        raise ValueError("Bitte einen Namen eingeben.")
    if len(display) > 32:
        raise ValueError("Der Name darf höchstens 32 Zeichen haben.")
    desc = (description or "").strip()
    if len(desc) > 280:
        raise ValueError("Die Beschreibung darf höchstens 280 Zeichen haben.")
    slug = clean_slug(slug_of(display))
    if not slug or not SLUG_RE.match(slug):
        raise ValueError("Der Name muss mindestens 3 Zeichen aus a–z, 0–9, Punkt oder Unterstrich ergeben.")
    if slug in RESERVED_SLUGS:
        raise ValueError(f"t/{slug} ist reserviert.")
    if not image_data:
        raise ValueError("Bitte lade ein Bild für deine Community hoch.")
    if Image is None:
        raise ValueError("Bildverarbeitung ist auf dem Server nicht verfügbar.")
    if len(image_data) > MAX_IMAGE_BYTES:
        raise ValueError("Das Bild darf höchstens 3 MB groß sein.")
    try:
        img = Image.open(io.BytesIO(image_data))
        img.load()
    except Exception:
        raise ValueError("Das ist kein lesbares PNG-, JPEG- oder WebP-Bild.")
    if img.format not in ("PNG", "JPEG", "JPG", "WEBP"):
        raise ValueError("Nur PNG, JPEG oder WebP sind erlaubt.")
    if storage.get_community(slug) is not None:
        raise ValueError(f"t/{slug} gibt es schon.")
    try:
        row = storage.create_community(slug, display, desc, creator_id)
    except sqlite3.IntegrityError:
        raise ValueError(f"t/{slug} gibt es schon.")
    img = img.convert("RGB")
    img.thumbnail((IMAGE_SIZE, IMAGE_SIZE), Image.LANCZOS)
    filename = f"comm_{row['id']}.jpg"
    img.save(_comm_dir(storage) / filename, format="JPEG", quality=85)
    storage.set_community_image(row["id"], filename)
    # Ersteller ist automatisch Mitglied.
    storage.toggle_community_follow(creator_id, row["id"])
    log.info("Community angelegt: t/%s (id=%d)", slug, row["id"])
    return storage.community_with_stats(row["id"], creator_id)


def toggle_community_follow(storage: Storage, user_id: int, slug: str) -> dict:
    """Folgen umschalten. Gibt {followed, followers} zurück."""
    comm = storage.get_community(slug)
    if comm is None:
        raise ValueError("Community nicht gefunden.")
    followed = storage.toggle_community_follow(user_id, comm["id"])
    return {"followed": followed, "followers": storage.community_follower_count(comm["id"])}


def visit_community(storage: Storage, user_id: int, slug: str) -> None:
    """Merkt sich den Besuch für die Sidebar-Historie (letzte 5)."""
    comm = storage.get_community(slug)
    if comm is None:
        raise ValueError("Community nicht gefunden.")
    storage.record_community_visit(user_id, comm["id"])
