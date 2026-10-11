import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PostBody from '../../components/PostBody.jsx'
import { apiSearch, avatarSrc, mediaSrc } from '../../lib/api.js'

const fmt = (n) => Number(n || 0).toLocaleString('de-DE')

// Globale Suche: /search?q=...
// Durchsucht Short-Titel, Beiträge (Titel/Text), Tontoos und User.
// Bestes Match steht jeweils ganz oben, danach weiter nach unten.
// Mit führendem # wird nur nach Tags gesucht (z. B. #octos).
export default function Search() {
  const [params] = useSearchParams()
  const q = (params.get('q') || '').trim().slice(0, 100)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!q) {
      setResult(null)
      setError('')
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setError('')
    apiSearch(q)
      .then((r) => {
        if (alive) setResult(r)
      })
      .catch((e) => {
        if (alive) setError(e.message || 'Suchen fehlgeschlagen.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [q])

  const shorts = result?.shorts || []
  const posts = result?.posts || []
  const comms = result?.communities || []
  const users = result?.users || []
  const total = shorts.length + posts.length + comms.length + users.length
  const isTag = !!result?.isTag

  return (
    <div className="app-page search-page">
      <h2 className="app-title">
        <i className="fa-solid fa-magnifying-glass ic-yellow" /> Suche
      </h2>
      <p className="app-sub">
        {q
          ? (isTag
              ? <>Tag <strong>#{q.slice(1)}</strong> – {loading ? '…' : `${fmt(total)} Treffer, bestes zuerst.`}</>
              : <>Treffer für <strong>„{q}“</strong> – {loading ? '…' : `${fmt(total)} Treffer, bestes zuerst.`}</>)
          : 'Short-Titel, Beiträge, Tontoos und User durchsuchen. Mit # suchst du nach Tags.'}
      </p>

      {!q && (
        <div className="side-card search-tips">
          <h4 className="sidecard-title">
            <i className="fa-solid fa-lightbulb ic-yellow" /> So geht's
          </h4>
          <p className="sidecard-text">
            Oben tippen + Enter: Titel, Texte, Namen und Beschreibungen werden durchsucht.
          </p>
          <div className="tagrow-show">
            <Link className="tag-pill tag-link" to="/search?q=%23octos">#octos</Link>
            <Link className="tag-pill tag-link" to="/search?q=%23hallo">#hallo</Link>
          </div>
          <p className="sidecard-text nomargin">
            Mit <strong>#tag</strong> findest du gezielt Shorts und Beiträge mit diesem Tag.
          </p>
        </div>
      )}

      {q && loading && (
        <p className="app-sub"><i className="fa-solid fa-circle-notch fa-spin" /> Suche läuft …</p>
      )}

      {q && !loading && error && (
        <div className="follow-empty">
          <i className="fa-solid fa-triangle-exclamation big" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {q && !loading && !error && result && total === 0 && (
        <div className="follow-empty">
          <i className="fa-solid fa-inbox big" aria-hidden="true" />
          <p>Nichts gefunden für „{q}“.</p>
          <p className="app-sub nomargin">
            {isTag ? 'Diesen Tag gibt es noch nicht.' : 'Versuch es mit weniger Wörtern oder mit #tag.'}
          </p>
        </div>
      )}

      {shorts.length > 0 && (
        <section aria-label="Shorts-Treffer">
          <h3 className="app-h3">
            <i className="fa-solid fa-clapperboard ic-yellow" /> Shorts · {fmt(shorts.length)}
          </h3>
          <div className="profile-shorts">
            {shorts.map((s, i) => (
              <Link key={s.id} to={`/shorts/${s.id}`} className="short-card" aria-label={`Short ${s.title}`}>
                <span className="short-thumb">
                  {s.thumbUrl ? (
                    <img src={mediaSrc(s.thumbUrl)} alt="" loading="lazy" />
                  ) : (
                    <i className="fa-solid fa-clapperboard" aria-hidden="true" />
                  )}
                  <span className="short-dur">{s.dur}</span>
                  {i === 0 && <span className="search-top">Top</span>}
                  <span className="short-play" aria-hidden="true">
                    <i className="fa-solid fa-play" />
                  </span>
                </span>
                <span className="short-cardmeta">
                  <strong>{s.title}</strong>
                  <small>@{s.author?.username} · {fmt(s.likes)} Likes</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section aria-label="Beitrags-Treffer">
          <h3 className="app-h3">
            <i className="fa-solid fa-file-lines ic-teal" /> Beiträge · {fmt(posts.length)}
          </h3>
          <div className="app-feed">
            {posts.map((p, i) => {
              const detailUrl = `/t/${p.community?.slug}/post/${p.id}`
              return (
                <article key={p.id} className="post">
                  <div className="posthead">
                    <Link to={`/u/${p.author?.username}`} className="avatar" aria-label={`Profil von ${p.author?.username}`}>
                      {p.author?.avatarUrl
                        ? <img src={avatarSrc(p.author.avatarUrl)} alt="" />
                        : <i className="fa-solid fa-circle-user" />}
                    </Link>
                    <div className="postheada">
                      <div className="postline">
                        <Link to={`/t/${p.community?.slug}`} className="comm-link">t/{p.community?.name}</Link>
                        <span className="dot" aria-hidden="true">·</span>
                        <span className="posttime">
                          <i className="fa-regular fa-clock" /> {p.date}
                        </span>
                        {i === 0 && <span className="pill live">Top-Treffer</span>}
                      </div>
                      <div className="postname">
                        <Link to={`/u/${p.author?.username}`}>u/{p.author?.username}</Link>
                      </div>
                    </div>
                  </div>
                  <Link to={detailUrl} className="post-titlelink">
                    <h4 className="post-title">{p.title}</h4>
                  </Link>
                  <PostBody post={{ ...p, images: [] }} detailUrl={detailUrl} />
                  <div className="postmeta search-meta">
                    <span><i className="fa-regular fa-heart" /> {fmt(p.likes)}</span>
                    <span><i className="fa-regular fa-comment" /> {fmt(p.comments)}</span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {comms.length > 0 && (
        <section aria-label="Tontoo-Treffer">
          <h3 className="app-h3">
            <i className="fa-solid fa-users ic-teal" /> Tontoos · {fmt(comms.length)}
          </h3>
          <div className="trend-list search-list">
            {comms.map((c) => (
              <Link key={c.slug} to={`/t/${c.slug}`} className="trend-row">
                <span className="comm-ic" aria-hidden="true">
                  {c.imageUrl ? (
                    <img src={mediaSrc(c.imageUrl)} alt="" />
                  ) : (
                    <i className="fa-solid fa-users" />
                  )}
                </span>
                <span className="trend-main">
                  <strong>t/{c.name}</strong>
                  <small>{fmt(c.members)} Mitglieder</small>
                </span>
                <i className="fa-solid fa-chevron-right trend-go" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {users.length > 0 && (
        <section aria-label="User-Treffer">
          <h3 className="app-h3">
            <i className="fa-solid fa-circle-user ic-violet" /> User · {fmt(users.length)}
          </h3>
          <div className="follow-list search-list">
            {users.map((u) => (
              <div key={u.username} className="follow-line">
                <Link to={`/u/${u.username}`} className="follow-link">
                  <span className="comm-ic" aria-hidden="true">
                    {u.avatarUrl ? (
                      <img src={avatarSrc(u.avatarUrl)} alt="" />
                    ) : (
                      <i className="fa-solid fa-circle-user" />
                    )}
                  </span>
                  <span className="follow-main">
                    <strong>u/{u.username}</strong>
                    <small>{u.name}{u.bio ? ` · ${u.bio.slice(0, 60)}` : ''} · {fmt(u.followers)} Follower</small>
                  </span>
                  <i className="fa-solid fa-chevron-right follow-go" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
