// Beispiel-Daten für /app – kein Backend, keine API, nur Demo.

export const COMMUNITIES = [
  { id: 'fotografie', name: 'Fotografie', icon: 'fa-camera', color: 'ic-teal', members: '12,4 Tsd.', desc: 'Alles rund um Kameras, Licht und den perfekten Shot.' },
  { id: 'gaming', name: 'Gaming', icon: 'fa-gamepad', color: 'ic-violet', members: '48,1 Tsd.', desc: 'Clips, LFG und Talk über alles mit Controller.' },
  { id: 'musik', name: 'Musik', icon: 'fa-music', color: 'ic-yellow', members: '23,7 Tsd.', desc: 'Neue Tracks, Playlists und Homestudio-Tipps.' },
  { id: 'kochen', name: 'Kochen', icon: 'fa-utensils', color: 'ic-teal', members: '9,2 Tsd.', desc: 'Rezepte, Fails und Mitternachtssnacks.' },
  { id: 'tech', name: 'Tech', icon: 'fa-microchip', color: 'ic-violet', members: '31,5 Tsd.', desc: 'Gadgets, Setups und Code – Beispiel-Community.' },
]

export const DEMO_POSTS = [
  { id: 1, author: 'mia.postet', community: 'Fotografie', commId: 'fotografie', title: 'Goldene Stunde über den Dächern', time: 'vor 2 Min', text: 'War gestern mit der 50mm unterwegs – kein Filter, nur 19:42 Uhr und etwas Glück. Volles Album liegt in t/fotografie. Was sagt ihr zum Beschnitt?', likes: 128, comments: 24, icon: 'fa-camera', color: 'ic-teal' },
  { id: 2, author: 'pixel.tom', community: 'Gaming', commId: 'gaming', title: 'Dieser 1v3-Clutch war unreal', time: 'vor 26 Min', text: 'Letzte Runde, 12 HP, und dann sitzt der Flick. Clip liegt auch als Short vor – schaut rein und sagt mir, ob ich das als Tutorial aufdröseln soll.', likes: 342, comments: 51, icon: 'fa-gamepad', color: 'ic-violet' },
  { id: 3, author: 'beat.lena', community: 'Musik', commId: 'musik', title: 'Neuer Demo-Track aus dem Schlafzimmer-Studio', time: 'vor 1 Std', text: 'Drop bei 0:20 ist mein Lieblingsteil. Monitorboxen standen auf Umzugskartons, trotzdem pumpt es. Feedback zu Mix und Master?', likes: 89, comments: 12, icon: 'fa-music', color: 'ic-yellow' },
  { id: 4, author: 'koch.finn', community: 'Kochen', commId: 'kochen', title: '3-Zutaten-Pasta in 15 Minuten', time: 'vor 3 Std', text: 'Pasta, Kirschtomaten, Parmesan – mehr braucht es nachts um 1 nicht. Rezept mit Zeiten steht in den Kommis. Wer hat die schärfere Variante?', likes: 210, comments: 33, icon: 'fa-utensils', color: 'ic-teal' },
  { id: 5, author: 'tech.ana', community: 'Tech', commId: 'tech', title: 'Mein Setup 2026: klein, leise, schnell', time: 'vor 5 Std', text: 'Endlich alles verkabelt: ein Dock, zwei Monitore, null Lüfterlärm. Stückliste und Kostenaufstellung in t/tech. Was würdet ihr anders machen?', likes: 176, comments: 41, icon: 'fa-microchip', color: 'ic-violet' },
  { id: 6, author: 'foto.nina', community: 'Fotografie', commId: 'fotografie', title: 'Blende 1.8 vs. 2.8 – seht ihr den Unterschied?', time: 'vor 8 Std', text: 'Gleiche Szene, zwei Blenden, zwei Bilder. Beispiel-Post aus der Demo – stimmt ab, welches Bokeh ihr ruhiger findet.', likes: 94, comments: 18, icon: 'fa-camera', color: 'ic-teal' },
]

