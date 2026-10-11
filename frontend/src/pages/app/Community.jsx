import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CommunityCard from '../../components/CommunityCard.jsx'
import {
  apiGetCommunity,
  apiMe,
  apiToggleCommunityFollow,
  apiUpdateCommunity,
  apiVisitCommunity,
  getToken,
  mediaSrc,
} from '../../lib/api.js'

const fmt = (n) => Number(n || 0).toLocaleString('de-DE')

// Community-Seite: /t/:name – Hero oben, rechts die sticky Community-Box.
// Alles echt aus der DB (Bild, Mitglieder, Folgen, Regeln). Posten kommt erst später.
// Der Admin (Ersteller) sieht oben im Hero ein Zahnrad und darf dort
// Beschreibung, Regeln und Bild bearbeiten.
export default function Community({ showToast }) {
  const { name } = useParams()
  const toast = (msg) => showToast?.(msg)
  const [comm, setComm] = useState(null)
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  // Admin-Einstellungen
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sDesc, setSDesc] = useState('')
  const [sRules, setSRules] = useState([])
  const [sPic, setSPic] = useState(null) // { url, file } – nur bei Änderung gesetzt
  const [sError, setSError] = useState('')
  const [sBusy, setSBusy] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (getToken()) apiMe().then(setMe).catch(() => setMe(null))
    else setMe(null)
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setNotFound(false)
    setError('')
    setComm(null)
    setSettingsOpen(false)
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

  useEffect(() => {
    if (!settingsOpen) return
    const onKey = (e) => { if (e.key === 'Escape') closeSettings() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen])

  const isAdmin = !!(me && comm && comm.creator && me.username === comm.creator)

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

  const revokePic = (pic) => { if (pic?.url?.startsWith('blob:')) URL.revokeObjectURL(pic.url) }

  const openSettings = () => {
    setSDesc(comm.desc || '')
    setSRules([...(comm.rules || [])])
    revokePic(sPic)
    setSPic(null)
    setSError('')
    setSettingsOpen(true)
  }

  const closeSettings = () => {
    setSettingsOpen(false)
    setSError('')
    revokePic(sPic)
    setSPic(null)
  }

  const pickPic = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    revokePic(sPic)
    setSPic({ url: URL.createObjectURL(f), file: f })
  }

  const setRule = (i, v) => setSRules((list) => list.map((r, j) => (j === i ? v : r)))
  const addRule = () => {
    if (sRules.length >= 5) return
    setSRules((list) => [...list, ''])
  }
  const removeRule = (i) => {
    if (sRules.length <= 1) return
    setSRules((list) => list.filter((_, j) => j !== i))
  }

  const saveSettings = async (e) => {
    e.preventDefault()
    if (sBusy) return
    setSBusy(true)
    setSError('')
    try {
      const fresh = await apiUpdateCommunity({
        slug: comm.slug,
        description: sDesc.trim(),
        rules: sRules,
        imageFile: sPic?.file || null,
      })
      setComm(fresh)
      closeSettings()
      toast('Community gespeichert.')
    } catch (err) {
      setSError(err.message || 'Speichern fehlgeschlagen.')
    } finally {
      setSBusy(false)
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
  const previewImg = sPic ? sPic.url : img

  return (
    <div className="app-page">
      {/* Hero */}
      <div className="comm-hero-card">
        {isAdmin && (
          <button
            type="button"
            className="comm-gear"
            aria-label="Community-Einstellungen"
            title="Community-Einstellungen"
            onClick={openSettings}
          >
            <i className="fa-solid fa-gear" />
          </button>
        )}
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

      {/* Admin-Einstellungen */}
      {settingsOpen && (
        <div className="sheet-backdrop" onClick={closeSettings}>
          <div className="sheet sheet-wide" role="dialog" aria-modal="true" aria-label="Community-Einstellungen" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={saveSettings} noValidate>
              <div className="sheet-head">
                <strong className="sheet-title">t/{comm.name} bearbeiten</strong>
                <button type="button" className="sheet-x" aria-label="Schließen" onClick={closeSettings}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <div className="sheet-body">
                <div className="create-label">Bild</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={pickPic}
                />
                <div className="pic-prev">
                  {previewImg ? <img src={previewImg} alt="Community-Bild" /> : <i className="fa-solid fa-users" />}
                  <span>{sPic ? 'Neues Bild gewählt.' : 'Aktuelles Bild.'}</span>
                  <button type="button" className="comment-btn" onClick={() => fileRef.current?.click()} aria-label="Bild ändern">
                    <i className="fa-solid fa-pen" />
                  </button>
                </div>
                <label className="field nomargin">
                  <span>Beschreibung</span>
                  <textarea
                    placeholder="Worum geht es in deinem Tontoo?"
                    value={sDesc}
                    rows={3}
                    maxLength={280}
                    onChange={(e) => setSDesc(e.target.value)}
                  />
                </label>
                <div className="create-label">Regeln ({sRules.length}/5)</div>
                {sRules.map((r, i) => (
                  <div key={i} className="rule-row">
                    <span className="rule-num" aria-hidden="true">{i + 1}.</span>
                    <input
                      type="text"
                      value={r}
                      maxLength={140}
                      placeholder={`Regel ${i + 1}`}
                      aria-label={`Regel ${i + 1}`}
                      onChange={(e) => setRule(i, e.target.value)}
                    />
                    <button
                      type="button"
                      className="comment-btn"
                      aria-label={`Regel ${i + 1} entfernen`}
                      onClick={() => removeRule(i)}
                      disabled={sRules.length <= 1}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                ))}
                {sRules.length < 5 && (
                  <button type="button" className="btn btn-ghost btn-block" onClick={addRule}>
                    <i className="fa-solid fa-plus" /> Regel hinzufügen
                  </button>
                )}
                {sError && (
                  <p className="formerror nomargin" role="alert">
                    <i className="fa-solid fa-circle-exclamation" /> {sError}
                  </p>
                )}
              </div>
              <div className="sheet-foot">
                <button type="button" className="btn btn-ghost" onClick={closeSettings}>Abbrechen</button>
                <button type="submit" className="btn btn-brand" disabled={sBusy}>
                  {sBusy
                    ? <><i className="fa-solid fa-circle-notch fa-spin" /> Speichern …</>
                    : <><i className="fa-solid fa-check" /> Speichern</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
