import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ShareSheet from '../../components/ShareSheet.jsx'
import PostBody from '../../components/PostBody.jsx'
import {
  apiFeedPosts,
  apiLikePost,
  apiListCommunities,
  apiStartShorts,
  avatarSrc,
  mediaSrc,
} from '../../lib/api.js'

const SORTS = [
  { id: 'neu', label: 'Neu', icon: 'fa-clock' },
  { id: 'top', label: 'Top', icon: 'fa-fire' },
  { id: 'diskutiert', label: 'Diskutiert', icon: 'fa-comments' },
]

const postUrlOf = (p) =>
  `${window.location.origin}/t/${p.community?.slug}/post/${p.id}`

// Echte Startseite: oben Shorts-Shelf (1× Woche, 2× 3 Tage, 2× neu –
// ohne Kennzeichnung), darunter je 7 echte Posts (Neu/Top/Diskutiert)
// mit Like, Kommentar-Zähler und genau 1 Kommentar-Vorschau, ohne Bilder.
export default function Start({ showToast }) {
  const toast = (msg) => showToast?.(msg)
  const [sort, setSort] = useState('neu')
  const [shelf, setShelf] = useState([])
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState('')
  const [copied, setCopied] = useState(null)
  const [sharePost, setSharePost] = useState(null) // Post im Teilen-Menü (wie bei Shorts)
  const [ctx, setCtx] = useState(null) // { x, y, post } – eigenes Rechtsklick-Menü
  const shelfRef = useRef(null)
  const copyTimer = useRef(null)

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  // Shelf einmal laden (echte Shorts, Reihenfolge vom Server).
  useEffect(() => {
    apiStartShorts().then(setShelf).catch(() => setShelf([]))
  }, [])

  // Posts je Sortierung laden (immer 7 vom Server).
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    let alive = true
    setPostsLoading(true)
    setPostsError('')
    apiFeedPosts(sort)
      .then((list) => {
        if (alive) setPosts(list)
      })
      .catch((e) => {
        if (alive) setPostsError(e.message || 'Laden fehlgeschlagen.')
      })
      .finally(() => {
        if (alive) setPostsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [sort, reloadKey])

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

  // Echter Like-Toggle pro Post (optimistisch mit Rollback).
  const toggleLike = async (p) => {
    const was = !!p.liked
    setPosts((list) => list.map((x) => (x.id === p.id
      ? { ...x, liked: !was, likes: (x.likes || 0) + (was ? -1 : 1) }
      : x)))
    try {
      const r = await apiLikePost(p.id)
      setPosts((list) => list.map((x) => (x.id === p.id
        ? { ...x, liked: !!r.liked, likes: r.likes }
        : x)))
    } catch (e) {
      setPosts((list) => list.map((x) => (x.id === p.id
        ? { ...x, liked: was, likes: p.likes || 0 }
        : x)))
      toast(/eingeloggt/i.test(e.message || '') ? 'Bitte zuerst einloggen.' : (e.message || 'Liken fehlgeschlagen.'))
    }
  }

  // Echte Communities für "Trending Tontoos" (leer → Box versteckt).
  const [trendComms, setTrendComms] = useState([])

  useEffect(() => {
    apiListCommunities().then(setTrendComms).catch(() => setTrendComms([]))
  }, [])

  const shelfScroll = (dir) => {
    shelfRef.current?.scrollBy({ left: dir * 380, behavior: 'smooth' })
  }

  const copyLink = async (p) => {
    const url = postUrlOf(p)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* egal */ }
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
      {/* Shorts: Hochkant-Shelf mit Quer-Scroll (echt, ohne Sortier-Labels) */}
      {shelf.length > 0 && (
        <section className="shelf" aria-label="Shorts">
          <div className="shelf-head">
            <h3 className="shelf-title">
              <i className="fa-solid fa-clapperboard ic-yellow" /> Shorts
            </h3>
            <div className="shelf-actions">
              <Link to="/shorts" className="shelf-link">
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
            {shelf.map((s) => (
              <Link key={s.id} to={`/shorts/${s.id}`} className="short-card" aria-label={`Short ${s.title}`}>
                <span className="short-thumb">
                  {s.thumbUrl ? (
                    <img src={mediaSrc(s.thumbUrl)} alt="" loading="lazy" />
                  ) : (
                    <i className="fa-solid fa-clapperboard" aria-hidden="true" />
                  )}
                  <span className="short-dur">{s.dur}</span>
                  <span className="short-play" aria-hidden="true">
                    <i className="fa-solid fa-play" />
                  </span>
                </span>
                <span className="short-cardmeta">
                  <strong>{s.title}</strong>
                  <small>@{s.author?.username} · {Number(s.likes || 0).toLocaleString('de-DE')} Likes</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="start-layout">
        {/* Echter Text-Feed aus t/… (7 Stück, ohne Bilder, mit 1 Kommentar) */}
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
            {postsLoading ? (
              <p className="app-sub"><i className="fa-solid fa-circle-notch fa-spin" /> Beiträge werden geladen …</p>
            ) : postsError ? (
              <div className="follow-empty">
                <i className="fa-solid fa-triangle-exclamation big" aria-hidden="true" />
                <p>{postsError}</p>
                <button type="button" className="btn btn-brand btn-sm" onClick={() => setReloadKey((k) => k + 1)}>
                  <i className="fa-solid fa-rotate-right" /> Erneut versuchen
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="follow-empty">
                <i className="fa-solid fa-inbox big" aria-hidden="true" />
                <p>Noch keine Beiträge.</p>
                <p className="app-sub">Erstelle eine Community und poste den ersten Beitrag.</p>
              </div>
            ) : (
              posts.map((p, i) => {
                const detailUrl = `/t/${p.community?.slug}/post/${p.id}`
                const tc = p.topComment
                return (
                  <article
                    key={p.id}
                    className="post start-post"
                    style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                    onContextMenu={(e) => openCtx(e, p)}
                  >
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
                        </div>
                        <div className="postname">
                          <Link to={`/u/${p.author?.username}`}>u/{p.author?.username}</Link>
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

                    <Link to={detailUrl} className="post-titlelink">
                      <h4 className="post-title">{p.title}</h4>
                    </Link>
                    {/* Text + Tags, aber keine Bilder im Feed */}
                    <PostBody post={{ ...p, images: [] }} detailUrl={detailUrl} />

                    {/* Genau 1 Kommentar-Vorschau pro Zeile */}
                    {tc && (
                      <Link to={`${detailUrl}#kommentare`} className="top-comment" aria-label="Kommentar öffnen">
                        <i className="fa-regular fa-comment" aria-hidden="true" />
                        <span className="top-comment-main">
                          <strong>u/{tc.username}</strong>
                          <span>{tc.text}</span>
                        </span>
                        <i className="fa-solid fa-chevron-right trend-go" aria-hidden="true" />
                      </Link>
                    )}

                    <div className="post-toolbar">
                      <button
                        type="button"
                        className={`toolbtn sm${p.liked ? ' active' : ''}`}
                        aria-pressed={!!p.liked}
                        aria-label="Liken"
                        onClick={() => toggleLike(p)}
                      >
                        <i className={`${p.liked ? 'fa-solid' : 'fa-regular'} fa-heart`} />
                        {Number(p.likes || 0).toLocaleString('de-DE')}
                      </button>
                      <Link to={`${detailUrl}#kommentare`} className="toolbtn sm" title="Kommentare öffnen">
                        <i className="fa-regular fa-comment" /> {p.comments ?? 0}
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
              })
            )}
          </div>
        </div>

        {/* Rechte Spalte: aufräumen statt endloser Feed */}
        <aside className="start-side" aria-label="Entdecken">
          {trendComms.length > 0 && (
          <div className="side-card">
            <h4 className="sidecard-title">
              <i className="fa-solid fa-users ic-teal" /> Trending Tontoos
            </h4>
            <div className="trend-list">
              {trendComms.slice(0, 5).map((c) => (
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
                    <small>{Number(c.members || 0).toLocaleString('de-DE')} Mitglieder</small>
                  </span>
                  <i className="fa-solid fa-chevron-right trend-go" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
          )}
        </aside>
      </div>

      {/* Teilen-Menü wie bei Shorts (eigenes Modal statt Browser-Dialog) */}
      {sharePost && (
        <ShareSheet
          sub={`t/${sharePost.community?.name} · ${sharePost.title}`}
          url={postUrlOf(sharePost)}
          copied={copied === sharePost.id}
          onCopy={() => copyLink(sharePost)}
          onClose={() => setSharePost(null)}
        />
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
            <div className="ctx-title">t/{ctx.post.community?.name} · u/{ctx.post.author?.username}</div>
            <button
              type="button"
              onClick={() => { copyLink(ctx.post); setCtx(null) }}
            >
              <i className="fa-solid fa-link ic-teal" /> Link kopieren
            </button>
            <Link to={`/t/${ctx.post.community?.slug}`} onClick={() => setCtx(null)}>
              <i className="fa-solid fa-users ic-yellow" /> Community öffnen
            </Link>
            <Link to={`/u/${ctx.post.author?.username}`} onClick={() => setCtx(null)}>
              <i className="fa-solid fa-circle-user ic-violet" /> Profil öffnen
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
