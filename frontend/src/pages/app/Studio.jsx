import { DEMO_UPLOADS } from './demoData.js'

export default function Studio({ showToast }) {
  return (
    <div className="app-page">
      <h2 className="app-title">Studio</h2>
      <p className="app-sub">Hier würdest du hochladen – Beispiel-Ansicht, kein Upload.</p>

      <button
        type="button"
        className="dropzone"
        onClick={() => showToast('Upload ist nur ein Beispiel – nichts passiert.')}
      >
        <i className="fa-solid fa-cloud-arrow-up dropic ic-teal" />
        <strong>Dateien hierher ziehen oder klicken</strong>
        <small>MP4, MOV oder PNG – Beispiel, kein echter Upload</small>
      </button>

      <h3 className="app-h3">Deine Uploads (Beispiel)</h3>
      <div className="upload-list">
        {DEMO_UPLOADS.map((u) => (
          <div key={u.id} className="upload-row">
            <span className="avatar">
              <i className={`fa-solid ${u.icon} ${u.color}`} />
            </span>
            <div className="upload-info">
              <strong>{u.title}</strong>
              <small>{u.status} · Aufrufe: {u.views}</small>
            </div>
            <span className="pill">{u.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
