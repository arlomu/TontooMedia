import { Link, useParams } from 'react-router-dom'
import { COMMUNITIES, DEMO_POSTS } from './demoData.js'

// Einzelner Post: /t/:name/post/:postId – Ziel der Teilen-Links aus dem Feed.
// Alles Demo, kein Backend.
export default function Post() {
  const { name, postId } = useParams()
  const post = DEMO_POSTS.find((p) => String(p.id) === String(postId))
  const comm = COMMUNITIES.find((c) => c.id === name)

  if (!post) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Nicht gefunden</h2>
        <p className="app-sub">Diesen Beispiel-Post gibt es nicht.</p>
        <Link to={comm ? `/t/${comm.id}` : '/app'} className="btn btn-ghost">
          <i className="fa-solid fa-arrow-left" /> Zurück
        </Link>
      </div>
    )
  }

  const cid = post.commId || COMMUNITIES.find((c) => c.name === post.community)?.id || 'allgemein'

  return (
    <div className="app-page narrow">
      <Link to={comm ? `/t/${comm.id}` : `/t/${cid}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}>
        <i className="fa-solid fa-arrow-left" /> Zurück zu t/{comm ? comm.name : post.community}
      </Link>

      <article className="post start-post">
        <div className="posthead">
          <span className="avatar" aria-hidden="true">
            <i className={`fa-solid ${post.icon} ${post.color}`} />
          </span>
          <div className="postheada">
            <div className="postline">
              <Link to={`/t/${cid}`} className="comm-link">t/{post.community}</Link>
              <span className="dot" aria-hidden="true">·</span>
              <span className="posttime">
                <i className="fa-regular fa-clock" /> {post.time}
              </span>
            </div>
            <div className="postname">
              <Link to={`/u/${post.author}`}>u/{post.author}</Link>
            </div>
          </div>
        </div>

        <h4 className="post-title">{post.title || post.text}</h4>
        {post.title && <p className="posttext">{post.text}</p>}

        <div className="post-toolbar">
          <span className="toolbtn sm static" title="Likes">
            <i className="fa-regular fa-heart" /> {post.likes.toLocaleString('de-DE')}
          </span>
          <span className="toolbtn sm static" title="Kommentare">
            <i className="fa-regular fa-comment" /> {post.comments}
          </span>
        </div>
      </article>
    </div>
  )
}
