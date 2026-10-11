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
]

export const DEMO_UPLOADS = [
  { id: 1, title: 'Mein erster Vlog (Beispiel)', status: 'Entwurf', views: '—', icon: 'fa-video', color: 'ic-teal' },
  { id: 2, title: 'Setup-Tour 2026 (Beispiel)', status: 'Geplant', views: '—', icon: 'fa-microchip', color: 'ic-violet' },
]
