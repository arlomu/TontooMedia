import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { COMMUNITIES } from '../pages/app/demoData.js'

// Eigene Sidebar-Komponente – 1:1 identisch auf allen App-Routen
// (/app, /shorts, /studio, /einstellungen, /t/:name, /u/:user).
export default function Sidebar({ open, onClose, showToast }) {
  const [commsOpen, setCommsOpen] = useState(true)

  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Seitenleiste">
      <Link to="/app" className="side-brand" onClick={onClose}>
        <img src="/assets/Tontoo_White.png" alt="Tontoo Oktopus" />
        <span className="side-brandtext">
          <strong>Tontoo</strong>
          <small>Media</small>
        </span>
      </Link>

      <nav className="side-nav" aria-label="Hauptbereich">
        <NavLink to="/app" end className={({ isActive }) => `side-item${isActive ? ' active' : ''}`} onClick={onClose}>
          <i className="fa-solid fa-house" /> Startseite
        </NavLink>
        <NavLink to="/shorts" className={({ isActive }) => `side-item${isActive ? ' active' : ''}`} onClick={onClose}>
          <i className="fa-solid fa-clapperboard" /> Shorts
        </NavLink>
        <NavLink to="/studio" className={({ isActive }) => `side-item${isActive ? ' active' : ''}`} onClick={onClose}>
          <i className="fa-solid fa-video" /> Studio
        </NavLink>
      </nav>

      <div className="side-comms">
        <div className="comms-head">
          <button type="button" className="comms-toggle" onClick={() => setCommsOpen((o) => !o)} aria-expanded={commsOpen}>
            <i className={`fa-solid fa-chevron-down caret${commsOpen ? ' flip' : ''}`} />
            Communities
          </button>
          <button
            type="button"
            className="iconbtn sm comms-add"
            aria-label="Community erstellen"
            title="Community erstellen"
            onClick={() => showToast('Communities erstellen kommt bald (Beispiel).')}
          >
            <i className="fa-solid fa-plus" />
          </button>
        </div>
        {commsOpen && (
          <nav className="comms-list" aria-label="Communities">
            {COMMUNITIES.map((c) => (
              <NavLink
                key={c.id}
                to={`/t/${c.id}`}
                className={({ isActive }) => `side-item comm${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                <span className="comm-ic">
                  <i className={`fa-solid ${c.icon} ${c.color}`} />
                </span>
                {c.name}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      <div className="side-foot">
        <NavLink to="/einstellungen" className={({ isActive }) => `side-item${isActive ? ' active' : ''}`} onClick={onClose}>
          <i className="fa-solid fa-gear" /> Einstellungen
        </NavLink>
      </div>
    </aside>
  )
}
