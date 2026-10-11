import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRegister } from '../lib/api.js'

export default function Register({ onAuth }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Bitte einen Namen eingeben.')
    if (!username.trim()) return setError('Bitte einen Username eingeben.')
    if (password.length < 4) return setError('Das Passwort muss mindestens 4 Zeichen haben.')
    setError(null)
    setBusy(true)
    try {
      const user = await apiRegister(name.trim(), username.trim(), password)
      onAuth?.(user)
      navigate('/app')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="authwrap reveal visible">
      <form className="authcard" onSubmit={submit} noValidate>
        <i className="fa-solid fa-user-plus authic ic-yellow" />
        <h2>Registrieren</h2>
        <p className="authsub">Sichere dir deinen Tontoo-Namen für die Beta.</p>

        <label className="field">
          <span>Name</span>
          <input
            type="text"
            placeholder="z. B. Mia Muster"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="field">
          <span>Username</span>
          <input
            type="text"
            placeholder="z. B. mia.postet"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>Passwort (min. 4 Zeichen, sonst keine Anforderungen)</span>
          <input
            type="password"
            placeholder="Mindestens 4 Zeichen"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        {error && (
          <p className="formerror" role="alert">
            <i className="fa-solid fa-circle-exclamation" /> {error}
          </p>
        )}

        <button type="submit" className="btn btn-brand btn-lg authbtn" disabled={busy}>
          <i className="fa-solid fa-user-plus" /> {busy ? 'Moment …' : 'Registrieren'}
        </button>

        <p className="authswitch">
          Schon dabei? <Link to="/login">Anmelden</Link>
        </p>
      </form>
    </section>
  )
}
