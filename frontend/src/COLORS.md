# TontooMedia Farben (Pflicht-Palette für alle Pages / Komponenten)

Regeln laut AGENTS.md: keine Gradienten als Design-Basis, max. diese Farben
nutzen, Text immer mit genug Kontrast zum Hintergrund.

## Hintergrund

| Token        | Hex       | Nutzung                              |
|--------------|-----------|--------------------------------------|
| `--bg`       | `#0B0B12` | Seiten-Hintergrund (dark)            |
| `--surface`  | `#15151F` | Cards, Navbar, Toolbar (Sec. BG)     |
| `--surface2` | `#1E1E2B` | Modals, Dropdowns, Context-Menüs     |
| `--border`   | `#2B2B3A` | Borders, Divider                     |

## Text (3 Stufen, immer passend zum Dark-BG)

| Token         | Hex       | Nutzung                              |
|---------------|-----------|--------------------------------------|
| `--text`      | `#F5F1E6` | Haupttext (warm-weiß, kein Reinweiß) |
| `--text-sec`  | `#B9B3A5` | Sekundärtext, Beschreibungen         |
| `--text-3rd`  | `#7E7A6E` | Tertiärtext, Meta / Timestamps       |

## Buttons & Aktionen

| Token        | Hex       | Nutzung                              |
|--------------|-----------|--------------------------------------|
| `--brand`    | `#F5B301` | Primär-Buttons (Oktopus-Gelb), Icons |
| `--brand-ink`| `#1A1400` | Text auf `--brand` (Kontrast!)       |
| `--accent`   | `#4FB0A8` | Sekundär-Aktionen, Links, Teal-Icons |
| `--danger`   | `#E05D5D` | Danger / Melden / Fehler             |

## Deko (nur für treibende Hintergrund-Elemente + Icon-Farben, sparsam!)

| Token      | Hex       | Nutzung                                |
|------------|-----------|----------------------------------------|
| `--orb-1`  | `#F5B301` | Hintergrund-Orb 1 (Gelb, 12% Opacity)  |
| `--orb-2`  | `#4FB0A8` | Hintergrund-Orb 2 (Teal, 12% Opacity)  |
| `--orb-3`  | `#6C5CE7` | Hintergrund-Orb 3 (Violett, 10% Op.)   |

Mischfarben / Transparenzen nur via `color-mix()` oder rgba aus diesen Tokens.