export const DEMO_SHORTS = [
  {
    id: 1,
    author: 'pixel.tom',
    title: 'Clutch in 15 Sekunden',
    sound: 'Originalton – pixel.tom',
    likes: '958.222',
    comments: '20.994',
    remixes: '508',
    icon: 'fa-gamepad',
    color: 'ic-violet',
    dur: '0:15',
  },
  {
    id: 2,
    author: 'mia.postet',
    title: 'POV: Golden Hour in der Stadt',
    sound: 'golden hour – beat.lena',
    likes: '312.480',
    comments: '8.131',
    remixes: '196',
    icon: 'fa-camera',
    color: 'ic-teal',
    dur: '0:32',
  },
  {
    id: 3,
    author: 'beat.lena',
    title: 'Beat aus dem Schlafzimmer',
    sound: 'Originalton – beat.lena',
    likes: '87.905',
    comments: '2.340',
    remixes: '74',
    icon: 'fa-music',
    color: 'ic-yellow',
    dur: '0:44',
  },
  {
    id: 4,
    author: 'koch.finn',
    title: 'Mitternachtspasta in 15 Min',
    sound: 'Originalton – koch.finn',
    likes: '45.210',
    comments: '1.102',
    remixes: '38',
    icon: 'fa-utensils',
    color: 'ic-teal',
    dur: '0:29',
  },
  {
    id: 5,
    author: 'tech.ana',
    title: 'Setup-Tour: ein Kabel, alles dran',
    sound: 'lofi beats – tech.ana',
    likes: '61.733',
    comments: '1.875',
    remixes: '112',
    icon: 'fa-microchip',
    color: 'ic-violet',
    dur: '0:51',
  },
]

export const DEMO_UPLOADS = [
  { id: 1, title: 'Mein erster Vlog (Beispiel)', status: 'Entwurf', views: '—', icon: 'fa-video', color: 'ic-teal' },
  { id: 2, title: 'Setup-Tour 2026 (Beispiel)', status: 'Geplant', views: '—', icon: 'fa-microchip', color: 'ic-violet' },
]

// Beispiel-Kommentare pro Short (mit Antworten) – kein Backend, nur Demo.
export const DEMO_COMMENTS = {
  1: [
    {
      id: '1-k1', author: 'mia.postet', time: 'vor 3 Std.', likes: 1204,
      text: 'Dieser Flick am Ende war komplett irre, habe es mir fünfmal angeschaut.',
      replies: [
        { id: '1-k1-a1', author: 'pixel.tom', time: 'vor 2 Std.', likes: 214, text: 'Danke! War auch komplett ungeplant.' },
        { id: '1-k1-a2', author: 'koch.finn', time: 'vor 1 Std.', likes: 87, text: 'Clip des Jahres, nichts anderes.' },
      ],
    },
    {
      id: '1-k2', author: 'beat.lena', time: 'vor 5 Std.', likes: 342,
      text: 'Der Sound dazu passt viel zu gut.',
      replies: [],
    },
    {
      id: '1-k3', author: 'gaming.fan99', time: 'vor 8 Std.', likes: 158,
      text: 'Tutorial wann? Will das auch können.',
      replies: [
        { id: '1-k3-a1', author: 'pixel.tom', time: 'vor 6 Std.', likes: 45, text: 'Kommt diese Woche, versprochen.' },
      ],
    },
  ],
  2: [
    {
      id: '2-k1', author: 'beat.lena', time: 'vor 4 Std.', likes: 689,
      text: 'Die Farben sind ja mal komplett gemalt.',
      replies: [
        { id: '2-k1-a1', author: 'mia.postet', time: 'vor 3 Std.', likes: 132, text: 'Kein Filter, nur 19:42 Uhr und Glück.' },
      ],
    },
    {
      id: '2-k2', author: 'pixel.tom', time: 'vor 7 Std.', likes: 204,
      text: 'Welche Stadt ist das? Brauche den Spot.',
      replies: [],
    },
    {
      id: '2-k3', author: 'foto.nina', time: 'vor 1 Tag', likes: 97,
      text: 'Mit welchem Objektiv? Schärfe ist top.',
      replies: [
        { id: '2-k3-a1', author: 'mia.postet', time: 'vor 20 Std.', likes: 61, text: '50mm, Blende 1.8 – mehr war es nicht.' },
      ],
    },
  ],
  3: [
    {
      id: '3-k1', author: 'pixel.tom', time: 'vor 2 Std.', likes: 453,
      text: 'Der Drop bei 0:20 bleibt im Kopf.',
      replies: [],
    },
    {
      id: '3-k2', author: 'mia.postet', time: 'vor 6 Std.', likes: 287,
      text: 'Schlafzimmer-Studio schlägt alles, Liebe dafür.',
      replies: [
        { id: '3-k2-a1', author: 'beat.lena', time: 'vor 5 Std.', likes: 119, text: 'Monitorboxen standen auf Umzugskartons.' },
      ],
    },
    {
      id: '3-k3', author: 'koch.finn', time: 'vor 1 Tag', likes: 76,
      text: 'Läuft bei mir jetzt in Dauerschleife.',
      replies: [],
    },
  ],
}

