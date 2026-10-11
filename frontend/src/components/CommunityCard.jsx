import { useState } from 'react'
import { Link } from 'react-router-dom'

// Sticky Community-Box für die rechte Seitenleiste (Post-Ansicht + t/-Seite):
// Icon + Name, Beschreibung, Folgen-Button, Stats, Regeln.
export default function CommunityCard({ comm, stats = [], showOpenLink = false }) {
  const [followed, setFollowed] = useState(false)

  return (
    <div className="side-card">
      <h4 className="sidecard-title">
        <span className="comm-ic" aria-hidden="true">
          <i className={`fa-solid ${comm.icon} ${comm.color}`} />
        </span>
        t/{comm.name}
      </h4>
      <p className="sidecard-text">{comm.desc}</p>
      <button
        type="button"
        className={`btn authbtn join-btn ${followed ? 'btn-ghost' : 'btn-brand'}`}
        aria-pressed={followed}
        onClick={() => setFollowed((f) => !f)}
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
        <Link to={`/t/${comm.id}`} className="shelf-link rules-link">
          Community öffnen <i className="fa-solid fa-arrow-right" />
        </Link>
      )}
    </div>
  )
}
