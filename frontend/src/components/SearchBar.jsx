import { useState } from 'react'

// Demo-Suche: tippen + X zum Löschen, Lupe löst onSearch aus (kein Backend).
export default function SearchBar({ onSearch, placeholder = 'Suchen …' }) {
  const [q, setQ] = useState('')

  const submit = (e) => {
    e.preventDefault()
    onSearch?.(q)
  }

  return (
    <form className="searchbar" role="search" onSubmit={submit}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="Suchen"
      />
      {q && (
        <button type="button" className="sb-x" aria-label="Suche löschen" onClick={() => setQ('')}>
          <i className="fa-solid fa-xmark" />
        </button>
      )}
    </form>
  )
}
