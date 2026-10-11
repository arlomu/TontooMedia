import { DEMO_SHORTS } from './demoData.js'

export default function Shorts() {
  return (
    <div className="app-page">
      <h2 className="app-title">Shorts</h2>
      <p className="app-sub">Kurze Clips – Beispiel-Raster, keine echten Videos.</p>
      <div className="shorts-grid">
        {DEMO_SHORTS.map((s) => (
          <article key={s.id} className="short-card">
            <div className="short-thumb">
              <i className={`fa-solid ${s.icon} ${s.color}`} />
              <span className="short-dur">{s.dur}</span>
            </div>
            <div className="short-title">{s.title}</div>
            <div className="short-views">
              <i className="fa-regular fa-eye" /> {s.views} Aufrufe
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
