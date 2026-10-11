import { useEffect, useRef, useState } from 'react'

const MENU_ITEMS = [
  { id: 'feed', label: 'Feed', desc: 'Neueste Beiträge', icon: 'fa-newspaper', color: 'ic-yellow' },
  { id: 'communities', label: 'Communities', desc: 'Gruppen entdecken', icon: 'fa-users', color: 'ic-teal' },
  { id: 'messages', label: 'Messages', desc: 'Chats & DMs', icon: 'fa-comments', color: 'ic-violet' },
  { id: 'events', label: 'Events', desc: 'Treffen & Streams', icon: 'fa-calendar-days', color: 'ic-teal' },
  { id: 'fotos', label: 'Fotos', desc: 'Bilder entdecken', icon: 'fa-images', color: 'ic-yellow' },
  { id: 'musik', label: 'Musik', desc: 'Sounds & Playlists', icon: 'fa-music', color: 'ic-violet' },
  { id: 'hilfe', label: 'Hilfe', desc: 'FAQ & Support', icon: 'fa-circle-question', color: 'ic-teal' },
]

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [modal, setModal] = useState(null) // null | 'login' | 'register'
  const [wishName, setWishName] = useState('')
  const [toast, setToast] = useState(null)
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
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Klick außerhalb schließt Dropdown
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
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

  // Easter Egg: Logo 5x klicken → Tontoo sagt hi
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
          </div>
        </section>

        <section id="was-ist" className="section reveal">
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
      </main>

      <footer className="footer">
        <img className="footlogo" src="/icon.png" alt="" />
        <span>© 2026 TontooMedia</span>
      </footer>

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
