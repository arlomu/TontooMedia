import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ComingSoon from './pages/ComingSoon.jsx'

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const toastTimer = useRef(null)
  const eggClicks = useRef([])
  const location = useLocation()
  const isApp = location.pathname === '/app'

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  // Reveal-Animation beim Scrollen (neu pro Route)
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add('visible')),
      { threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [location.pathname])

  // Mobile-Menü beim Routenwechsel schließen
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

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

      {!isApp && (
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
              <Link to="/login" className="btn btn-ghost">
                <i className="fa-solid fa-right-to-bracket" /> Login
              </Link>
              <Link to="/register" className="btn btn-brand">
                <i className="fa-solid fa-user-plus" /> Registrieren
              </Link>
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
                <Link to="/login" className="btn btn-ghost">
                  <i className="fa-solid fa-right-to-bracket" /> Login
                </Link>
                <Link to="/register" className="btn btn-brand">
                  <i className="fa-solid fa-user-plus" /> Registrieren
                </Link>
              </div>
            </nav>
          )}
        </header>
      )}

      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/app" element={<ComingSoon />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isApp && (
        <footer className="footer">
          <img className="footlogo" src="/icon.png" alt="" />
          <span>© 2026 TontooMedia</span>
        </footer>
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
