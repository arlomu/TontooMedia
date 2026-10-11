import { useState } from 'react'
import { Link } from 'react-router-dom'
import { COMMUNITIES, DEMO_POSTS, DEMO_SHORTS } from './demoData.js'

// /followed: User und Tontoos, denen du folgst (Demo, alles lokal).
const allUsers = () => {
  const map = new Map()
  for (const p of [...DEMO_POSTS, ...DEMO_SHORTS]) {
    if (!map.has(p.author)) map.set(p.author, { author: p.author, icon: p.icon, color: p.color })
  }
  return [...map.values()]
}

const infoOf = (author) => {
  const bits = []
  const np = DEMO_POSTS.filter((p) => p.author === author).length
  const ns = DEMO_SHORTS.filter((s) => s.author === author).length
  if (np) bits.push(`${np} ${np === 1 ? 'Beitrag' : 'Beiträge'}`)
  if (ns) bits.push(`${ns} ${ns === 1 ? 'Short' : 'Shorts'}`)
  return bits.join(' · ')
}

export default function Followed({ showToast }) {
  const toast = (msg) => showToast?.(msg)
  const [users, setUsers] = useState(allUsers)
  const [tontoos, setTontoos] = useState(() => COMMUNITIES.map((c) => c.id))

  const unfollowUser = (author) => {
    setUsers((list) => list.filter((u) => u.author !== author))
    toast(`u/${author} entfolgt.`)
  }
  const unfollowTontoo = (id) => {
    const c = COMMUNITIES.find((x) => x.id === id)
    setTontoos((list) => list.filter((t) => t !== id))
    toast(`t/${c ? c.name : id} entfolgt.`)
  }

  return (
    <div className="app-page">
      <h2 className="app-title">Followed</h2>
      <p className="app-sub">Leute und Tontoos, denen du folgst.</p>

      <h3 className="app-h3">
        <i className="fa-solid fa-circle-user ic-yellow" /> Gefolgte User <span className="pill">{users.length}</span>
      </h3>
      {users.length === 0 ? (
        <p className="feed-hint">Du folgst noch niemandem – stöbere auf der <Link to="/app">Startseite</Link>.</p>
      ) : (
        <div className="trend-list">
          {users.map((u) => (
            <div key={u.author} className="follow-line">
              <Link to={`/u/${u.author}`} className="trend-row">
                <span className="comm-ic" aria-hidden="true">
                  <i className={`fa-solid ${u.icon} ${u.color}`} />
                </span>
                <span className="trend-main">
                  <strong>u/{u.author}</strong>
                  <small>{infoOf(u.author)}</small>
                </span>
              </Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => unfollowUser(u.author)}>
                Entfolgen
              </button>
            </div>
          ))}
        </div>
      )}

      <h3 className="app-h3">
        <i className="fa-solid fa-users ic-teal" /> Gefolgte Tontoos <span className="pill">{tontoos.length}</span>
      </h3>
      {tontoos.length === 0 ? (
        <p className="feed-hint">Du folgst noch keinem Tontoo – entdecke sie auf der <Link to="/app">Startseite</Link>.</p>
      ) : (
        <div className="trend-list">
          {COMMUNITIES.filter((c) => tontoos.includes(c.id)).map((c) => (
            <div key={c.id} className="follow-line">
              <Link to={`/t/${c.id}`} className="trend-row">
                <span className="comm-ic" aria-hidden="true">
                  <i className={`fa-solid ${c.icon} ${c.color}`} />
                </span>
                <span className="trend-main">
                  <strong>t/{c.name}</strong>
                  <small>{c.members} Mitglieder</small>
                </span>
              </Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => unfollowTontoo(c.id)}>
                Entfolgen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