// Helfer für Links – hier zentral, damit Feed, Community und Post-Ansicht
// dieselben URLs bauen (t/name/post/id).
export const commIdOf = (p) =>
  p.commId || COMMUNITIES.find((c) => c.name === p.community)?.id || 'allgemein'

export const postUrlOf = (p) =>
  `${window.location.origin}/t/${commIdOf(p)}/post/${p.id}`

// Beispiel-Kommentare pro Text-Post (verschachtelt) – kein Backend, nur Demo.
export const DEMO_POST_COMMENTS = {
  1: [
    {
      id: 'p1-k1', author: 'foto.nina', time: 'vor 1 Std.', likes: 42,
      text: 'Der Beschnitt sitzt. Links vielleicht noch 5 % weg, dann führt alles auf die Skyline.',
      replies: [
        { id: 'p1-k1-a1', author: 'mia.postet', time: 'vor 48 Min.', likes: 18, text: 'Stimmt, probiere ich heute Abend aus!' },
      ],
    },
    {
      id: 'p1-k2', author: 'tech.ana', time: 'vor 2 Std.', likes: 15,
      text: '50mm 1.8 ist einfach die ehrlichste Linse. Kein Schnickschnack nötig.',
      replies: [],
    },
    {
      id: 'p1-k3', author: 'pixel.tom', time: 'vor 3 Std.', likes: 7,
      text: 'Volle Albumladung wann? Brauche mehr davon.',
      replies: [
        { id: 'p1-k3-a1', author: 'mia.postet', time: 'vor 2 Std.', likes: 9, text: 'Kommt am Wochenende, versprochen.' },
      ],
    },
  ],
  2: [
    {
      id: 'p2-k1', author: 'gaming.fan99', time: 'vor 20 Min.', likes: 88,
      text: 'Der Flick bei 12 HP war komplett krank. Tutorial bitte, Schritt für Schritt.',
      replies: [
        { id: 'p2-k1-a1', author: 'pixel.tom', time: 'vor 12 Min.', likes: 31, text: 'Kommt diese Woche als Short + Langversion.' },
        { id: 'p2-k1-a2', author: 'beat.lena', time: 'vor 5 Min.', likes: 12, text: 'Bin dabei, brauche das für meine Lobby.' },
      ],
    },
    {
      id: 'p2-k2', author: 'koch.finn', time: 'vor 1 Std.', likes: 11,
      text: 'Ich verstehe nichts, aber die Energie stimmt.',
      replies: [],
    },
  ],
  3: [
    {
      id: 'p3-k1', author: 'pixel.tom', time: 'vor 40 Min.', likes: 27,
      text: 'Mix klingt auf Kopfhörern schon fett. Auf welcher Abhöre hast du gemastert?',
      replies: [
        { id: 'p3-k1-a1', author: 'beat.lena', time: 'vor 25 Min.', likes: 14, text: 'Nur Kopfhörer + alte HiFi-Boxen. Umzugskarton-Ständer inklusive.' },
      ],
    },
    {
      id: 'p3-k2', author: 'mia.postet', time: 'vor 2 Std.', likes: 19,
      text: 'Der Drop bei 0:20 bleibt im Kopf, läuft hier in Dauerschleife.',
      replies: [],
    },
  ],
  4: [
    {
      id: 'p4-k1', author: 'beat.lena', time: 'vor 2 Std.', likes: 33,
      text: 'Nachts um 1 ist das ein Rettungsrezept. Schärfe-Variante: Chili + Zitrone.',
      replies: [
        { id: 'p4-k1-a1', author: 'koch.finn', time: 'vor 1 Std.', likes: 21, text: 'Chili ja, Zitrone teste ich heute. Danke!' },
      ],
    },
    {
      id: 'p4-k2', author: 'foto.nina', time: 'vor 3 Std.', likes: 8,
      text: 'Foto vom Teller fehlt. Man isst schließlich auch mit den Augen.',
      replies: [],
    },
  ],
  5: [
    {
      id: 'p5-k1', author: 'pixel.tom', time: 'vor 4 Std.', likes: 24,
      text: 'Ein Dock für alles klingt nach Traum. Welches Dock genau?',
      replies: [
        { id: 'p5-k1-a1', author: 'tech.ana', time: 'vor 3 Std.', likes: 16, text: 'Steht alles mit Preisen in meinem t/tech-Post. Kurz: ein Thunderbolt-Dock, zwei Kabel, fertig.' },
      ],
    },
    {
      id: 'p5-k2', author: 'mia.postet', time: 'vor 5 Std.', likes: 6,
      text: 'Leise UND schnell? Zeig mal Lautstärke-Messung, glaube ich erst dann.',
      replies: [],
    },
  ],
  6: [
    {
      id: 'p6-k1', author: 'mia.postet', time: 'vor 6 Std.', likes: 29,
      text: '1.8, ohne Diskussion. Das Bokeh bei 2.8 wirkt unruhig dagegen.',
      replies: [
        { id: 'p6-k1-a1', author: 'foto.nina', time: 'vor 5 Std.', likes: 11, text: 'Team 1.8. Bei 2.8 verliere ich das Motiv im Hintergrund.' },
        { id: 'p6-k1-a2', author: 'tech.ana', time: 'vor 4 Std.', likes: 4, text: 'Gegenstimme: 2.8, weil bei 1.8 die Nasenspitze schon unscharf ist.' },
      ],
    },
  ],
}

