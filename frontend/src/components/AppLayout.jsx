import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import SearchBar from './SearchBar.jsx'

// Layout für alle App-Routen: gleiche Sidebar + Content-Bereich.
// Flache URLs: /app, /shorts, /followed, /studio, /einstellungen, /t/:name, /u/:user.
export default function AppLayout({ showToast, onSearch }) {
  const [sideOpen, setSideOpen] = useState(false)
  const close = () => setSideOpen(false)

  return (
    <div className="app-layout">
      {sideOpen && <div className="side-overlay" onClick={close} aria-hidden="true" />}
      <Sidebar open={sideOpen} onClose={close} showToast={showToast} />
      <div className="app-main">
        <div className="app-topbar">
          <button type="button" className="iconbtn burger" aria-label="Menü öffnen" onClick={() => setSideOpen(true)}>
            <i className="fa-solid fa-bars" />
          </button>
          <div className="app-search">
            <SearchBar onSearch={onSearch} placeholder="Suchen …" />
          </div>
        </div>
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
