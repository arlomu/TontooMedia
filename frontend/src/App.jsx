import { useEffect, useRef, useState } from 'react'

const POSTS = [
  {
    id: 1,
    name: 'mia.postet',
    time: 'vor 2 Min',
    text: 'Mein erster Post auf TontooMedia! Wer ist auch schon hier?',
    likes: 128,
    comments: 24,
    icon: 'fa-camera',
    iconColor: 'ic-teal',
  },
  {
    id: 2,
    name: 'tontoo.official',
    time: 'vor 1 Std',
    text: 'Willkommen bei TontooMedia – Feed, Communities und Messages kommen bald.',
    likes: 512,
    comments: 89,
    icon: 'fa-bullhorn',
    iconColor: 'ic-yellow',
  },
  {
    id: 3,
    name: 'jonas.fotos',
    time: 'vor 3 Std',
    text: 'Sunset shots gehen hier hoffentlich viral. #fotografie',
    likes: 76,
    comments: 11,
    icon: 'fa-mountain-sun',
    iconColor: 'ic-violet',
  },
]

const MENU_ITEMS = [
  { id: 'feed', label: 'Feed', desc: 'Neueste Beiträge', icon: 'fa-newspaper', color: 'ic-yellow' },
  { id: 'communities', label: 'Communities', desc: 'Gruppen entdecken', icon: 'fa-users', color: 'ic-teal' },
  { id: 'messages', label: 'Messages', desc: 'Chats & DMs', icon: 'fa-comments', color: 'ic-violet' },
  { id: 'events', label: 'Events', desc: 'Treffen & Streams', icon: 'fa-calendar-days', color: 'ic-teal' },
  { id: 'fotos', label: 'Fotos', desc: 'Bilder entdecken', icon: 'fa-images', color: 'ic-yellow' },
  { id: 'musik', label: 'Musik', desc: 'Sounds & Playlists', icon: 'fa-music', color: 'ic-violet' },
  { id: 'hilfe', label: 'Hilfe', desc: 'FAQ & Support', icon: 'fa-circle-question', color: 'ic-teal' },
]

