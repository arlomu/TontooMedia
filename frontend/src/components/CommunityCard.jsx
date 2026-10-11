import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mediaSrc } from '../lib/api.js'

// Sticky Community-Box für die rechte Seitenleiste (Post-Ansicht + t/-Seite):
// Icon/Bild + Name, Beschreibung, Folgen-Button, Stats, Regeln.
// Mit onToggleFollow gesteuert (echt), sonst lokaler Demo-State.
export default function CommunityCard({
  comm,
  stats = [],
  showOpenLink = false,
  followed: followedProp,
  onToggleFollow,
}) {
  const [demoFollowed, setDemoFollowed] = useState(false)
  const [busy, setBusy] = useState(false)
  const controlled = typeof onToggleFollow === 'function'
  const followed = controlled ? !!followedProp : demoFollowed

  const slug = comm.slug || comm.id
  const img = comm.imageUrl ? mediaSrc(comm.imageUrl) : (comm.pic || null)

  const onFollow = async () => {
    if (!controlled) {
      setDemoFollowed((f) => !f)
      return
    }
    if (busy) return
    setBusy(true)
    try {
      await onToggleFollow()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="side-card">
      <h4 className="sidecard-title">
        <span className="comm-ic" aria-hidden="true">
          {img ? (
            <img src={img} alt="" />
          ) : (
            <i className={`fa-solid ${comm.icon || 'fa-users'} ${comm.color || ''}`} />
          )}
        </span>
        t/{comm.name}
      </h4>
      {comm.desc ? <p className="sidecard-text">{comm.desc}</p> : null}
      <button
        type="button"
        className={`btn authbtn join-btn ${followed ? 'btn-ghost' : 'btn-brand'}`}
        aria-pressed={followed}
        onClick={onFollow}
        disabled={busy}
      >
        {followed ? (
          <><i className="fa-solid fa-check" /> Gefolgt</>
        ) : (
          <><i className="fa-solid fa-plus" /> Folgen</>
        )}
      </button>
      {stats.length > 0 && (
        <div className="comm-stats">
          {stats.map((s) => (
            <span key={s.label}><strong>{s.value}</strong><small>{s.label}</small></span>
          ))}
        </div>
      )}
      <h5 className="rules-head">Regeln</h5>
      <ol className="rules-list">
        <li>Bleib freundlich – kein Hate, kein Spam.</li>
        <li>Nur eigene Inhalte oder mit Quelle.</li>
        <li>Titel müssen zum Inhalt passen.</li>
      </ol>
      {showOpenLink && (
        <Link to={`/t/${slug}`} className="shelf-link rules-link">
          Community öffnen <i className="fa-solid fa-arrow-right" />
        </Link>
      )}
    </div>
  )
}
