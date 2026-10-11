import { Link, useParams } from 'react-router-dom'
import { COMMUNITIES, DEMO_POSTS } from './demoData.js'

// Beispiel-Community: /t/:name – alles Demo, kein Backend.
export default function Community() {
  const { name } = useParams()
  const comm = COMMUNITIES.find((c) => c.id === name)

  if (!comm) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Nicht gefunden</h2>
        <p className="app-sub">Diese Beispiel-Community gibt es nicht.</p>
        <Link to="/app" className="btn btn-ghost">
          <i className="fa-solid fa-arrow-left" /> Zurück zur Startseite
        </Link>
      </div>
    )
  }

  const posts = DEMO_POSTS.filter((p) => p.community === comm.name)

  return (
    <div className="app-page">
      <div className="comm-hero">
        <span className="comm-big">
          <i className={`fa-solid ${comm.icon} ${comm.color}`} />
        </span>
        <div>
          <h2 className="app-title nomargin">t/{comm.name}</h2>
          <p className="app-sub nomargin">
            <i className="fa-solid fa-users" /> {comm.members} Mitglieder · Beispiel-Community
          </p>
        </div>
      </div>
      <p className="comm-desc">{comm.desc}</p>

      <h3 className="app-h3">Top-Beiträge (Beispiel)</h3>
      <div className="app-feed">
        {(posts.length ? posts : DEMO_POSTS.slice(0, 2)).map((p) => (
          <article key={p.id} className="post">
            <div className="posthead">
              <span className="avatar">
                <i className={`fa-solid ${p.icon} ${p.color}`} />
              </span>
              <div>
                <div className="postname">{p.author}</div>
                <div className="posttime">
                  <i className="fa-regular fa-clock" /> {p.time}
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
