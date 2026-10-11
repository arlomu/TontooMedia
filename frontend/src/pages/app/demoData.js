// Beispiel-Daten für /app – kein Backend, keine API, nur Demo.

export const COMMUNITIES = [
  { id: 'fotografie', name: 'Fotografie', icon: 'fa-camera', color: 'ic-teal', members: '12,4 Tsd.', desc: 'Alles rund um Kameras, Licht und den perfekten Shot.' },
  { id: 'gaming', name: 'Gaming', icon: 'fa-gamepad', color: 'ic-violet', members: '48,1 Tsd.', desc: 'Clips, LFG und Talk über alles mit Controller.' },
  { id: 'musik', name: 'Musik', icon: 'fa-music', color: 'ic-yellow', members: '23,7 Tsd.', desc: 'Neue Tracks, Playlists und Homestudio-Tipps.' },
  { id: 'kochen', name: 'Kochen', icon: 'fa-utensils', color: 'ic-teal', members: '9,2 Tsd.', desc: 'Rezepte, Fails und Mitternachtssnacks.' },
  { id: 'tech', name: 'Tech', icon: 'fa-microchip', color: 'ic-violet', members: '31,5 Tsd.', desc: 'Gadgets, Setups und Code – Beispiel-Community.' },
]

export const DEMO_POSTS = [
  { id: 1, author: 'mia.postet', community: 'Fotografie', time: 'vor 2 Min', text: 'Goldene Stunde > alles. Beispiel-Post aus der Demo.', likes: 128, comments: 24, icon: 'fa-camera', color: 'ic-teal' },
  { id: 2, author: 'pixel.tom', community: 'Gaming', time: 'vor 26 Min', text: 'Dieser Clutch war unreal. Beispiel-Post aus der Demo.', likes: 342, comments: 51, icon: 'fa-gamepad', color: 'ic-violet' },
  { id: 3, author: 'beat.lena', community: 'Musik', time: 'vor 1 Std', text: 'Neuer Demo-Track ist raus – Link in den Kommis (Beispiel).', likes: 89, comments: 12, icon: 'fa-music', color: 'ic-yellow' },
  { id: 4, author: 'koch.finn', community: 'Kochen', time: 'vor 3 Std', text: '3-Zutaten-Pasta, 15 Minuten. Beispiel-Post aus der Demo.', likes: 210, comments: 33, icon: 'fa-utensils', color: 'ic-teal' },
]

export const DEMO_SHORTS = [
  { id: 1, title: 'POV: Golden Hour', views: '18 Tsd.', dur: '0:32', icon: 'fa-camera', color: 'ic-teal' },
  { id: 2, title: 'Clutch in 15s', views: '92 Tsd.', dur: '0:15', icon: 'fa-gamepad', color: 'ic-violet' },
  { id: 3, title: 'Beat aus dem Schlafzimmer', views: '7 Tsd.', dur: '0:44', icon: 'fa-music', color: 'ic-yellow' },
  { id: 4, title: 'Pasta in 15 Min', views: '31 Tsd.', dur: '0:58', icon: 'fa-utensils', color: 'ic-teal' },
  { id: 5, title: 'Setup-Tour 2026', views: '54 Tsd.', dur: '1:02', icon: 'fa-microchip', color: 'ic-violet' },
  { id: 6, title: 'Straßenfotos Berlin', views: '11 Tsd.', dur: '0:27', icon: 'fa-camera', color: 'ic-yellow' },
]

export const DEMO_UPLOADS = [
  { id: 1, title: 'Mein erster Vlog (Beispiel)', status: 'Entwurf', views: '—', icon: 'fa-video', color: 'ic-teal' },
  { id: 2, title: 'Setup-Tour 2026 (Beispiel)', status: 'Geplant', views: '—', icon: 'fa-microchip', color: 'ic-violet' },
]
