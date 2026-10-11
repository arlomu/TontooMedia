import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import SearchBar from './components/SearchBar.jsx'
import AppLayout from './components/AppLayout.jsx'
import Start from './pages/app/Start.jsx'
import Shorts from './pages/app/Shorts.jsx'
import Followed from './pages/app/Followed.jsx'
import Studio from './pages/app/Studio.jsx'
import Einstellungen from './pages/app/Einstellungen.jsx'
import Community from './pages/app/Community.jsx'
import User from './pages/app/User.jsx'

// Routen mit der App-Sidebar (statt Landing-Navbar/Footer)
const APP_ROUTES = ['/app', '/shorts', '/followed', '/studio', '/einstellungen']
const isAppRoute = (path) =>
  APP_ROUTES.includes(path) || path.startsWith('/shorts/') || path.startsWith('/t/') || path.startsWith('/u/')

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const toastTimer = useRef(null)
  const eggClicks = useRef([])
  const location = useLocation()
  const isApp = isAppRoute(location.pathname)

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  // Demo-Suche (kein Backend): zeigt nur einen Hinweis-Toast
  const handleSearch = (q) => {
    const query = q.trim()
    showToast(query ? `Suche nach „${query}“ ist noch Demo.` : 'Tippe etwas zum Suchen ein.')
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

            {/* Suche oben in der Mitte (Demo) */}
            <div className="nav-search">
              <SearchBar onSearch={handleSearch} placeholder="Suchen …" />
            </div>

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
              <SearchBar onSearch={(q) => { setMobileOpen(false); handleSearch(q) }} placeholder="Suchen …" />
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

      <main className={isApp ? 'app-wrap' : undefined}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Flache App-Routen, alle mit derselben Sidebar */}
          <Route element={<AppLayout showToast={showToast} onSearch={handleSearch} />}>
            <Route path="/app" element={<Start />} />
            <Route path="/shorts" element={<Shorts showToast={showToast} />} />
            <Route path="/shorts/:id" element={<Shorts showToast={showToast} />} />
            <Route path="/followed" element={<Followed />} />
            <Route path="/studio" element={<Studio showToast={showToast} />} />
            <Route path="/einstellungen" element={<Einstellungen />} />
            <Route path="/t/:name" element={<Community />} />
            <Route path="/u/:user" element={<User />} />
          </Route>
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
