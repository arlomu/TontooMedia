import { useEffect, useRef, useState } from 'react'

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [modal, setModal] = useState(null) // null | 'login' | 'register'
  const [wishName, setWishName] = useState('')
  const [toast, setToast] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const toastTimer = useRef(null)
  const eggClicks = useRef([])

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  // Modal: Escape schließt
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setModal(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
      {/* Hintergrund: Glow wie vor dem Redesign */}
      <div className="bg-glow" aria-hidden="true" />

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

          {/* Login / Registrieren direkt auf dem Navbar-Hintergrund */}
          <div className="nav-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal('login')}>
              <i className="fa-solid fa-right-to-bracket" /> Login
            </button>
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
