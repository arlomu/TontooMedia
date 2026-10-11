import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { COMMUNITIES, DEMO_POSTS, commIdOf, postUrlOf } from './demoData.js'
import CommunityCard from '../../components/CommunityCard.jsx'
import ShareSheet from '../../components/ShareSheet.jsx'

const SORTS = [
  { id: 'neu', label: 'Neu', icon: 'fa-clock' },
  { id: 'top', label: 'Top', icon: 'fa-fire' },
  { id: 'diskutiert', label: 'Diskutiert', icon: 'fa-comments' },
]

// Community-Seite: /t/:name – Hero oben, Feed-Karten wie auf der Startseite,
// rechts die sticky Community-Box (identisch zur Post-Ansicht).
// Alles Demo, kein Backend.
export default function Community() {
  const { name } = useParams()
  const comm = COMMUNITIES.find((c) => c.id === name)

  const [sort, setSort] = useState('neu')
  const [liked, setLiked] = useState({})
  const [copied, setCopied] = useState(null)
  const [sharePost, setSharePost] = useState(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newText, setNewText] = useState('')
  const [myPosts, setMyPosts] = useState([])
  const copyTimer = useRef(null)

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  useEffect(() => {
    if (!sharePost && !composerOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setSharePost(null)
      setComposerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sharePost, composerOpen])

  if (!comm) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Nicht gefunden</h2>
        <p className="app-sub">Diese Beispiel-Community gibt es nicht.</p>
        <Link to="/app" className="btn btn-ghost">
          <i className="fa-solid fa-arrow-left" /> Zurück zur Startseite
        </Link>
      </div>
    )
  }

  const base = DEMO_POSTS.filter((p) => commIdOf(p) === comm.id)
  const sortedBase = (base.length ? base : DEMO_POSTS.slice(0, 2)).sort((a, b) => {
    if (sort === 'top') return b.likes - a.likes
    if (sort === 'diskutiert') return b.comments - a.comments
    return a.id - b.id
  })
  // Eigene Posts stehen immer oben
  const mine = [...myPosts].reverse()

  const closeComposer = () => {
    setComposerOpen(false)
    setNewTitle('')
    setNewText('')
  }

  const submitPost = () => {
    const title = newTitle.trim()
    if (!title) return
    setMyPosts((list) => [
      ...list,
      {
        id: `m-${Date.now()}`,
        author: 'du',
        community: comm.name,
        commId: comm.id,
        title,
        text: newText.trim(),
        time: 'jetzt',
        likes: 0,
        comments: 0,
        icon: 'fa-circle-user',
        color: 'ic-yellow',
      },
    ])
    closeComposer()
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
      try { document.execCommand('copy') } catch { /* Demo: egal */ }
      ta.remove()
    }
    setCopied(p.id)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(null), 1600)
  }

  return (
    <div className="app-page">
      {/* Hero */}
      <div className="comm-hero-card">
        <span className="comm-big" aria-hidden="true">
          <i className={`fa-solid ${comm.icon} ${comm.color}`} />
        </span>
        <div className="comm-hero-main">
          <h2 className="comm-hero-name">t/{comm.name}</h2>
          <p className="comm-hero-meta">
            <i className="fa-solid fa-users" /> {comm.members} Mitglieder · Öffentlich
          </p>
          <p className="comm-hero-desc">{comm.desc}</p>
        </div>
      </div>

      <div className="start-layout">
        <div className="feed-col">
          <div className="feed-bar split">
            <button
              type="button"
              className="btn btn-brand posten-btn"
              onClick={() => setComposerOpen(true)}
            >
              <i className="fa-solid fa-plus" /> Posten
            </button>
            <div className="toolbar" role="tablist" aria-label="Beiträge sortieren">
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
            {[...mine, ...sortedBase].map((p, i) => {
              const cid = commIdOf(p)
              const isLiked = !!liked[p.id]
              return (
                <article
                  key={p.id}
                  className="post start-post"
                  style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                >
                  <div className="posthead">
                    <span className="avatar" aria-hidden="true">
                      <i className={`fa-solid ${p.icon} ${p.color}`} />
                    </span>
                    <div className="postheada">
                      <div className="postline">
                        <Link to={`/u/${p.author}`} className="comm-link">u/{p.author}</Link>
                        <span className="dot" aria-hidden="true">·</span>
                        <span className="posttime">
                          <i className="fa-regular fa-clock" /> {p.time}
                        </span>
                      </div>
                    </div>
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
        </div>

        {/* Sticky Seitenleiste – identisch zur Post-Ansicht */}
        <aside className="start-side" aria-label="Community">
          <CommunityCard
            comm={comm}
            stats={[
              { value: comm.members, label: 'Mitglieder' },
              { value: base.length || '–', label: 'Beiträge' },
            ]}
          />
        </aside>
      </div>

      {sharePost && (
        <ShareSheet
          sub={`t/${sharePost.community} · ${sharePost.title || sharePost.text}`}
          url={postUrlOf(sharePost)}
          copied={copied === sharePost.id}
          onCopy={() => copyLink(sharePost)}
          onClose={() => setSharePost(null)}
        />
      )}

      {/* Posten-Dialog direkt im Tontoo */}
      {composerOpen && (
        <div className="sheet-backdrop" onClick={closeComposer}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Posten" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <strong className="sheet-title">Posten in t/{comm.name}</strong>
            </div>
            <div className="sheet-body">
              <div className="post-form">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Titel"
                  aria-label="Titel"
                  maxLength={120}
                  autoFocus
                />
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Text (optional)"
                  aria-label="Text"
                  rows={4}
                  maxLength={1000}
                />
              </div>
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={closeComposer}>Abbrechen</button>
              <button type="button" className="btn btn-brand" disabled={!newTitle.trim()} onClick={submitPost}>
                <i className="fa-solid fa-paper-plane" /> Posten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
