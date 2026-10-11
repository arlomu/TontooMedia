import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Suche oben in der App: tippen + Enter/Lupe -> /search?q=...
// Auf /search bleibt das Feld mit der URL synchron (Zurück-Button geht auch).
export default function SearchBar({ onSearch, placeholder = 'Suchen …' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const paramsQ = new URLSearchParams(location.search).get('q') || ''
  const [q, setQ] = useState(location.pathname === '/search' ? paramsQ : '')

  useEffect(() => {
    if (location.pathname === '/search') setQ(paramsQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search])

  const submit = (e) => {
    e.preventDefault()
    const query = q.trim()
    if (onSearch && location.pathname !== '/search') {
      // Fallback für alte Nutzung (kein Toast mehr in der App)
      try { onSearch(query) } catch { /* egal */ }
    }
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  return (
    <form className="searchbar" role="search" onSubmit={submit}>
      <button type="submit" className="sb-go" aria-label="Suchen">
        <i className="fa-solid fa-magnifying-glass" />
      </button>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="Suchen"
        autoComplete="off"
        maxLength={100}
      />
      <button
        type="button"
        className={`sb-x${q ? '' : ' is-hidden'}`}
        aria-label="Suche löschen"
        aria-hidden={!q}
        tabIndex={q ? 0 : -1}
        disabled={!q}
        onClick={() => setQ('')}
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </form>
  )
}
