import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CommunityCard from '../../components/CommunityCard.jsx'
import {
  apiGetCommunity,
  apiToggleCommunityFollow,
  apiVisitCommunity,
  getToken,
  mediaSrc,
} from '../../lib/api.js'

const fmt = (n) => Number(n || 0).toLocaleString('de-DE')

// Community-Seite: /t/:name – Hero oben, rechts die sticky Community-Box.
// Alles echt aus der DB (Bild, Mitglieder, Folgen). Posten kommt erst später:
// Der Feed ist noch leer, der Posten-Button sagt das auch.
export default function Community({ showToast }) {
  const { name } = useParams()
  const toast = (msg) => showToast?.(msg)
  const [comm, setComm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setNotFound(false)
    setError('')
    setComm(null)
    apiGetCommunity(name)
      .then((c) => {
        if (!alive) return
        setComm(c)
        // Besuch für die Sidebar-Historie merken (nur eingeloggt).
        if (getToken()) apiVisitCommunity(c.slug)
      })
      .catch((e) => {
        if (!alive) return
        if (/nicht gefunden|404/i.test(e.message || '')) setNotFound(true)
        else setError(e.message || 'Laden fehlgeschlagen.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [name])

  const toggleFollow = async () => {
    try {
      const r = await apiToggleCommunityFollow(comm.slug)
      setComm((c) => (c ? { ...c, followed: !!r.followed, members: r.followers } : c))
      if (r.followed) toast(`t/${comm.slug} gefolgt.`)
      else toast(`t/${comm.slug} entfolgt.`)
    } catch (e) {
      toast(/eingeloggt/i.test(e.message || '') ? 'Bitte zuerst einloggen.' : (e.message || 'Folgen fehlgeschlagen.'))
    }
  }

  if (loading) {
    return (
      <div className="app-page narrow">
        <p className="app-sub"><i className="fa-solid fa-circle-notch fa-spin" /> Wird geladen …</p>
      </div>
    )
  }

  if (notFound || (!comm && !error)) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Nicht gefunden</h2>
        <p className="app-sub">Diese Community gibt es nicht. Erstelle sie über das + in der Seitenleiste.</p>
        <Link to="/app" className="btn btn-ghost">
          <i className="fa-solid fa-arrow-left" /> Zurück zur Startseite
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Fehler</h2>
        <p className="app-sub">{error}</p>
        <Link to="/app" className="btn btn-ghost">
          <i className="fa-solid fa-arrow-left" /> Zurück zur Startseite
        </Link>
      </div>
    )
  }

  const img = comm.imageUrl ? mediaSrc(comm.imageUrl) : null

  return (
    <div className="app-page">
      {/* Hero */}
      <div className="comm-hero-card">
        <span className="comm-big" aria-hidden="true">
          {img ? (
            <img src={img} alt="" />
          ) : (
            <i className="fa-solid fa-users" />
          )}
        </span>
        <div className="comm-hero-main">
          <h2 className="comm-hero-name">t/{comm.name}</h2>
          <p className="comm-hero-meta">
            <i className="fa-solid fa-users" /> {fmt(comm.members)} {comm.members === 1 ? 'Mitglied' : 'Mitglieder'} · Öffentlich
          </p>
          {comm.desc ? <p className="comm-hero-desc">{comm.desc}</p> : null}
        </div>
      </div>

      <div className="start-layout">
        <div className="feed-col">
          <div className="feed-bar split">
            <button type="button" className="btn btn-brand" onClick={() => toast('Posten kommt bald – erst Folgen und stöbern.')}>
              <i className="fa-solid fa-plus" /> Posten
            </button>
          </div>

          <div className="app-feed">
            <div className="follow-empty">
              <i className="fa-solid fa-inbox big" aria-hidden="true" />
              <p>Noch keine Beiträge in t/{comm.name}.</p>
              <p className="app-sub">Posten ist noch nicht möglich – schau bald wieder vorbei.</p>
            </div>
          </div>
        </div>

        {/* Sticky Seitenleiste – identisch zur Post-Ansicht */}
        <aside className="start-side" aria-label="Community">
          <CommunityCard
            comm={comm}
            followed={comm.followed}
            onToggleFollow={toggleFollow}
            stats={[
              { value: fmt(comm.members), label: 'Mitglieder' },
              { value: '–', label: 'Beiträge' },
            ]}
          />
        </aside>
      </div>
    </div>
  )
}
