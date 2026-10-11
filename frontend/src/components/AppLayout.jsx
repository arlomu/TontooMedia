import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

// Layout für alle App-Routen: gleiche Sidebar + Content-Bereich.
// Flache URLs: /app, /shorts, /studio, /einstellungen, /t/:name, /u/:user.
export default function AppLayout({ showToast }) {
  const [sideOpen, setSideOpen] = useState(false)
  const close = () => setSideOpen(false)

  return (
    <div className="app-layout">
      {sideOpen && <div className="side-overlay" onClick={close} aria-hidden="true" />}
      <Sidebar open={sideOpen} onClose={close} showToast={showToast} />
      <div className="app-main">
        <div className="app-topbar">
          <button type="button" className="iconbtn" aria-label="Menü öffnen" onClick={() => setSideOpen(true)}>
            <i className="fa-solid fa-bars" />
          </button>
          <span className="app-topbrand">Tontoo <small>Media</small></span>
        </div>
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
