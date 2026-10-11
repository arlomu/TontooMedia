import { useState } from 'react'

function Toggle({ label, desc, on, onFlip }) {
  return (
    <button type="button" className="set-row" onClick={onFlip} aria-pressed={on}>
      <span className="set-text">
        <strong>{label}</strong>
        <small>{desc}</small>
      </span>
      <span className={`switch${on ? ' on' : ''}`} aria-hidden="true" />
    </button>
  )
}

export default function Einstellungen() {
  const [dark, setDark] = useState(true)
  const [notifs, setNotifs] = useState(true)
  const [autoplay, setAutoplay] = useState(false)
  const [handle, setHandle] = useState('tontoo.fan')

  return (
    <div className="app-page narrow">
      <h2 className="app-title">Einstellungen</h2>
      <p className="app-sub">Beispiel-Einstellungen – wird live übernommen, kein Speichern nötig.</p>

      <label className="field">
        <span>Anzeigename</span>
        <input type="text" value={handle} onChange={(e) => setHandle(e.target.value)} />
      </label>
      {handle.trim() && (
        <p className="liveprev">
          <i className="fa-solid fa-check ic-teal" /> So sieht <strong>@{handle.trim()}</strong> aus.
        </p>
      )}

      <div className="set-list">
        <Toggle label="Darkmode" desc="Dunkles Design (Beispiel)" on={dark} onFlip={() => setDark((v) => !v)} />
        <Toggle label="Benachrichtigungen" desc="Push bei neuen Beiträgen (Beispiel)" on={notifs} onFlip={() => setNotifs((v) => !v)} />
        <Toggle label="Shorts-Autoplay" desc="Clips automatisch abspielen (Beispiel)" on={autoplay} onFlip={() => setAutoplay((v) => !v)} />
      </div>
    </div>
  )
}
