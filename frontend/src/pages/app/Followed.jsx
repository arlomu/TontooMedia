import { Link } from 'react-router-dom'
import { COMMUNITIES, DEMO_POSTS } from './demoData.js'

// Beispiel-Seite: /followed – alles Demo, kein Backend.
export default function Followed() {
  return (
    <div className="app-page">
      <h2 className="app-title">Followed</h2>
      <p className="app-sub">Leute und Communities, denen du folgst – Beispiel-Ansicht.</p>

      <div className="follow-row">
        {COMMUNITIES.map((c) => (
          <Link key={c.id} to={`/t/${c.id}`} className="follow-chip">
            <i className={`fa-solid ${c.icon} ${c.color}`} />
            {c.name}
          </Link>
        ))}
      </div>

      <h3 className="app-h3">Neues aus deinem Followed-Feed (Beispiel)</h3>
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
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
