import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { COMMUNITIES, DEMO_POSTS, DEMO_SHORTS } from './demoData.js'

const SORTS = [
  { id: 'neu', label: 'Neu', icon: 'fa-clock' },
  { id: 'top', label: 'Top', icon: 'fa-fire' },
  { id: 'diskutiert', label: 'Diskutiert', icon: 'fa-comments' },
]

const commIdOf = (p) =>
  p.commId || COMMUNITIES.find((c) => c.name === p.community)?.id || 'allgemein'

// Teilen-Link im Format t/name/post/id (wie angefordert)
const postUrl = (p) => `${window.location.origin}/t/${commIdOf(p)}/post/${p.id}`

// Aufgeräumte Startseite: oben Shorts als Hochkant-Shelf (9:16),
// darunter Text-Posts aus den Sub-Tontoos (t/…) + rechte Info-Spalte.
export default function Start() {
  const [sort, setSort] = useState('neu')
  const [liked, setLiked] = useState({})
  const [copied, setCopied] = useState(null)
  const [sharePost, setSharePost] = useState(null) // Post im Teilen-Menü (wie bei Shorts)
  const [ctx, setCtx] = useState(null) // { x, y, post } – eigenes Rechtsklick-Menü
  const shelfRef = useRef(null)
  const copyTimer = useRef(null)

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  // Rechtsklick-Menü schließen: Escape, Klick, Scrollen
  useEffect(() => {
    if (!ctx) return
    const close = () => setCtx(null)
    const onKey = (e) => e.key === 'Escape' && setCtx(null)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
    }
  }, [ctx])

  // Escape schließt das Teilen-Menü
  useEffect(() => {
    if (!sharePost) return
    const onKey = (e) => e.key === 'Escape' && setSharePost(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sharePost])

  const filtered = [...DEMO_POSTS].sort((a, b) => {
    if (sort === 'top') return b.likes - a.likes
    if (sort === 'diskutiert') return b.comments - a.comments
    return a.id - b.id
  })

  const shelfScroll = (dir) => {
    shelfRef.current?.scrollBy({ left: dir * 380, behavior: 'smooth' })
  }

  const copyLink = async (p) => {
    const url = postUrl(p)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* Demo: egal */ }
      ta.remove()
    }
    setCopied(p.id)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(null), 1600)
  }

  const openCtx = (e, post) => {
    e.preventDefault()
    e.stopPropagation()
    setCtx({
      x: Math.max(8, Math.min(e.clientX, window.innerWidth - 240)),
      y: Math.max(8, Math.min(e.clientY, window.innerHeight - 240)),
      post,
    })
  }

  const openCtxAtButton = (e, post) => {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    setCtx({
      x: Math.max(8, Math.min(r.left - 190, window.innerWidth - 240)),
      y: Math.max(8, Math.min(r.bottom + 8, window.innerHeight - 240)),
      post,
    })
  }

  return (
    <div className="app-page start-page">
      {/* Shorts: Hochkant-Shelf mit Quer-Scroll */}
      <section className="shelf" aria-label="Shorts">
        <div className="shelf-head">
          <h3 className="shelf-title">
            <i className="fa-solid fa-clapperboard ic-yellow" /> Shorts
          </h3>
          <div className="shelf-actions">
            <Link to={`/shorts/${DEMO_SHORTS[0].id}`} className="shelf-link">
              Alle ansehen <i className="fa-solid fa-arrow-right" />
            </Link>
            <button type="button" className="iconbtn sm" aria-label="Nach links scrollen" onClick={() => shelfScroll(-1)}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button type="button" className="iconbtn sm" aria-label="Nach rechts scrollen" onClick={() => shelfScroll(1)}>
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>
        <div className="shelf-scroll" ref={shelfRef}>
          {DEMO_SHORTS.map((s) => (
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
                <small>@{s.author} · {s.likes} Likes</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="start-layout">
        {/* Text-Feed aus t/… */}
        <div className="feed-col">
          <div className="feed-bar">
            <div className="toolbar" role="tablist" aria-label="Feed sortieren">
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
          </div>

          <div className="app-feed">
            {filtered.map((p, i) => {
              const cid = commIdOf(p)
              const isLiked = !!liked[p.id]
              return (
                <article
                  key={p.id}
                  className="post start-post"
                  style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                  onContextMenu={(e) => openCtx(e, p)}
                >
                  <div className="posthead">
                    <span className="avatar" aria-hidden="true">
                      <i className={`fa-solid ${p.icon} ${p.color}`} />
                    </span>
                    <div className="postheada">
                      <div className="postline">
                        <Link to={`/t/${cid}`} className="comm-link">t/{p.community}</Link>
                        <span className="dot" aria-hidden="true">·</span>
                        <span className="posttime">
                          <i className="fa-regular fa-clock" /> {p.time}
                        </span>
                      </div>
                      <div className="postname">
                        <Link to={`/u/${p.author}`}>u/{p.author}</Link>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="iconbtn sm post-dots"
                      aria-label="Beitrags-Menü öffnen"
                      onClick={(e) => openCtxAtButton(e, p)}
                    >
                      <i className="fa-solid fa-ellipsis" />
                    </button>
                  </div>

                  <Link to={`/t/${cid}/post/${p.id}`} className="post-titlelink">
                    <h4 className="post-title">{p.title || p.text}</h4>
                  </Link>
                  {p.title && (
                    <Link to={`/t/${cid}/post/${p.id}`} className="post-textlink">
                      <p className="posttext">{p.text}</p>
                    </Link>
                  )}

                  <div className="post-toolbar">
                    <button
                      type="button"
                      className={`toolbtn sm${isLiked ? ' active' : ''}`}
                      aria-pressed={isLiked}
                      aria-label="Liken"
                      onClick={() => setLiked((m) => ({ ...m, [p.id]: !m[p.id] }))}
                    >
                      <i className={`${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart`} />
                      {(p.likes + (isLiked ? 1 : 0)).toLocaleString('de-DE')}
                    </button>
                    <Link to={`/t/${cid}/post/${p.id}`} className="toolbtn sm" title="Kommentare öffnen">
                      <i className="fa-regular fa-comment" /> {p.comments}
                    </Link>
                    <button
                      type="button"
                      className="toolbtn sm"
                      aria-label="Teilen"
                      onClick={() => setSharePost(p)}
                    >
                      <i className="fa-solid fa-share-nodes" /> Teilen
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
          <p className="feed-hint">Tipp: Rechtsklick auf einen Post öffnet das Beitrags-Menü.</p>
        </div>

        {/* Rechte Spalte: aufräumen statt endloser Feed */}
        <aside className="start-side" aria-label="Entdecken">
          <div className="side-card">
            <h4 className="sidecard-title">
              <i className="fa-solid fa-users ic-teal" /> Trending Tontoos
            </h4>
            <div className="trend-list">
              {COMMUNITIES.map((c) => (
                <Link key={c.id} to={`/t/${c.id}`} className="trend-row">
                  <span className="comm-ic" aria-hidden="true">
                    <i className={`fa-solid ${c.icon} ${c.color}`} />
                  </span>
                  <span className="trend-main">
                    <strong>t/{c.name}</strong>
                    <small>{c.members} Mitglieder</small>
                  </span>
                  <i className="fa-solid fa-chevron-right trend-go" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Teilen-Menü wie bei Shorts (eigenes Modal statt Browser-Dialog) */}
      {sharePost && (
        <div className="sheet-backdrop" onClick={() => setSharePost(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Teilen" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <strong className="sheet-title">Teilen</strong>
            </div>
            <div className="sheet-body">
              <p className="sheet-sub">t/{sharePost.community} · {sharePost.title || sharePost.text}</p>
              <div className="sheet-url">
                <span className="sheet-urltext">{postUrl(sharePost)}</span>
                <button type="button" className="btn btn-brand btn-sm" onClick={() => copyLink(sharePost)}>
                  <i className={`fa-solid ${copied === sharePost.id ? 'fa-check' : 'fa-copy'}`} />
                  {copied === sharePost.id ? 'Kopiert!' : 'Kopieren'}
                </button>
              </div>
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setSharePost(null)}>Abbrechen</button>
              <button type="button" className="btn btn-brand" onClick={() => setSharePost(null)}>Fertig</button>
            </div>
          </div>
        </div>
      )}

      {/* Eigenes Rechtsklick-Menü statt Browser-Menü */}
      {ctx && (
        <div
          className="ctx-backdrop"
          onClick={() => setCtx(null)}
          onContextMenu={(e) => { e.preventDefault(); setCtx(null) }}
        >
          <div
            className="ctx-menu"
            role="menu"
            aria-label="Beitrags-Menü"
            style={{ top: ctx.y, left: ctx.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ctx-title">t/{ctx.post.community} · u/{ctx.post.author}</div>
            <button
              type="button"
              onClick={() => { copyLink(ctx.post); setCtx(null) }}
            >
              <i className="fa-solid fa-link ic-teal" /> Link kopieren
            </button>
            <Link to={`/t/${commIdOf(ctx.post)}`} onClick={() => setCtx(null)}>
              <i className="fa-solid fa-users ic-yellow" /> Community öffnen
            </Link>
            <Link to={`/u/${ctx.post.author}`} onClick={() => setCtx(null)}>
              <i className="fa-solid fa-circle-user ic-violet" /> Profil öffnen
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
