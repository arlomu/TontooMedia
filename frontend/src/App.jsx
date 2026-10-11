import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import { apiMe, getToken, setToken } from './lib/api.js'
import AppLayout from './components/AppLayout.jsx'
import Start from './pages/app/Start.jsx'
import Shorts from './pages/app/Shorts.jsx'
import Followed from './pages/app/Followed.jsx'
import Studio from './pages/app/Studio.jsx'
import Einstellungen from './pages/app/Einstellungen.jsx'
import Community from './pages/app/Community.jsx'
import Post from './pages/app/Post.jsx'
import User from './pages/app/User.jsx'

// Routen mit der App-Sidebar (statt Landing-Navbar/Footer)
const APP_ROUTES = ['/app', '/shorts', '/followed', '/studio', '/einstellungen']
const isAppRoute = (path) =>
  APP_ROUTES.includes(path) || path.startsWith('/shorts/') || path.startsWith('/t/') || path.startsWith('/u/')

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [spinning, setSpinning] = useState(false)
  // Echter eingeloggter User (null = ausgeloggt / noch lädt: undefined)
  const [user, setUser] = useState(undefined)
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

  // Session beim Start wiederherstellen (echtes Backend)
  useEffect(() => {
    if (!getToken()) {
      setUser(null)
      return
    }
    apiMe().then(setUser).catch(() => {
      setToken(null)
      setUser(null)
    })
  }, [])

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
      {/* Globaler Hintergrund: Schwarz + orangene Wellen unten (überall sichtbar) */}
      <div className="app-waves" aria-hidden="true">
        <svg viewBox="0 0 1440 400" preserveAspectRatio="none">
          <path d="M-60 165 C37 165 134 158 264 158 C315 158 377 150 423 150 C542 150 645 135 754 135 C893 135 983 175 1086 175 C1180 175 1194 162 1310 162 C1372 162 1398 194 1497 194 V400 H-60Z" fill="#F5B301" fillOpacity="0.18" />
          <path d="M-60 267 C114 267 42 252 216 252 C285 252 317 229 377 229 C449 229 503 243 557 243 C673 243 752 232 899 232 C958 232 975 202 1095 202 C1178 202 1152 196 1246 196 C1291 196 1330 174 1425 174 V400 H-60Z" fill="#F5B301" fillOpacity="0.34" />
          <path d="M-60 283 C72 283 93 270 279 270 C337 270 355 278 495 278 C577 278 662 314 744 314 C857 314 837 307 942 307 C1013 307 1033 301 1094 301 C1256 301 1275 317 1412 317 V400 H-60Z" fill="#F5B301" fillOpacity="0.64" />
        </svg>
      </div>
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

            {/* Login / Registrieren direkt auf dem Navbar-Hintergrund (keine Suche auf /, /login, /register) */}
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

      <main className={isApp ? 'app-wrap' : undefined}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login onAuth={setUser} />} />
          <Route path="/register" element={<Register onAuth={setUser} />} />
          {/* Flache App-Routen, alle mit derselben Sidebar */}
          <Route element={<AppLayout showToast={showToast} onSearch={handleSearch} />}>
            <Route path="/app" element={<Start />} />
            <Route path="/shorts/:id?" element={<Shorts showToast={showToast} />} />
            <Route path="/followed" element={<Followed showToast={showToast} />} />
            <Route path="/studio" element={<Studio showToast={showToast} />} />
            <Route path="/einstellungen" element={<Einstellungen showToast={showToast} user={user} onUser={setUser} />} />
            <Route path="/t/:name" element={<Community />} />
            <Route path="/t/:name/post/:postId" element={<Post />} />
            <Route path="/u/:user" element={<User showToast={showToast} me={user} />} />
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