const STATS = [
  { kpi: 'Plätze in der Beta', value: '1.000', trend: 'up', note: '+120 diese Woche' },
  { kpi: 'Beiträge heute', value: '8.412', trend: 'up', note: '+6 % vs. gestern' },
  { kpi: 'Communities', value: '312', trend: 'up', note: '+18 neue' },
  { kpi: 'Melderate', value: '0,4 %', trend: 'down', note: 'ruhige Community' },
]

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [modal, setModal] = useState(null) // null | 'login' | 'register'
  const [wishName, setWishName] = useState('')
  const [query, setQuery] = useState('')
  const [ctx, setCtx] = useState(null) // { x, y, post }
  const [toast, setToast] = useState(null)
  const [liked, setLiked] = useState({})
  const [spinning, setSpinning] = useState(false)
  const toastTimer = useRef(null)
  const eggClicks = useRef([])
  const menuRef = useRef(null)

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  // Modal: Escape schließt
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setModal(null)
        setCtx(null)
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Klick außerhalb schließt Dropdown + Context-Menü
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (!e.target.closest?.('.ctxmenu')) setCtx(null)
    }
    const onScroll = () => setCtx(null)
    window.addEventListener('click', onClick)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('click', onClick)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  // Reveal-Animation beim Scrollen
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add('visible')),
      { threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Easter Egg 1: Logo 5x klicken → Tontoo sagt hi
  const onLogoClick = (e) => {
    e.preventDefault()
    const now = Date.now()
    eggClicks.current = [...eggClicks.current.filter((t) => now - t < 1500), now]
    if (eggClicks.current.length >= 5) {
      eggClicks.current = []
      setSpinning(true)
      showToast('Tontoo sagt hi! Du hast das Easter Egg gefunden.')
      setTimeout(() => setSpinning(false), 900)
    }
  }

  // Easter Egg 2: Oktopus anklicken → Pirouette
  const onOctoClick = () => {
    setSpinning(true)
    setTimeout(() => setSpinning(false), 900)
  }

  const openCtx = (e, post) => {
    e.preventDefault()
    const pad = 8
    const w = 230
    const h = 170
    setCtx({
      x: Math.min(e.clientX, window.innerWidth - w - pad),
      y: Math.min(e.clientY, window.innerHeight - h - pad),
      post,
    })
  }

  const copyLink = async (post) => {
    const link = `${window.location.origin}/p/${post.id}`
    try {
      await navigator.clipboard.writeText(link)
      showToast('Link kopiert.')
    } catch {
      showToast(link)
    }
    setCtx(null)
  }

  const filtered = POSTS.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.text.toLowerCase().includes(query.toLowerCase())
  )

  const toggleLike = (id) => setLiked((s) => ({ ...s, [id]: !s[id] }))

  return (
    <div className="page">
      {/* Hintergrund: 3 einfarbige, langsam treibende Orbs (kein Gradient) */}
      <div className="orbs" aria-hidden="true">
        <span className="orb o1" />
        <span className="orb o2" />
        <span className="orb o3" />
      </div>

      <header className="nav">
        <div className="nav-inner">
          <a className="brand" href="/" onClick={onLogoClick} title="5x klicken …">
            <img
              className={`brand-logo${spinning ? ' spin' : ''}`}
              src="/icon.png"
              alt="TontooMedia Logo"
            />
            <span className="brand-name">TontooMedia</span>
            <span className="brand-badge">beta</span>
          </a>

          <nav className="nav-links">
            <a href="#was-ist">Was ist das?</a>
            <a href="#feed">Feed</a>
            <a href="#zahlen">Zahlen</a>
            <div className="menuwrap" ref={menuRef}>
              <button
                type="button"
                className={`btn btn-ghost btn-sm menubtn${menuOpen ? ' open' : ''}`}
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <i className="fa-solid fa-compass ic-teal" /> Entdecken
                <i className={`fa-solid fa-chevron-down caret${menuOpen ? ' flip' : ''}`} />
              </button>
              {menuOpen && (
                <div className="dropdown" role="menu">
                  {MENU_ITEMS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="menuitem"
                      className="dropitem"
                      onClick={() => {
                        setMenuOpen(false)
                        showToast(`${m.label} kommt bald in der Beta.`)
                      }}
                    >
                      <i className={`fa-solid ${m.icon} ${m.color}`} />
                      <span>
                        <strong>{m.label}</strong>
                        <small>{m.desc}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Toolbar: Login / Registrieren */}
          <div className="toolbar" role="toolbar" aria-label="Konto">
            <button type="button" className="btn btn-ghost" onClick={() => setModal('login')}>
              <i className="fa-solid fa-right-to-bracket" /> Login
            </button>
            <span className="toolsep" aria-hidden="true" />
            <button type="button" className="btn btn-brand" onClick={() => setModal('register')}>
              <i className="fa-solid fa-user-plus" /> Registrieren
            </button>
          </div>

          <button
            type="button"
            className="iconbtn burger"
            aria-label="Menü öffnen"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <i className={`fa-solid ${mobileOpen ? 'fa-xmark' : 'fa-bars'}`} />
          </button>
        </div>

        {mobileOpen && (
          <nav className="mobilepanel">
            <a href="#was-ist" onClick={() => setMobileOpen(false)}>Was ist das?</a>
            <a href="#feed" onClick={() => setMobileOpen(false)}>Feed</a>
            <a href="#zahlen" onClick={() => setMobileOpen(false)}>Zahlen</a>
            <div className="mobilerow">
              <button type="button" className="btn btn-ghost" onClick={() => { setMobileOpen(false); setModal('login') }}>
                <i className="fa-solid fa-right-to-bracket" /> Login
              </button>
              <button type="button" className="btn btn-brand" onClick={() => { setMobileOpen(false); setModal('register') }}>
                <i className="fa-solid fa-user-plus" /> Registrieren
              </button>
            </div>
          </nav>
        )}
      </header>

      <main>
        <section className="hero reveal">
          <img
            className={`hero-logo${spinning ? ' spin' : ''}`}
            src="/icon.png"
            alt="TontooMedia Oktopus Maskottchen"
            onClick={onOctoClick}
            title="Klick mich"
          />
          <p className="hero-pill">
            <i className="fa-solid fa-sparkles ic-yellow" /> Die neue Social-Plattform im Aufbau
          </p>
          <h1>
            Teile Momente.
            <br />
            <span className="hl">Finde deine Community.</span>
          </h1>
          <p className="hero-sub">
            <strong>TontooMedia</strong> ist eine Social-Media-artige Webapp: Poste Beiträge,
            folge Freunden, entdecke Themen und chatte – <em>alles an einem Ort</em>,
            modern und schnell.
          </p>
          <div className="hero-cta">
            <button type="button" className="btn btn-brand btn-lg" onClick={() => setModal('register')}>
              <i className="fa-solid fa-user-plus" /> Jetzt registrieren
            </button>
            <a className="btn btn-ghost btn-lg" href="#feed">
              <i className="fa-solid fa-arrow-down ic-teal" /> Feed ansehen
            </a>
          </div>
        </section>

        <section id="was-ist" className="section reveal">
          <h2>Was ist TontooMedia?</h2>
          <p className="section-sub">
            Eine Social-Media-Plattform zum <strong>Posten</strong>, <strong>Entdecken</strong> und{' '}
            <strong>Vernetzen</strong> – gerade entsteht hier die Basis. Diese Startseite zeigt
            die Idee, das Design und die Richtung.
          </p>
          <div className="grid3">
            <div className="card">
              <i className="fa-solid fa-newspaper cardic ic-yellow" />
              <h3>Persönlicher Feed</h3>
              <p>Beiträge, Fotos und kurze Updates von Freunden und Themen, die dich interessieren.</p>
            </div>
            <div className="card">
              <i className="fa-solid fa-users cardic ic-teal" />
              <h3>Communities</h3>
              <p>Gruppen für Hobbys, Gaming, Musik oder Sport – oder starte deine eigene Community.</p>
            </div>
            <div className="card">
              <i className="fa-solid fa-comments cardic ic-violet" />
              <h3>Messages</h3>
              <p>Direktnachrichten und Gruppenchats – schnell, modern und direkt in der App.</p>
            </div>
          </div>
        </section>

        <section id="feed" className="section reveal">
          <div className="feedhead">
            <div>
              <h2>Live-Feed <span className="count">{filtered.length}</span></h2>
              <p className="section-sub left">
                So sieht der Feed später aus. <strong>Rechtsklick</strong> auf einen Beitrag öffnet
                das Kontextmenü. Tippen filtert live – ganz ohne Speichern-Button.
              </p>
            </div>
            <label className="search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="search"
                placeholder="Feed durchsuchen …"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Feed durchsuchen"
              />
              {query && (
                <button type="button" className="iconbtn sm" aria-label="Suche löschen" onClick={() => setQuery('')}>
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </label>
          </div>

          <div className="feed">
            {filtered.map((p) => (
              <article key={p.id} className="post" onContextMenu={(e) => openCtx(e, p)}>
                <div className="posthead">
                  <span className="avatar">
                    <i className={`fa-solid ${p.icon} ${p.iconColor}`} />
                  </span>
                  <div>
                    <div className="postname">{p.name}</div>
                    <div className="posttime">
                      <i className="fa-regular fa-clock" /> {p.time}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="iconbtn sm postmore"
                    aria-label="Mehr Optionen"
                    onClick={(e) =>
                      openCtx(
                        { ...e, clientX: e.clientX || window.innerWidth - 250, clientY: e.clientY || 200, preventDefault: () => {} },
                        p
                      )
                    }
                  >
                    <i className="fa-solid fa-ellipsis" />
                  </button>
                </div>
                <p className="posttext">{p.text}</p>
                {/* Action-Toolbar: gefüllte Leiste mit runden Icon-Buttons */}
                <div className="actionbar" role="toolbar" aria-label="Aktionen">
                  <button
                    type="button"
                    className={`iconbtn round${liked[p.id] ? ' active' : ''}`}
                    aria-pressed={!!liked[p.id]}
                    aria-label="Liken"
                    onClick={() => toggleLike(p.id)}
                  >
                    <i className={`fa-${liked[p.id] ? 'solid' : 'regular'} fa-heart`} />
                  </button>
                  <span className="actioncount">{p.likes + (liked[p.id] ? 1 : 0)}</span>
                  <button
                    type="button"
                    className="iconbtn round"
                    aria-label="Kommentieren"
                    onClick={() => showToast('Kommentare kommen mit der Beta.')}
                  >
                    <i className="fa-regular fa-comment" />
                  </button>
                  <span className="actioncount">{p.comments}</span>
                  <span className="actionspacer" />
                  <button
                    type="button"
                    className="iconbtn round"
                    aria-label="Teilen"
                    onClick={() => copyLink(p)}
                  >
                    <i className="fa-solid fa-share-nodes" />
                  </button>
                </div>
              </article>
            ))}
            {filtered.length === 0 && (
              <div className="empty">
                <i className="fa-solid fa-ghost ic-violet" />
                <p>Nichts gefunden für <strong>„{query}“</strong>. Einfach anders tippen – die Liste filtert live.</p>
              </div>
            )}
          </div>
        </section>

        <section id="zahlen" className="section reveal">
          <h2>TontooMedia in Zahlen</h2>
          <p className="section-sub">Klein, aber wächst – Stand der Beta-Woche.</p>
          <div className="tablewrap">
            <table className="datatable">
              <thead>
                <tr>
                  <th>Kennzahl</th>
                  <th>Wert</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {STATS.map((s) => (
                  <tr key={s.kpi}>
                    <td>{s.kpi}</td>
                    <td className="num">{s.value}</td>
                    <td>
                      <i className={`fa-solid ${s.trend === 'up' ? 'fa-arrow-trend-up ic-teal' : 'fa-arrow-trend-down ic-yellow'}`} />{' '}
                      {s.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="vision reveal">
          <i className="fa-solid fa-heart visionic" />
          <h2>Unsere Vision</h2>
          <p>
            Weniger Doomscrolling, mehr echte Verbindung. TontooMedia soll einfach,
            schnell und fair sein – gebaut für Menschen, nicht für Algorithmen.
          </p>
        </section>
      </main>

      <footer className="footer">
        <img className="footlogo" src="/icon.png" alt="" />
        <span>© 2026 TontooMedia · Basis-Version</span>
        <span className="fdot" aria-hidden="true" />
        <span>Feed · Communities · Messages (bald)</span>
      </footer>

      {/* Custom Context-Menü (statt Browser-Menü) */}
      {ctx && (
        <div className="ctxmenu" style={{ top: ctx.y, left: ctx.x }} role="menu">
          <div className="ctxhead">Beitrag von <strong>{ctx.post.name}</strong></div>
          <button type="button" role="menuitem" onClick={() => { setCtx(null); showToast(`Profil ${ctx.post.name} kommt bald.`) }}>
            <i className="fa-solid fa-user ic-teal" /> Profil ansehen
          </button>
          <button type="button" role="menuitem" onClick={() => copyLink(ctx.post)}>
            <i className="fa-solid fa-link ic-yellow" /> Link kopieren
          </button>
          <button type="button" role="menuitem" className="danger" onClick={() => { setCtx(null); showToast('Danke, wir schauen uns das an.') }}>
            <i className="fa-solid fa-flag" /> Melden
          </button>
        </div>
      )}

      {/* Custom Modal (statt Browser-Dialog) */}
      {modal && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-label={modal === 'login' ? 'Login' : 'Registrieren'}>
            <h3>{modal === 'login' ? 'Login' : 'Registrieren'}</h3>
            <div className="dialogbody">
              <p>
                {modal === 'login'
                  ? 'Melde dich bald mit deinem Tontoo-Namen an. Die Anmeldung ist in dieser Basis noch deaktiviert.'
                  : 'Sichere dir deinen Tontoo-Namen für die Beta. Aktuell nur eine Vorschau – nichts wird gespeichert.'}
              </p>
              <label className="field">
                <span>Wunschname (wird live übernommen, kein Speichern nötig)</span>
                <input
                  type="text"
                  placeholder="z. B. tontoo.fan"
                  value={wishName}
                  onChange={(e) => setWishName(e.target.value)}
                  autoFocus
                />
              </label>
              {wishName.trim() && (
                <p className="liveprev">
                  <i className="fa-solid fa-check ic-teal" /> Hallo <strong>@{wishName.trim()}</strong> – so steht dein Name später da.
                </p>
              )}
            </div>
            <div className="dialogfoot">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-brand" onClick={() => { setModal(null); showToast('Verstanden – bald geht es hier weiter.') }}>
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast" role="status">
          <i className="fa-solid fa-circle-check ic-teal" /> {toast}
        </div>
      )}
    </div>
  )
}
