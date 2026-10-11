import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { COMMUNITIES } from '../pages/app/demoData.js'
import { addCustomTontoo, getCustomTontoos } from '../pages/app/customTontoos.js'

// Eigene Sidebar-Komponente – 1:1 identisch auf allen App-Routen
// (/app, /shorts, /studio, /einstellungen, /t/:name, /u/:user).
const ICON_PRESETS = [
  'fa-camera', 'fa-gamepad', 'fa-music', 'fa-utensils',
  'fa-microchip', 'fa-book-open', 'fa-film', 'fa-palette',
]

export default function Sidebar({ open, onClose, showToast }) {
  const [commsOpen, setCommsOpen] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [customs, setCustoms] = useState(getCustomTontoos)
  const [cName, setCName] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cIcon, setCIcon] = useState(ICON_PRESETS[0])
  const [cPic, setCPic] = useState(null)
  const [cError, setCError] = useState(null)
  const fileRef = useRef(null)

  const cId = cName.trim().toLowerCase().replace(/[^a-z0-9._]/g, '')

  const revokePic = (src) => { if (src?.startsWith('blob:')) URL.revokeObjectURL(src) }

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

  const createTontoo = (e) => {
    e.preventDefault()
    if (!cName.trim()) return setCError('Bitte einen Namen eingeben.')
    if (!cId) return setCError('Der Name muss a–z, 0–9, Punkt oder Unterstrich enthalten.')
    const taken = [...COMMUNITIES, ...getCustomTontoos()].some((c) => c.id === cId)
    if (taken) return setCError(`t/${cId} gibt es schon.`)
    addCustomTontoo({
      id: cId,
      name: cName.trim(),
      desc: cDesc.trim(),
      icon: cIcon,
      color: '',
      pic: cPic,
      members: '1 Mitglied',
    })
    setCustoms([...getCustomTontoos()])
    setCName('')
    setCDesc('')
    setCIcon(ICON_PRESETS[0])
    setCPic(null)
    setCreateOpen(false)
    setCError(null)
    showToast(`t/${cId} erstellt.`)
  }

  const uploadPic = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    revokePic(cPic)
    setCPic(URL.createObjectURL(f))
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
            onClick={() => setCreateOpen(true)}
          >
            <i className="fa-solid fa-plus" />
          </button>
        </div>
          <nav className={`comms-list${commsOpen ? '' : ' closed'}`} aria-label="Communities">
            <div className="comms-clip">
              {[...COMMUNITIES, ...customs].map((c) => (
                <NavLink
                  key={c.id}
                  to={`/t/${c.id}`}
                  className={({ isActive }) => `side-item comm${isActive ? ' active' : ''}`}
                  onClick={onClose}
                  tabIndex={commsOpen ? 0 : -1}
                >
                  <span className="comm-ic">
                    {c.pic ? (
                      <img className="comm-pic" src={c.pic} alt="" />
                    ) : (
                      <i className={`fa-solid ${c.icon} ${c.color}`} />
                    )}
                  </span>
                  {c.name}
                </NavLink>
              ))}
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
                  maxLength={24}
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
                  maxLength={140}
                  onChange={(e) => setCDesc(e.target.value)}
                />
              </label>
              <div className="create-label">Symbol oder eigenes Bild</div>
              {cPic ? (
                <div className="pic-prev">
                  <img src={cPic} alt="Ausgewähltes Tontoo-Bild" />
                  <span>Bild gewählt – ersetzt das Symbol.</span>
                  <button type="button" className="comment-btn" onClick={removePic} aria-label="Bild entfernen">
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="avatar-grid">
                    {ICON_PRESETS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={`avatar-opt${cIcon === icon ? ' selected' : ''}`}
                        aria-pressed={cIcon === icon}
                        aria-label={icon}
                        onClick={() => setCIcon(icon)}
                      >
                        <i className={`fa-solid ${icon}`} />
                      </button>
                    ))}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={uploadPic}
                  />
                  <button type="button" className="btn btn-ghost btn-block" onClick={() => fileRef.current?.click()}>
                    <i className="fa-solid fa-upload" /> Eigenes Bild hochladen
                  </button>
                </>
              )}
              {cError && (
                <p className="formerror nomargin" role="alert">
                  <i className="fa-solid fa-circle-exclamation" /> {cError}
                </p>
              )}
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={closeCreate}>Abbrechen</button>
              <button type="submit" className="btn btn-brand"><i className="fa-solid fa-plus" /> Erstellen</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}
