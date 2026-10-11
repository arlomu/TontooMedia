import { Link, useParams } from 'react-router-dom'
import { DEMO_POSTS } from './demoData.js'

// Beispiel-Profil: /u/:user – alles Demo, kein Backend.
export default function User() {
  const { user } = useParams()
  const posts = DEMO_POSTS.filter((p) => p.author === user)
  const shown = posts.length ? posts : DEMO_POSTS.slice(0, 2)

  return (
    <div className="app-page narrow">
      <div className="user-hero">
        <span className="user-big">
          <i className="fa-solid fa-circle-user ic-yellow" />
        </span>
        <div>
          <h2 className="app-title nomargin">@{user}</h2>
          <p className="app-sub nomargin">
            <i className="fa-solid fa-users" /> 1.024 Follower · Beispiel-Profil
          </p>
        </div>
      </div>
      <p className="comm-desc">Hier steht später die echte Bio – aktuell nur ein Beispiel-Profil.</p>

      <h3 className="app-h3">Beiträge (Beispiel)</h3>
      <div className="app-feed">
        {shown.map((p) => (
          <article key={p.id} className="post">
            <div className="posthead">
              <span className="avatar">
                <i className={`fa-solid ${p.icon} ${p.color}`} />
              </span>
              <div>
                <div className="postname">{p.author}</div>
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

      <Link to="/app" className="btn btn-ghost">
        <i className="fa-solid fa-arrow-left" /> Zurück zur Startseite
      </Link>
    </div>
  )
}
