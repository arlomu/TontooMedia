import { Link } from 'react-router-dom'
import { DEMO_POSTS } from './demoData.js'

export default function Start() {
  return (
    <div className="app-page">
      <h2 className="app-title">Startseite</h2>
      <p className="app-sub">Dein Beispiel-Feed – alles hier ist Demo, nichts ist echt.</p>
      <div className="app-feed">
        {DEMO_POSTS.map((p) => (
          <article key={p.id} className="post">
            <div className="posthead">
              <span className="avatar">
                <i className={`fa-solid ${p.icon} ${p.color}`} />
              </span>
              <div>
                <div className="postname"><Link to={`/u/${p.author}`}>{p.author}</Link></div>
                <div className="posttime">
                  <i className="fa-regular fa-clock" /> {p.time} · {p.community}
                </div>
              </div>
            </div>
            <p className="posttext">{p.text}</p>
            <div className="postmeta">
              <span><i className="fa-regular fa-heart" /> {p.likes}</span>
              <span><i className="fa-regular fa-comment" /> {p.comments}</span>
              <span><i className="fa-solid fa-share-nodes" /> Teilen</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
