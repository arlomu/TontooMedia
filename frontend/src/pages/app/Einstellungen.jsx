import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiChangePassword, apiDeleteAccount, apiLogout, apiResetAvatar, apiUpdateMe, apiUploadAvatar, avatarSrc, setToken } from '../../lib/api.js'

const USER_RE = /^[a-z0-9._]{3,20}$/
const BIO_MAX = 160
const DEFAULT_AVATAR = '/assets/Tontoo_Black.png'

// Echter Einstellungs-Tab: Profil kommt vom Backend (Prefill aus dem
// eingeloggten Account, Bio startet leer), speichert automatisch per API.
// Avatar: Standard ist Tontoo_Black, Upload geht echt (max. 1024px).
// Passwortwechsel und Konto-Löschung gehen ebenfalls echt.
export default function Einstellungen({ showToast, user, onUser }) {
  const navigate = useNavigate()
  const toast = (msg) => showToast?.(msg)

  // ---------- Profil (echt, Auto-Save per API) ----------
  const [username, setUsername] = useState(user?.username || '')
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const saveTimer = useRef(null)
  const lastUserId = useRef(user?.id)
  useEffect(() => () => clearTimeout(saveTimer.current), [])

  // Bei neuem Login / frischen User-Daten Felder übernehmen
  useEffect(() => {
    if (user && user.id !== lastUserId.current) {
      lastUserId.current = user.id
      setUsername(user.username || '')
      setName(user.name || '')
      setBio(user.bio || '')
      setSavedAt(null)
    }
  }, [user])

  const userError =
    !username.trim()
      ? 'Bitte einen Username eingeben.'
      : !USER_RE.test(username.trim())
        ? '3–20 Zeichen, nur a–z, 0–9, Punkt und Unterstrich.'
        : null

  // Auto-Save: 700 ms nach der letzten Änderung per PATCH /api/me
  useEffect(() => {
    if (!user || userError) return
    const patch = { name: name.trim(), username: username.trim(), bio: bio.trim() }
    if (patch.name === user.name && patch.username === user.username && patch.bio === (user.bio || '')) return
    setSaving(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const fresh = await apiUpdateMe(patch)
        onUser?.(fresh)
        setSavedAt(Date.now())
      } catch (err) {
        toast(err.message)
      } finally {
        setSaving(false)
      }
    }, 700)
    return () => clearTimeout(saveTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, name, bio])

  const avatarUrl = avatarSrc(user?.avatarUrl) || DEFAULT_AVATAR

  // ---------- Avatar (echt) ----------
  const [avatarOpen, setAvatarOpen] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!avatarOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setAvatarOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [avatarOpen])

  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'))
      reader.readAsDataURL(file)
    })

  const uploadAvatar = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || avatarBusy) return
    setAvatarBusy(true)
    try {
      const fresh = await apiUploadAvatar(await readFile(f))
      onUser?.(fresh)
      toast('Profilbild gespeichert.')
    } catch (err) {
      toast(err.message)
    } finally {
      setAvatarBusy(false)
    }
  }

  const resetAvatar = async () => {
    if (avatarBusy) return
    setAvatarBusy(true)
    try {
      const fresh = await apiResetAvatar()
      onUser?.(fresh)
      toast('Standardbild wiederhergestellt.')
    } catch (err) {
      toast(err.message)
    } finally {
      setAvatarBusy(false)
    }
  }

  // ---------- Passwort (echt) ----------
  const [pwNow, setPwNow] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwAgain, setPwAgain] = useState('')
  const [pwError, setPwError] = useState(null)
  const [pwBusy, setPwBusy] = useState(false)
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

  const changePassword = async (e) => {
    e.preventDefault()
    if (!pwNow) return setPwError('Bitte dein aktuelles Passwort eingeben.')
    if (pwNew.length < 4) return setPwError('Das neue Passwort muss mindestens 4 Zeichen haben.')
    if (pwNew !== pwAgain) return setPwError('Die neuen Passwörter stimmen nicht überein.')
    if (pwNew === pwNow) return setPwError('Das neue Passwort unterscheidet sich nicht vom alten.')
    setPwError(null)
    setPwBusy(true)
    try {
      await apiChangePassword(pwNow, pwNew)
      closePw()
      toast('Passwort geändert.')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwBusy(false)
    }
  }

  // ---------- Konto (echt löschen, Demo war gestern) ----------
  const [delStep, setDelStep] = useState(0) // 0 = Button, 1 = Bestätigung
  const [delName, setDelName] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const delMatch = delName.trim().toLowerCase() === username.trim().toLowerCase() && username.trim() !== ''

  const logout = async () => {
    await apiLogout()
    onUser?.(null)
    navigate('/login')
  }
  const deleteAccount = async () => {
    if (!delMatch || delBusy) return
    setDelBusy(true)
    try {
      await apiDeleteAccount(delName.trim())
      setToken(null)
      onUser?.(null)
      navigate('/')
    } catch (err) {
      toast(err.message)
    } finally {
      setDelBusy(false)
    }
  }

  // Session lädt noch → kurz warten, sonst flackert der Login-Hinweis
  if (user === undefined) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Einstellungen</h2>
        <p className="app-sub">Lädt …</p>
      </div>
    )
  }

  // Noch nicht eingeloggt → Hinweis statt Formular
  if (!user) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Einstellungen</h2>
        <p className="app-sub">Logge dich ein, um dein Profil zu verwalten.</p>
        <Link to="/login" className="btn btn-brand">
          <i className="fa-solid fa-right-to-bracket" /> Zum Login
        </Link>
      </div>
    )
  }

  return (
    <div className="app-page narrow">
      {/* Profil */}
      <section className="set-section">
        <h3 className="set-h3"><i className="fa-solid fa-circle-user ic-yellow" /> Profil</h3>

        <div className="profile-hero">
          <button type="button" className="avatar-btn" onClick={() => setAvatarOpen(true)} aria-label="Profilbild ändern">
            <img src={avatarUrl} alt="Profilbild" />
            <span className="avatar-edit" aria-hidden="true">
              <i className="fa-solid fa-camera" />
            </span>
          </button>
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
            onChange={(e) => setUsername(e.target.value)}
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
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="field">
          <span><i className="fa-solid fa-align-left" /> Bio</span>
          <textarea
            placeholder="Erzähl kurz, wer du bist …"
            value={bio}
            rows={3}
            maxLength={BIO_MAX}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
        <div className="char-row">{bio.length} / {BIO_MAX}</div>

        {saving && (
          <p className="saved-hint">
            <i className="fa-solid fa-circle-notch fa-spin ic-teal" /> Speichert …
          </p>
        )}
        {!saving && savedAt && (
          <p className="saved-hint">
            <i className="fa-solid fa-check ic-teal" /> Automatisch gespeichert
          </p>
        )}
      </section>

      {/* Konto */}
      <section className="set-section">
        <h3 className="set-h3"><i className="fa-solid fa-right-from-bracket ic-teal" /> Konto</h3>

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
          <p className="danger-desc">Löscht Profil, Shorts und Kommentare unwiderruflich.</p>
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
                <button type="button" className="btn btn-danger" disabled={!delMatch || delBusy} onClick={deleteAccount}>
                  <i className="fa-solid fa-trash-can" /> {delBusy ? 'Löscht …' : 'Endgültig löschen'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Profilbild-Modal (echt) */}
      {avatarOpen && (
        <div className="sheet-backdrop" onClick={() => setAvatarOpen(false)}>
          <div className="sheet sheet-narrow" role="dialog" aria-modal="true" aria-label="Profilbild ändern" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <strong className="sheet-title">Profilbild ändern</strong>
            </div>
            <div className="sheet-body">
              <div className="avatar-preview">
                <img src={avatarUrl} alt="Aktuelles Profilbild" />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                aria-hidden="true"
                tabIndex={-1}
                onChange={uploadAvatar}
              />
              <button
                type="button"
                className="btn btn-brand btn-block"
                disabled={avatarBusy}
                onClick={() => fileRef.current?.click()}
              >
                <i className="fa-solid fa-upload" /> {avatarBusy ? 'Lädt …' : 'Eigenes Bild hochladen'}
              </button>
              {user.hasAvatar && (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  disabled={avatarBusy}
                  onClick={resetAvatar}
                >
                  <i className="fa-solid fa-rotate-left" /> Standardbild (Tontoo Black)
                </button>
              )}
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setAvatarOpen(false)}>Abbrechen</button>
              <button type="button" className="btn btn-brand" onClick={() => setAvatarOpen(false)}>Fertig</button>
            </div>
          </div>
        </div>
      )}

      {/* Passwort-Modal (Demo) */}
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
                <button type="submit" className="btn btn-brand" disabled={pwBusy}>
                  <i className="fa-solid fa-key" /> {pwBusy ? 'Moment …' : 'Ändern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
