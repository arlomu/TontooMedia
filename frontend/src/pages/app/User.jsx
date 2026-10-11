import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { COMMUNITIES, DEMO_POSTS, DEMO_SHORTS } from './demoData.js'

// Profil: /u/:user – Tabs für Posts & Shorts (Demo, alles lokal).
const commIdOf = (p) =>
  p.commId || COMMUNITIES.find((c) => c.name === p.community)?.id

const followersOf = (author) => {
  let h = 0
  for (const ch of author) h = (h * 31 + ch.codePointAt(0)) % 9973
  return 800 + h
}

export default function User({ showToast }) {
  const { user } = useParams()
  const [tab, setTab] = useState('posts')
  const [followed, setFollowed] = useState(false)
  const toast = (msg) => showToast?.(msg)

  const posts = DEMO_POSTS.filter((p) => p.author === user)
  const shorts = DEMO_SHORTS.filter((s) => s.author === user)
  const first = posts[0] || shorts[0] || DEMO_POSTS[0]

  const flipFollow = () => {
    toast(followed ? `u/${user} entfolgt.` : `u/${user} gefolgt.`)
    setFollowed((f) => !f)
  }

  return (
    <div className="app-page narrow">
      <div className="profile-head">
        <span className="profile-ava" aria-hidden="true">
          <i className={`fa-solid ${first.icon} ${first.color}`} />
        </span>
        <div className="profile-id">
          <h2 className="profile-name">u/{user}</h2>
          <p className="profile-sub">
            {followersOf(user).toLocaleString('de-DE')} Follower · {posts.length} {posts.length === 1 ? 'Beitrag' : 'Beiträge'} · {shorts.length} {shorts.length === 1 ? 'Short' : 'Shorts'}
          </p>
          <button
            type="button"
            className={`btn btn-sm ${followed ? 'btn-ghost' : 'btn-brand'}`}
            aria-pressed={followed}
            onClick={flipFollow}
          >
            {followed ? (<><i className="fa-solid fa-check" /> Gefolgt</>) : 'Folgen'}
          </button>
        </div>
      </div>

      <div className="toolbar profile-tabs" role="tablist" aria-label="Profil-Inhalte">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'posts'}
          className={`toolbtn${tab === 'posts' ? ' active' : ''}`}
          onClick={() => setTab('posts')}
        >
          <i className="fa-solid fa-newspaper" /> Posts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'shorts'}
          className={`toolbtn${tab === 'shorts' ? ' active' : ''}`}
          onClick={() => setTab('shorts')}
        >
          <i className="fa-solid fa-clapperboard" /> Shorts
        </button>
      </div>

      {tab === 'posts' ? (
        posts.length === 0 ? (
          <p className="feed-hint">Noch keine Posts von u/{user}.</p>
        ) : (
          <div className="app-feed">
            {posts.map((p) => {
              const cid = commIdOf(p)
              const title = p.title || p.text
              return (
                <article key={p.id} className="post">
                  <div className="posthead">
                    <span className="avatar" aria-hidden="true">
                      <i className={`fa-solid ${p.icon} ${p.color}`} />
                    </span>
                    <div>
                      <div className="postname">t/{p.community}</div>
                      <div className="posttime">
                        <i className="fa-regular fa-clock" /> {p.time}
                      </div>
                    </div>
                  </div>
                  {cid ? (
                    <Link to={`/t/${cid}/post/${p.id}`} className="post-titlelink">
                      <h4 className="post-title">{title}</h4>
                    </Link>
                  ) : (
                    <h4 className="post-title">{title}</h4>
                  )}
                  {p.title && <p className="posttext">{p.text}</p>}
                  <div className="postmeta">
                    <span><i className="fa-regular fa-heart" /> {p.likes}</span>
                    <span><i className="fa-regular fa-comment" /> {p.comments}</span>
                  </div>
                </article>
              )
            })}
          </div>
        )
      ) : shorts.length === 0 ? (
        <p className="feed-hint">Noch keine Shorts von u/{user}.</p>
      ) : (
        <div className="profile-shorts">
          {shorts.map((s) => (
            <Link key={s.id} to={`/shorts/${s.id}`} className="short-card" aria-label={`Short ${s.title}`}>
              <span className="short-thumb">
                <i className={`fa-solid ${s.icon} ${s.color}`} aria-hidden="true" />
                <span className="short-dur">{s.dur}</span>
                <span className="short-play" aria-hidden="true">
                  <i className="fa-solid fa-play" />
                </span>
              </span>
              <span className="short-cardmeta">
                <strong>{s.title}</strong>
                <small>{s.likes} Likes</small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
