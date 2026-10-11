import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGetUser, apiToggleFollow, avatarSrc, mediaSrc } from '../../lib/api.js'
import PostBody from '../../components/PostBody.jsx'

const DEFAULT_AVATAR = '/assets/Tontoo_Black.png'
const fmt = (n) => Number(n || 0).toLocaleString('de-DE')

const SORTS = [
  { id: 'new', label: 'Neustes', icon: 'fa-clock' },
  { id: 'old', label: 'Ältestes', icon: 'fa-clock-rotate-left' },
  { id: 'top', label: 'Beliebteste', icon: 'fa-fire' },
]

// Profil: /u/:user – echt per API. 404 wenn es den User nicht gibt.
// Follower + Folgen sind echt, Posts gibt es noch nicht (immer 0),
// Shorts sind die echten öffentlichen Shorts des Users.
export default function User({ showToast, me }) {
  const { user: username } = useParams()
  const [tab, setTab] = useState('posts')
  const [sort, setSort] = useState('new')
  const [status, setStatus] = useState('loading') // loading | ready | missing | error
  const [profile, setProfile] = useState(null)
  const [followBusy, setFollowBusy] = useState(false)
  const [expanded, setExpanded] = useState({})
  const toast = (msg) => showToast?.(msg)

  useEffect(() => {
    let alive = true
    setStatus('loading')
    setProfile(null)
    apiGetUser(username).then(
      (p) => {
        if (!alive) return
        setProfile(p)
        setStatus('ready')
      },
      (err) => {
        if (!alive) return
        setStatus(/nicht gefunden/i.test(err.message || '') ? 'missing' : 'error')
      }
    )
    return () => {
      alive = false
    }
  }, [username])

  if (status === 'loading') {
    return (
      <div className="app-page narrow">
        <p className="feed-hint">Profil lädt …</p>
      </div>
    )
  }

  if (status === 'missing') {
    return (
      <div className="app-page narrow">
        <div className="follow-empty">
          <i className="fa-solid fa-circle-question big" aria-hidden="true" />
          <p>
            <strong>u/{username} gibt es nicht.</strong>
          </p>
          <p>Vielleicht ein Tippfehler? Prüfe den Usernamen.</p>
          <Link to="/app" className="btn btn-brand btn-sm">
            <i className="fa-solid fa-house" /> Zur Startseite
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'error' || !profile) {
    return (
      <div className="app-page narrow">
        <div className="follow-empty">
          <i className="fa-solid fa-triangle-exclamation big" aria-hidden="true" />
          <p>
            <strong>Profil konnte nicht geladen werden.</strong>
          </p>
          <p>Läuft das Backend? Versuch es gleich nochmal.</p>
          <button
            type="button"
            className="btn btn-brand btn-sm"
            onClick={() => {
              setStatus('loading')
              apiGetUser(username).then(
                (p) => {
                  setProfile(p)
                  setStatus('ready')
                },
                (err) => setStatus(/nicht gefunden/i.test(err.message || '') ? 'missing' : 'error')
              )
            }}
          >
            <i className="fa-solid fa-rotate-right" /> Nochmal versuchen
          </button>
        </div>
      </div>
    )
  }

  const u = profile.user
  const shorts = profile.shorts
  const posts = profile.posts || []
  const isOwn = me && me.id === u.id

  const flipFollow = async () => {
    if (followBusy) return
    setFollowBusy(true)
    try {
      const r = await apiToggleFollow(username)
      setProfile((p) => ({ ...p, followed: r.followed, followers: r.followers }))
      toast(r.followed ? `u/${username} gefolgt.` : `u/${username} entfolgt.`)
    } catch (err) {
      toast(err.message)
    } finally {
      setFollowBusy(false)
    }
  }

  // Sortierung: Neustes (neueste zuerst), Ältestes,
  // Beliebteste bei Shorts (1 Like = 3 Views, 2 Kommentare = 1 View),
  // bei Posts ohne Like-Zähler = Neustes.
  const score = (s) =>
    (Number(s.views) || 0) + (Number(s.likes) || 0) * 3 + (Number(s.comments) || 0) * 0.5
  const sortedShorts = [...shorts].sort((a, b) =>
    sort === 'old' ? a.id - b.id : sort === 'top' ? score(b) - score(a) : b.id - a.id
  )
  const sortedPosts = [...posts].sort((a, b) => (sort === 'old' ? a.id - b.id : b.id - a.id))

  return (
    <div className="app-page narrow">
      <div className="profile-head">
        <span className="profile-ava" aria-hidden="true">
          <img
            src={avatarSrc(u.avatarUrl) || DEFAULT_AVATAR}
            alt=""
            onError={(e) => {
              if (!e.currentTarget.dataset.fbk) {
                e.currentTarget.dataset.fbk = '1'
                e.currentTarget.src = DEFAULT_AVATAR
              }
            }}
          />
        </span>
        <div className="profile-id">
          <h2 className="profile-name">{u.name}</h2>
          <p className="profile-sub">
            @{u.username}
            {u.bio ? ` · ${u.bio}` : ''}
          </p>
          <p className="profile-sub">
            {fmt(profile.followers)} Follower · {posts.length}{' '}
            {posts.length === 1 ? 'Beitrag' : 'Beiträge'} · {shorts.length}{' '}
            {shorts.length === 1 ? 'Short' : 'Shorts'}
          </p>
          {/* Folgen: echt per API. Ausgeloggt → zum Login, eigenes Profil → kein Button. */}
          {!isOwn && me !== undefined && !me && (
            <Link to="/login" className="btn btn-sm btn-brand">
              Folgen
            </Link>
          )}
          {!isOwn && me && (
            <button
              type="button"
              className={`btn btn-sm ${profile.followed ? 'btn-ghost' : 'btn-brand'}`}
              aria-pressed={profile.followed}
              disabled={followBusy}
              onClick={flipFollow}
            >
              {profile.followed ? (
                <>
                  <i className="fa-solid fa-check" /> Gefolgt
                </>
              ) : (
                'Folgen'
              )}
            </button>
          )}
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

      <div className="toolbar profile-sort" role="tablist" aria-label="Sortieren">
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={sort === s.id}
            className={`toolbtn${sort === s.id ? ' active' : ''}`}
            onClick={() => setSort(s.id)}
          >
            <i className={`fa-solid ${s.icon}`} /> {s.label}
          </button>
        ))}
      </div>

      {tab === 'posts' ? (
        sortedPosts.length === 0 ? (
          <p className="feed-hint">Noch keine Beiträge von u/{username}.</p>
        ) : (
          <div className="app-feed">
            {sortedPosts.map((p, i) => {
              const imgs = (p.images || []).map(mediaSrc)
              const open = !!expanded[p.id]
              const shown = open ? imgs : imgs.slice(0, 1)
              const detailUrl = `/t/${p.community.slug}/post/${p.id}`
              return (
                <article
                  key={p.id}
                  className="post start-post"
                  style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                >
                  <div className="posthead">
                    <Link
                      to={`/u/${p.author.username}`}
                      className="avatar"
                      aria-label={`Profil von ${p.author.username}`}
                    >
                      {p.author.avatarUrl ? (
                        <img src={avatarSrc(p.author.avatarUrl)} alt="" />
                      ) : (
                        <i className="fa-solid fa-circle-user" />
                      )}
                    </Link>
                    <div className="postheada">
                      <div className="postline">
                        <Link to={`/t/${p.community.slug}`} className="comm-link">
                          t/{p.community.name}
                        </Link>
                        <span className="dot" aria-hidden="true">
                          ·
                        </span>
                        <span className="posttime">
                          <i className="fa-regular fa-clock" /> {p.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link to={detailUrl} className="post-titlelink">
                    <h4 className="post-title">{p.title}</h4>
                  </Link>
                  <PostBody post={{ ...p, images: shown }} detailUrl={detailUrl} />

                  {imgs.length > 1 && (
                    <button
                      type="button"
                      className="toolbtn sm more-imgs"
                      onClick={() => setExpanded((m) => ({ ...m, [p.id]: !m[p.id] }))}
                    >
                      <i className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-images'}`} />
                      {open ? 'Weniger' : `+${imgs.length - 1} mehr`}
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        )
      ) : sortedShorts.length === 0 ? (
        <p className="feed-hint">Noch keine Shorts von u/{username}.</p>
      ) : (
        <div className="profile-shorts">
          {sortedShorts.map((s) => (
            <Link
              key={s.id}
              to={`/shorts/${s.id}`}
              className="short-card"
              aria-label={`Short ${s.title}`}
            >
              <span className="short-thumb">
                {s.thumbUrl ? (
                  <img src={mediaSrc(s.thumbUrl)} alt="" loading="lazy" />
                ) : (
                  <i className="fa-solid fa-clapperboard ic-yellow" aria-hidden="true" />
                )}
                <span className="short-dur">{s.dur}</span>
                <span className="short-play" aria-hidden="true">
                  <i className="fa-solid fa-play" />
                </span>
              </span>
              <span className="short-cardmeta">
                <strong>{s.title}</strong>
                <small>
                  {fmt(s.views)} Aufrufe · {fmt(s.likes)} Likes
                </small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
