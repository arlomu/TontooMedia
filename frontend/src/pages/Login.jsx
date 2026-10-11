import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiLogin } from '../lib/api.js'

export default function Login({ onAuth }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return setError('Bitte Username und Passwort eingeben.')
    setError(null)
    setBusy(true)
    try {
      const user = await apiLogin(username.trim(), password)
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
        <i className="fa-solid fa-right-to-bracket authic ic-teal" />
        <h2>Login</h2>
        <p className="authsub">Willkommen zurück bei TontooMedia.</p>

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
          <span>Passwort</span>
          <input
            type="password"
            placeholder="Dein Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p className="formerror" role="alert">
            <i className="fa-solid fa-circle-exclamation" /> {error}
          </p>
        )}

        <button type="submit" className="btn btn-brand btn-lg authbtn" disabled={busy}>
          <i className="fa-solid fa-right-to-bracket" /> {busy ? 'Moment …' : 'Anmelden'}
        </button>

        <p className="authswitch">
          Noch kein Konto? <Link to="/register">Registrieren</Link>
        </p>
      </form>
    </section>
  )
}
