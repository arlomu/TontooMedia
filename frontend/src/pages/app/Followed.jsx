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

function FollowToggle({ label, onUnfollow }) {
  return (
    <button type="button" className="follow-toggle" aria-label={`${label} entfolgen`} onClick={onUnfollow}>
      <span className="ft-on"><i className="fa-solid fa-check" /> Gefolgt</span>
      <span className="ft-off"><i className="fa-solid fa-user-minus" /> Entfolgen</span>
    </button>
  )
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
      <section className="follow-card" aria-label="Gefolgte User">
        <div className="follow-cardhead">
          <span className="comm-ic" aria-hidden="true">
            <i className="fa-solid fa-circle-user ic-yellow" />
          </span>
          <strong>Gefolgte User</strong>
          <span className="pill">{users.length}</span>
        </div>
        {users.length === 0 ? (
          <div className="follow-empty">
            <i className="fa-solid fa-user-plus big" aria-hidden="true" />
            <p>Du folgst noch niemandem.</p>
            <Link to="/app" className="btn btn-brand btn-sm">
              <i className="fa-solid fa-compass" /> Startseite entdecken
            </Link>
          </div>
        ) : (
          <div className="follow-list">
            {users.map((u, i) => (
              <div key={u.author} className="follow-line" style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}>
                <Link to={`/u/${u.author}`} className="follow-link">
                  <span className="comm-ic" aria-hidden="true">
                    <i className={`fa-solid ${u.icon} ${u.color}`} />
                  </span>
                  <span className="follow-main">
                    <strong>u/{u.author}</strong>
                    <small>{infoOf(u.author)}</small>
                  </span>
                  <i className="fa-solid fa-chevron-right follow-go" aria-hidden="true" />
                </Link>
                <FollowToggle label={`u/${u.author}`} onUnfollow={() => unfollowUser(u.author)} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="follow-card" aria-label="Gefolgte Tontoos">
        <div className="follow-cardhead">
          <span className="comm-ic" aria-hidden="true">
            <i className="fa-solid fa-users ic-teal" />
          </span>
          <strong>Gefolgte Tontoos</strong>
          <span className="pill">{tontoos.length}</span>
        </div>
        {tontoos.length === 0 ? (
          <div className="follow-empty">
            <i className="fa-solid fa-users-slash big" aria-hidden="true" />
            <p>Du folgst noch keinem Tontoo.</p>
            <Link to="/app" className="btn btn-brand btn-sm">
              <i className="fa-solid fa-compass" /> Tontoos entdecken
            </Link>
          </div>
        ) : (
          <div className="follow-list">
            {COMMUNITIES.filter((c) => tontoos.includes(c.id)).map((c, i) => (
              <div key={c.id} className="follow-line" style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}>
                <Link to={`/t/${c.id}`} className="follow-link">
                  <span className="comm-ic" aria-hidden="true">
                    <i className={`fa-solid ${c.icon} ${c.color}`} />
                  </span>
                  <span className="follow-main">
                    <strong>t/{c.name}</strong>
                    <small>{c.members} Mitglieder</small>
                  </span>
                  <i className="fa-solid fa-chevron-right follow-go" aria-hidden="true" />
                </Link>
                <FollowToggle label={`t/${c.name}`} onUnfollow={() => unfollowTontoo(c.id)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
