"""Echte Communities: anlegen, Bild speichern, folgen, besuchen, Admin-Edit."""

from __future__ import annotations

import io
import json
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

# Standard-Regeln (stehen in jeder neuen Community, Admin darf sie ändern).
DEFAULT_RULES = [
    "Bleib freundlich – kein Hate, kein Spam.",
    "Nur eigene Inhalte oder mit Quelle.",
    "Titel müssen zum Inhalt passen.",
]
MAX_RULES = 5
MAX_RULE_LEN = 140
MAX_DESC_LEN = 280

# Slugs, die keine Community sein dürfen (API-Routen).
RESERVED_SLUGS = {"recent"}

SLUG_RE = re.compile(r"^[a-z0-9._]{3,21}$")


def slug_of(name: str) -> str:
    """Leitet den URL-Slug aus dem Anzeigenamen ab (wie das Frontend)."""
    return (name or "").strip().lower().replace(" ", "").replace("-", "")


def clean_slug(raw: str) -> str:
    return re.sub(r"[^a-z0-9._]", "", (raw or "").strip().lower())


def rules_of(row: dict) -> list:
    """Regeln aus der DB-Zeile (Fallback: Standard-Regeln)."""
    try:
        rules = json.loads(row.get("rules") or "[]")
    except ValueError:
        rules = []
    return rules if isinstance(rules, list) and rules else list(DEFAULT_RULES)


def _comm_dir(storage: Storage):
    # db/media/communities neben videos/ + thumbs/
    from pathlib import Path

    base = Path(storage.db_path).resolve().parent / "media" / COMM_DIR_NAME
    base.mkdir(parents=True, exist_ok=True)
    return base


def _check_image(image_data: bytes):
    """Prüft Community-Bildbytes, gibt das PIL-Bild zurück (ValueError sonst)."""
    if Image is None:
        raise ValueError("Bildverarbeitung ist auf dem Server nicht verfügbar.")
    if not image_data or len(image_data) > MAX_IMAGE_BYTES:
        raise ValueError("Das Bild darf höchstens 3 MB groß sein.")
    try:
        img = Image.open(io.BytesIO(image_data))
        img.load()
    except Exception:
        raise ValueError("Das ist kein lesbares PNG-, JPEG- oder WebP-Bild.")
    if img.format not in ("PNG", "JPEG", "JPG", "WEBP"):
        raise ValueError("Nur PNG, JPEG oder WebP sind erlaubt.")
    return img


def _save_image(storage: Storage, community_id: int, image_data: bytes) -> str:
    img = _check_image(image_data).convert("RGB")
    img.thumbnail((IMAGE_SIZE, IMAGE_SIZE), Image.LANCZOS)
    filename = f"comm_{community_id}.jpg"
    img.save(_comm_dir(storage) / filename, format="JPEG", quality=85)
    storage.set_community_image(community_id, filename)
    return filename


def parse_rules(raw: str) -> list:
    """Prüft Regeln aus JSON-String. Gibt die bereinigte Liste zurück."""
    try:
        rules = json.loads(raw or "[]")
    except ValueError:
        raise ValueError("Die Regeln sind ungültig.")
    if not isinstance(rules, list) or not 1 <= len(rules) <= MAX_RULES:
        raise ValueError(f"Es muss 1 bis {MAX_RULES} Regeln geben.")
    clean = []
    for r in rules:
        text = str(r or "").strip()
        if not text:
            raise ValueError("Keine leere Regel.")
        if len(text) > MAX_RULE_LEN:
            raise ValueError(f"Jede Regel darf höchstens {MAX_RULE_LEN} Zeichen haben.")
        clean.append(text)
    return clean


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
    if len(desc) > MAX_DESC_LEN:
        raise ValueError(f"Die Beschreibung darf höchstens {MAX_DESC_LEN} Zeichen haben.")
    slug = clean_slug(slug_of(display))
    if not slug or not SLUG_RE.match(slug):
        raise ValueError("Der Name muss mindestens 3 Zeichen aus a–z, 0–9, Punkt oder Unterstrich ergeben.")
    if slug in RESERVED_SLUGS:
        raise ValueError(f"t/{slug} ist reserviert.")
    if not image_data:
        raise ValueError("Bitte lade ein Bild für deine Community hoch.")
    _check_image(image_data)
    if storage.get_community(slug) is not None:
        raise ValueError(f"t/{slug} gibt es schon.")
    try:
        row = storage.create_community(
            slug, display, desc, creator_id, rules_json=json.dumps(DEFAULT_RULES)
        )
    except sqlite3.IntegrityError:
        raise ValueError(f"t/{slug} gibt es schon.")
    _save_image(storage, row["id"], image_data)
    # Ersteller ist automatisch Mitglied.
    storage.toggle_community_follow(creator_id, row["id"])
    log.info("Community angelegt: t/%s (id=%d)", slug, row["id"])
    return storage.community_with_stats(row["id"], creator_id)


def update_community(
    storage: Storage,
    user_id: int,
    slug: str,
    description: str,
    rules_raw: str,
    image_data: Optional[bytes] = None,
) -> dict:
    """Ändert Beschreibung/Regeln/Bild – nur der Admin (Ersteller) darf das.

    Wirft ValueError (403-Text bei fremdem Zugriff) mit deutscher Meldung.
    """
    comm = storage.get_community(slug)
    if comm is None:
        raise ValueError("Community nicht gefunden.")
    if comm.get("creator_id") != user_id:
        raise ValueError("Nur der Admin darf die Community bearbeiten.")
    desc = (description or "").strip()
    if len(desc) > MAX_DESC_LEN:
        raise ValueError(f"Die Beschreibung darf höchstens {MAX_DESC_LEN} Zeichen haben.")
    rules = parse_rules(rules_raw)
    if image_data:
        _save_image(storage, comm["id"], image_data)
    storage.update_community(comm["id"], desc, json.dumps(rules))
    log.info("Community bearbeitet: t/%s", slug)
    return storage.community_with_stats(comm["id"], user_id)


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
