import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  apiCreateCommunity,
  apiRecentCommunities,
  getToken,
  mediaSrc,
} from '../lib/api.js'

// Eigene Sidebar-Komponente – 1:1 identisch auf allen App-Routen
// (/app, /shorts, /studio, /einstellungen, /t/:name, /u/:user).
// Communities sind echt (DB): Die Liste zeigt die letzten 5 geöffneten,
// Erstellen geht über das +-Modal (mit Login + Bild).
export default function Sidebar({ open, onClose, showToast }) {
  const [commsOpen, setCommsOpen] = useState(true)
  const [recent, setRecent] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [cName, setCName] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cPic, setCPic] = useState(null) // { url, file }
  const [cError, setCError] = useState(null)
  const [cBusy, setCBusy] = useState(false)
  const fileRef = useRef(null)
  const loc = useLocation()
  const navigate = useNavigate()

  const cId = cName.trim().toLowerCase().replace(/[^a-z0-9._]/g, '')

  const loggedIn = () => !!getToken()

  const loadRecent = async () => {
    if (!loggedIn()) {
      setRecent([])
      return
    }
    setRecent(await apiRecentCommunities())
  }

  // Historie bei jedem Seitenwechsel auffrischen (Besuche landen in der DB).
  useEffect(() => {
    loadRecent()
  }, [loc.pathname])

  const revokePic = (pic) => { if (pic?.url?.startsWith('blob:')) URL.revokeObjectURL(pic.url) }

  const closeCreate = () => {
    setCreateOpen(false)
    setCError(null)
    revokePic(cPic)
    setCPic(null)
  }

  useEffect(() => {
    if (!createOpen) return
    const onKey = (e) => { if (e.key === 'Escape') closeCreate() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [createOpen])

  const openCreate = () => {
    if (!loggedIn()) {
      showToast?.('Bitte zuerst einloggen.')
      return
    }
    setCreateOpen(true)
  }

  const createTontoo = async (e) => {
    e.preventDefault()
    if (cBusy) return
    if (!cName.trim()) return setCError('Bitte einen Namen eingeben.')
    if (!cId) return setCError('Der Name muss a–z, 0–9, Punkt oder Unterstrich enthalten.')
    if (!cPic) return setCError('Bitte lade ein Bild für deinen Tontoo hoch.')
    setCBusy(true)
    setCError(null)
    try {
      const comm = await apiCreateCommunity({
        name: cName.trim(),
        description: cDesc.trim(),
        imageFile: cPic.file,
      })
      closeCreate()
      setCName('')
      setCDesc('')
      await loadRecent()
      onClose?.()
      navigate(`/t/${comm.slug}`)
      showToast?.(`t/${comm.slug} erstellt.`)
    } catch (err) {
      setCError(err.message || 'Erstellen fehlgeschlagen.')
    } finally {
      setCBusy(false)
    }
  }

  const uploadPic = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    revokePic(cPic)
    setCPic({ url: URL.createObjectURL(f), file: f })
  }

  const removePic = () => {
    revokePic(cPic)
    setCPic(null)
  }

  return (
    <>
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
        <NavLink to="/followed" className={({ isActive }) => `side-item${isActive ? ' active' : ''}`} onClick={onClose}>
          <i className="fa-solid fa-heart" /> Followed
        </NavLink>
      </nav>

      <div className="side-spacer" aria-hidden="true" />

      <div className="side-comms">
        <div className="comms-head">
          <button type="button" className="comms-toggle" onClick={() => setCommsOpen((o) => !o)} aria-expanded={commsOpen}>
            <i className={`fa-solid fa-chevron-down caret${commsOpen ? ' flip' : ''}`} />
            Communities
          </button>
          <button
            type="button"
            className="iconbtn sm comms-add"
            aria-label="Tontoo erstellen"
            title="Tontoo erstellen"
            onClick={openCreate}
          >
            <i className="fa-solid fa-plus" />
          </button>
        </div>
          <nav className={`comms-list${commsOpen ? '' : ' closed'}`} aria-label="Communities">
            <div className="comms-clip">
              {recent.map((c) => (
                <NavLink
                  key={c.slug}
                  to={`/t/${c.slug}`}
                  className={({ isActive }) => `side-item comm${isActive ? ' active' : ''}`}
                  onClick={onClose}
                  tabIndex={commsOpen ? 0 : -1}
                >
                  <span className="comm-ic">
                    {c.imageUrl ? (
                      <img className="comm-pic" src={mediaSrc(c.imageUrl)} alt="" />
                    ) : (
                      <i className="fa-solid fa-users" />
                    )}
                  </span>
                  {c.name}
                </NavLink>
              ))}
              {recent.length === 0 && (
                <p className="comms-hint">
                  {loggedIn()
                    ? 'Noch nichts geöffnet – die letzten 5 stehen hier.'
                    : 'Logge dich ein, um Communities zu erstellen und hier zu sehen.'}
                </p>
              )}
            </div>
          </nav>
      </div>

      <div className="side-foot">
        <hr className="side-div" />
        <NavLink to="/studio" className={({ isActive }) => `side-item${isActive ? ' active' : ''}`} onClick={onClose}>
          <i className="fa-solid fa-video" /> Studio
        </NavLink>
        <NavLink to="/einstellungen" className={({ isActive }) => `side-item${isActive ? ' active' : ''}`} onClick={onClose}>
          <i className="fa-solid fa-gear" /> Einstellungen
        </NavLink>
      </div>
    </aside>

    {/* Tontoo erstellen */}
    {createOpen && (
      <div className="sheet-backdrop" onClick={closeCreate}>
        <div className="sheet sheet-wide" role="dialog" aria-modal="true" aria-label="Tontoo erstellen" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={createTontoo} noValidate>
            <div className="sheet-head">
              <strong className="sheet-title">Tontoo erstellen</strong>
              <button type="button" className="sheet-x" aria-label="Schließen" onClick={closeCreate}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="sheet-body">
              <label className="field nomargin">
                <span>Name</span>
                <input
                  type="text"
                  placeholder="z. B. Fahrräder"
                  value={cName}
                  maxLength={32}
                  autoComplete="off"
                  onChange={(e) => setCName(e.target.value)}
                />
              </label>
              {cId && <p className="create-prev">t/{cId}</p>}
              <label className="field nomargin">
                <span>Beschreibung</span>
                <textarea
                  placeholder="Worum geht es in deinem Tontoo?"
                  value={cDesc}
                  rows={3}
                  maxLength={280}
                  onChange={(e) => setCDesc(e.target.value)}
                />
              </label>
              <div className="create-label">Bild</div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                aria-hidden="true"
                tabIndex={-1}
                onChange={uploadPic}
              />
              {cPic ? (
                <div className="pic-prev">
                  <img src={cPic.url} alt="Ausgewähltes Tontoo-Bild" />
                  <span>Bild gewählt.</span>
                  <button type="button" className="comment-btn" onClick={removePic} aria-label="Bild entfernen">
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-ghost btn-block" onClick={() => fileRef.current?.click()}>
                  <i className="fa-solid fa-upload" /> Bild hochladen
                </button>
              )}
              {cError && (
                <p className="formerror nomargin" role="alert">
                  <i className="fa-solid fa-circle-exclamation" /> {cError}
                </p>
              )}
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={closeCreate}>Abbrechen</button>
              <button type="submit" className="btn btn-brand" disabled={cBusy}>
                <i className={`fa-solid ${cBusy ? 'fa-circle-notch fa-spin' : 'fa-plus'}`} /> Erstellen
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}