// ---------- Studio (Demo-Kennzahlen, alles Beispiel) ----------

// Übersicht fürs Dashboard (28-Tage-Basis, wird pro Zeitraum skaliert)
export const DEMO_STUDIO_OVERVIEW = {
  views: 1284500,
  watchHours: 8420,
  subs: 12480,
  subsGain: 312,
  likes: 96300,
  delta: { views: 12.4, watchHours: 8.1, subs: 2.6, likes: 18.9 },
  daily: {
    views: [42, 58, 51, 70, 66, 88, 95],
    watch: [30, 44, 40, 55, 60, 72, 80],
    subs: [5, 8, 6, 12, 9, 15, 18],
    likes: [35, 50, 46, 62, 58, 77, 84],
  },
}

// Kennzahlen pro Short (wird auf DEMO_SHORTS gemappt)
const SHORT_STATS = {
  1: { views: 2104500, date: '08.10.2026', status: 'live', visibility: 'Öffentlich', desc: '1v3-Clutch, ungeschnitten.' },
  2: { views: 740200, date: '09.10.2026', status: 'live', visibility: 'Öffentlich', desc: 'Golden Hour, 50mm, kein Filter.' },
  3: { views: 198400, date: '10.10.2026', status: 'live', visibility: 'Öffentlich', desc: 'Beat aus dem Homestudio.' },
  4: { views: 96300, date: '10.10.2026', status: 'live', visibility: 'Ungelisted', desc: 'Mitternachtspasta zum Nachkochen.' },
  5: { views: 141800, date: '11.10.2026', status: 'draft', visibility: 'Privat', desc: 'Setup-Tour, Schnitt fast fertig.' },
}

export const DEMO_STUDIO_SHORTS = DEMO_SHORTS.map((s) => ({ ...s, ...SHORT_STATS[s.id] }))

// Kennzahlen pro Text-Post (wird auf DEMO_POSTS gemappt)
const POST_STATS = {
  1: { views: 8420, date: '11.10.2026', status: 'live' },
  2: { views: 15230, date: '11.10.2026', status: 'live' },
  3: { views: 5110, date: '11.10.2026', status: 'live' },
  4: { views: 9840, date: '10.10.2026', status: 'live' },
  5: { views: 12070, date: '10.10.2026', status: 'live' },
  6: { views: 4320, date: '09.10.2026', status: 'live' },
}

export const DEMO_STUDIO_POSTS = DEMO_POSTS.map((p) => ({ ...p, ...POST_STATS[p.id] }))

// Geplante Inhalte (Shorts + Posts gemischt, Feld `kind`)
export const DEMO_PLANNED = [
  { id: 'plan-s1', kind: 'short', author: 'du', title: 'Setup-Tour Teil 2: Kabelmanagement', plannedFor: 'So, 12.10. · 18:00', icon: 'fa-microchip', color: 'ic-violet', dur: '0:47' },
  { id: 'plan-p1', kind: 'post', author: 'du', community: 'Tech', commId: 'tech', title: 'Dock-Vergleich: 3 Modelle im Test', text: 'Thunderbolt gegen USB-C – welches Dock lohnt sich wirklich? Tabelle folgt.', plannedFor: 'Mo, 13.10. · 09:00', icon: 'fa-microchip', color: 'ic-violet' },
  { id: 'plan-p2', kind: 'post', author: 'du', community: 'Fotografie', commId: 'fotografie', title: 'Album-Drop am Wochenende', text: 'Volle Golden-Hour-Serie, 24 Bilder, unbearbeitet.', plannedFor: 'Sa, 18.10. · 20:00', icon: 'fa-camera', color: 'ic-teal' },
]
