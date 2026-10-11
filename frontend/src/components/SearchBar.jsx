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
