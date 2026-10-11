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

// Aufgeräumte Startseite: oben Shorts als Hochkant-Shelf (9:16),
// darunter Text-Posts aus den Sub-Tontoos (t/…) + rechte Info-Spalte.
export default function Start() {
  const [sort, setSort] = useState('neu')
  const [comm, setComm] = useState('alle')
  const [liked, setLiked] = useState({})
  const [saved, setSaved] = useState({})
  const [copied, setCopied] = useState(null)
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

  const sorted = [...DEMO_POSTS].sort((a, b) => {
    if (sort === 'top') return b.likes - a.likes
    if (sort === 'diskutiert') return b.comments - a.comments
    return a.id - b.id
  })
  const filtered = comm === 'alle' ? sorted : sorted.filter((p) => commIdOf(p) === comm)

  const shelfScroll = (dir) => {
    shelfRef.current?.scrollBy({ left: dir * 380, behavior: 'smooth' })
  }

  const copyLink = async (p) => {
    const url = `${window.location.origin}/t/${commIdOf(p)}`
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
      <div className="start-head">
        <div>
          <h2 className="app-title">Startseite</h2>
          <p className="app-sub">Shorts im Hochformat + Text-Posts aus deinen Sub-Tontoos. Alles Demo.</p>
        </div>
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
          <div className="chiprow" role="tablist" aria-label="Community filtern">
            <button
              type="button"
              role="tab"
              aria-selected={comm === 'alle'}
              className={`chipbtn${comm === 'alle' ? ' active' : ''}`}
              onClick={() => setComm('alle')}
            >
              <i className="fa-solid fa-house" /> Alle
            </button>
            {COMMUNITIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={comm === c.id}
                className={`chipbtn${comm === c.id ? ' active' : ''}`}
                onClick={() => setComm(c.id)}
              >
                <i className={`fa-solid ${c.icon} ${c.color}`} /> t/{c.name}
              </button>
            ))}
          </div>

          <div className="app-feed">
            {filtered.map((p, i) => {
              const cid = commIdOf(p)
              const isLiked = !!liked[p.id]
              const isSaved = !!saved[p.id]
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

                  <h4 className="post-title">{p.title || p.text}</h4>
                  {p.title && <p className="posttext">{p.text}</p>}

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
                    <span className="toolbtn sm static" title="Kommentare">
                      <i className="fa-regular fa-comment" /> {p.comments}
                    </span>
                    <button
                      type="button"
                      className={`toolbtn sm${copied === p.id ? ' active' : ''}`}
                      onClick={() => copyLink(p)}
                    >
                      <i className={`fa-solid ${copied === p.id ? 'fa-check' : 'fa-share-nodes'}`} />
                      {copied === p.id ? 'Kopiert!' : 'Teilen'}
                    </button>
                    <span className="tool-spacer" />
                    <button
                      type="button"
                      className={`iconbtn sm${isSaved ? ' saved' : ''}`}
                      aria-pressed={isSaved}
                      aria-label={isSaved ? 'Gespeichert' : 'Speichern'}
                      title={isSaved ? 'Gespeichert' : 'Speichern'}
                      onClick={() => setSaved((m) => ({ ...m, [p.id]: !m[p.id] }))}
                    >
                      <i className={`${isSaved ? 'fa-solid' : 'fa-regular'} fa-bookmark`} />
                    </button>
                  </div>
                </article>
              )
            })}
            {filtered.length === 0 && (
              <div className="post empty">
                <p className="posttext">Hier ist noch nichts – schau in einer anderen Community vorbei.</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setComm('alle')}>
                  <i className="fa-solid fa-rotate-left" /> Alle anzeigen
                </button>
              </div>
            )}
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
          <div className="side-card muted">
            <h4 className="sidecard-title">
              <i className="fa-solid fa-circle-info ic-violet" /> Beispiel-Feed
            </h4>
            <p className="sidecard-text">
              Posts, Shorts und Communities sind Demo ohne Backend. Lade im{' '}
              <Link to="/studio">Studio</Link> etwas hoch oder stöbere in den{' '}
              <Link to={`/shorts/${DEMO_SHORTS[0].id}`}>Shorts</Link>.
            </p>
          </div>
        </aside>
      </div>

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
            <button type="button" onClick={() => setCtx(null)}>
              <i className="fa-solid fa-flag ic-danger" /> Melden (Demo)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
