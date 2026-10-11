import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  apiFollowed,
  apiToggleCommunityFollow,
  apiToggleFollow,
  avatarSrc,
  mediaSrc,
} from '../../lib/api.js'

const fmt = (n) => Number(n || 0).toLocaleString('de-DE')

// /followed: gefolgte User + gefolgte Tontoos – beides echt aus der DB.
const infoOf = (u) => {
  const bits = []
  if (u.name && u.name !== u.username) bits.push(u.name)
  bits.push(`${fmt(u.shorts)} ${u.shorts === 1 ? 'Short' : 'Shorts'}`)
  bits.push(`${fmt(u.followers)} ${u.followers === 1 ? 'Follower' : 'Follower'}`)
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
  const [users, setUsers] = useState([])
  const [comms, setComms] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')

  const loadUsers = async () => {
    setUsersLoading(true)
    setUsersError('')
    try {
      const d = await apiFollowed()
      setUsers(d.users)
      setComms(d.communities)
    } catch (e) {
      setUsersError(e.message || 'Laden fehlgeschlagen.')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const unfollowUser = async (username) => {
    try {
      const r = await apiToggleFollow(username)
      if (!r.followed) {
        setUsers((list) => list.filter((u) => u.username !== username))
        toast(`@${username} entfolgt.`)
      }
    } catch (e) {
      toast(e.message || 'Entfolgen fehlgeschlagen.')
    }
  }
  const unfollowTontoo = async (slug) => {
    try {
      const r = await apiToggleCommunityFollow(slug)
      if (!r.followed) {
        setComms((list) => list.filter((c) => c.slug !== slug))
        toast(`t/${slug} entfolgt.`)
      }
    } catch (e) {
      toast(e.message || 'Entfolgen fehlgeschlagen.')
    }
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
        {usersLoading ? (
          <div className="follow-empty">
            <p><i className="fa-solid fa-circle-notch fa-spin" /> Wird geladen …</p>
          </div>
        ) : usersError ? (
          <div className="follow-empty">
            <i className="fa-solid fa-triangle-exclamation big" aria-hidden="true" />
            <p>{/eingeloggt/i.test(usersError) ? 'Bitte zuerst einloggen.' : usersError}</p>
            {/eingeloggt/i.test(usersError) ? (
              <Link to="/login" className="btn btn-brand btn-sm">
                <i className="fa-solid fa-right-to-bracket" /> Zum Login
              </Link>
            ) : (
              <button type="button" className="btn btn-brand btn-sm" onClick={loadUsers}>
                <i className="fa-solid fa-rotate-right" /> Erneut versuchen
              </button>
            )}
          </div>
        ) : users.length === 0 ? (
          <div className="follow-empty">
            <i className="fa-solid fa-user-plus big" aria-hidden="true" />
            <p>Du folgst noch niemandem.</p>
            <Link to="/shorts" className="btn btn-brand btn-sm">
              <i className="fa-solid fa-clapperboard" /> Shorts entdecken
            </Link>
          </div>
        ) : (
          <div className="follow-list">
            {users.map((u, i) => (
              <div key={u.username} className="follow-line" style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}>
                <Link to={`/u/${u.username}`} className="follow-link">
                  <span className="comm-ic follow-ava" aria-hidden="true">
                    {u.avatarUrl
                      ? <img src={avatarSrc(u.avatarUrl)} alt="" />
                      : <i className="fa-solid fa-circle-user" />}
                  </span>
                  <span className="follow-main">
                    <strong>u/{u.username}</strong>
                    <small>{infoOf(u)}</small>
                  </span>
                  <i className="fa-solid fa-chevron-right follow-go" aria-hidden="true" />
                </Link>
                <FollowToggle label={`u/${u.username}`} onUnfollow={() => unfollowUser(u.username)} />
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
          <span className="pill">{comms.length}</span>
        </div>
        {usersLoading || usersError ? null : comms.length === 0 ? (
          <div className="follow-empty">
            <i className="fa-solid fa-users-slash big" aria-hidden="true" />
            <p>Du folgst noch keinem Tontoo.</p>
            <p className="app-sub">Öffne eine Community und tippe auf Folgen.</p>
          </div>
        ) : (
          <div className="follow-list">
            {comms.map((c, i) => (
              <div key={c.slug} className="follow-line" style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}>
                <Link to={`/t/${c.slug}`} className="follow-link">
                  <span className="comm-ic" aria-hidden="true">
                    {c.imageUrl
                      ? <img src={mediaSrc(c.imageUrl)} alt="" />
                      : <i className="fa-solid fa-users" />}
                  </span>
                  <span className="follow-main">
                    <strong>t/{c.name}</strong>
                    <small>{fmt(c.members)} {c.members === 1 ? 'Mitglied' : 'Mitglieder'}</small>
                  </span>
                  <i className="fa-solid fa-chevron-right follow-go" aria-hidden="true" />
                </Link>
                <FollowToggle label={`t/${c.name}`} onUnfollow={() => unfollowTontoo(c.slug)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
