import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const USER_RE = /^[a-z0-9._]{3,20}$/
const BIO_MAX = 160

export default function Einstellungen({ showToast }) {
  const navigate = useNavigate()
  const toast = (msg) => showToast?.(msg)

  // ---------- Profil (wird automatisch übernommen, kein Speichern nötig) ----------
  const [username, setUsername] = useState('tontoo.fan')
  const [name, setName] = useState('Tontoo Fan')
  const [bio, setBio] = useState('Tontoo-Fan der ersten Stunde.')
  const [savedAt, setSavedAt] = useState(null)
  const saveTimer = useRef(null)
  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const touchSaved = () => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSavedAt(Date.now()), 700)
  }

  const userError =
    !username.trim()
      ? 'Bitte einen Username eingeben.'
      : !USER_RE.test(username.trim())
        ? '3–20 Zeichen, nur a–z, 0–9, Punkt und Unterstrich.'
        : null

  // ---------- Passwort ----------
  const [pwNow, setPwNow] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwAgain, setPwAgain] = useState('')
  const [pwError, setPwError] = useState(null)
  const [pwOpen, setPwOpen] = useState(false)

  const closePw = () => {
    setPwOpen(false)
    setPwError(null)
    setPwNow('')
    setPwNew('')
    setPwAgain('')
  }

  useEffect(() => {
    if (!pwOpen) return
    const onKey = (e) => { if (e.key === 'Escape') closePw() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pwOpen])

  const changePassword = (e) => {
    e.preventDefault()
    if (!pwNow) return setPwError('Bitte dein aktuelles Passwort eingeben.')
    if (pwNew.length < 4) return setPwError('Das neue Passwort muss mindestens 4 Zeichen haben.')
    if (pwNew !== pwAgain) return setPwError('Die neuen Passwörter stimmen nicht überein.')
    if (pwNew === pwNow) return setPwError('Das neue Passwort unterscheidet sich nicht vom alten.')
    closePw()
    toast('Passwort geändert (Beispiel).')
  }

  // ---------- Konto ----------
  const [delStep, setDelStep] = useState(0) // 0 = Button, 1 = Bestätigung
  const [delName, setDelName] = useState('')
  const delMatch = delName.trim().toLowerCase() === username.trim().toLowerCase() && username.trim() !== ''

  const logout = () => {
    toast('Abgemeldet (Beispiel).')
    navigate('/login')
  }
  const deleteAccount = () => {
    toast('Konto gelöscht (Beispiel).')
    navigate('/')
  }

  return (
    <div className="app-page narrow">
      <h2 className="app-title">Einstellungen</h2>
      <p className="app-sub">Dein Profil, deine Sicherheit, dein Konto.</p>

      {/* Profil */}
      <section className="set-section">
        <h3 className="set-h3"><i className="fa-solid fa-circle-user ic-yellow" /> Profil</h3>
        <p className="set-desc">Wird automatisch übernommen – kein Speichern nötig.</p>

        <div className="profile-hero">
          <span className="avatar-xl" aria-hidden="true">
            <i className="fa-solid fa-circle-user" />
          </span>
          <span className="profile-prev">
            <strong>{name.trim() || 'Dein Name'}</strong>
            <small>@{username.trim() || 'username'}</small>
            {bio.trim() && <p>{bio.trim()}</p>}
          </span>
        </div>

        <label className="field">
          <span><i className="fa-solid fa-at" /> Username</span>
          <input
            type="text"
            placeholder="z. B. tontoo.fan"
            value={username}
            autoComplete="username"
            maxLength={20}
            onChange={(e) => { setUsername(e.target.value); touchSaved() }}
            aria-invalid={!!userError}
          />
        </label>
        {userError && (
          <p className="formerror" role="alert">
            <i className="fa-solid fa-circle-exclamation" /> {userError}
          </p>
        )}

        <label className="field">
          <span><i className="fa-solid fa-signature" /> Name</span>
          <input
            type="text"
            placeholder="z. B. Tontoo Fan"
            value={name}
            autoComplete="name"
            maxLength={40}
            onChange={(e) => { setName(e.target.value); touchSaved() }}
          />
        </label>

        <label className="field">
          <span><i className="fa-solid fa-align-left" /> Bio</span>
          <textarea
            placeholder="Erzähl kurz, wer du bist …"
            value={bio}
            rows={3}
            maxLength={BIO_MAX}
            onChange={(e) => { setBio(e.target.value); touchSaved() }}
          />
        </label>
        <div className="char-row">{bio.length} / {BIO_MAX}</div>

        {savedAt && (
          <p className="saved-hint">
            <i className="fa-solid fa-check ic-teal" /> Automatisch gespeichert
          </p>
        )}
      </section>

      {/* Konto */}
      <section className="set-section">
        <h3 className="set-h3"><i className="fa-solid fa-right-from-bracket ic-teal" /> Konto</h3>
        <p className="set-desc">Passwort, Abmeldung und Löschung an einem Ort.</p>

        <div className="konto-stack">
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setPwOpen(true)}>
            <i className="fa-solid fa-key" /> Passwort ändern
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={logout}>
            <i className="fa-solid fa-right-from-bracket" /> Abmelden
          </button>
        </div>

        <div className="danger-box">
          <strong className="danger-title"><i className="fa-solid fa-triangle-exclamation" /> Konto löschen</strong>
          <p className="danger-desc">Löscht Profil, Shorts und Kommentare unwiderruflich (Beispiel).</p>
          {delStep === 0 ? (
            <button type="button" className="btn btn-danger btn-block" onClick={() => setDelStep(1)}>
              <i className="fa-solid fa-trash-can" /> Konto löschen …
            </button>
          ) : (
            <div className="del-confirm">
              <label className="field nomargin">
                <span>Zum Bestätigen deinen Username eingeben (@{username.trim() || 'username'})</span>
                <input
                  type="text"
                  placeholder={username.trim() || 'username'}
                  value={delName}
                  autoComplete="off"
                  onChange={(e) => setDelName(e.target.value)}
                />
              </label>
              <div className="del-row">
                <button type="button" className="btn btn-ghost" onClick={() => { setDelStep(0); setDelName('') }}>
                  Doch nicht
                </button>
                <button type="button" className="btn btn-danger" disabled={!delMatch} onClick={deleteAccount}>
                  <i className="fa-solid fa-trash-can" /> Endgültig löschen
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Passwort-Modal */}
      {pwOpen && (
        <div className="sheet-backdrop" onClick={closePw}>
          <div className="sheet sheet-narrow" role="dialog" aria-modal="true" aria-label="Passwort ändern" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={changePassword} noValidate>
              <div className="sheet-head">
                <strong className="sheet-title">Passwort ändern</strong>
              </div>
              <div className="sheet-body">
                <label className="field nomargin">
                  <span>Aktuelles Passwort</span>
                  <input
                    type="password"
                    placeholder="Aktuelles Passwort"
                    value={pwNow}
                    autoComplete="current-password"
                    onChange={(e) => setPwNow(e.target.value)}
                  />
                </label>
                <label className="field nomargin">
                  <span>Neues Passwort</span>
                  <input
                    type="password"
                    placeholder="Mindestens 4 Zeichen"
                    value={pwNew}
                    autoComplete="new-password"
                    onChange={(e) => setPwNew(e.target.value)}
                  />
                </label>
                <label className="field nomargin">
                  <span>Neues Passwort wiederholen</span>
                  <input
                    type="password"
                    placeholder="Nochmal eingeben"
                    value={pwAgain}
                    autoComplete="new-password"
                    onChange={(e) => setPwAgain(e.target.value)}
                  />
                </label>
                {pwError && (
                  <p className="formerror nomargin" role="alert">
                    <i className="fa-solid fa-circle-exclamation" /> {pwError}
                  </p>
                )}
              </div>
              <div className="sheet-foot">
                <button type="button" className="btn btn-ghost" onClick={closePw}>Abbrechen</button>
                <button type="submit" className="btn btn-brand"><i className="fa-solid fa-key" /> Ändern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
