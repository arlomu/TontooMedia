import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Register() {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Bitte einen Namen eingeben.')
    if (!username.trim()) return setError('Bitte einen Username eingeben.')
    if (password.length < 4) return setError('Das Passwort muss mindestens 4 Zeichen haben.')
    setError(null)
    // Basis: keine weiteren Anforderungen, direkt weiter zur App
    navigate('/app')
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

        <button type="submit" className="btn btn-brand btn-lg authbtn">
          <i className="fa-solid fa-user-plus" /> Registrieren
        </button>

        <p className="authswitch">
          Schon dabei? <Link to="/login">Anmelden</Link>
        </p>
      </form>
    </section>
  )
}
