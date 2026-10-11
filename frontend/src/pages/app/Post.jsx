import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { COMMUNITIES, DEMO_POST_COMMENTS, DEMO_POSTS, commIdOf } from './demoData.js'
import CommunityCard from '../../components/CommunityCard.jsx'
import PostBody from '../../components/PostBody.jsx'
import ShareSheet from '../../components/ShareSheet.jsx'

const COMMENT_SORTS = [
  { id: 'beste', label: 'Beste', icon: 'fa-ranking-star' },
  { id: 'neu', label: 'Neu', icon: 'fa-clock' },
]

// Einzelner Post im Reddit-Stil: /t/:name/post/:postId
// Zurück-Pfeil, Titel, Body, Aktionen, Kommentar-Composer,
// Sortierung + Suche, verschachtelte Kommentare, Community-Box rechts.
// Alles Demo, kein Backend.
export default function Post() {
  const { name, postId } = useParams()
  const post = DEMO_POSTS.find((p) => String(p.id) === String(postId))
  const comm = COMMUNITIES.find((c) => c.id === name)

  const [likedPost, setLikedPost] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [commentSort, setCommentSort] = useState('beste')
  const [query, setQuery] = useState('')
  const [topDraft, setTopDraft] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [extraComments, setExtraComments] = useState([])
  const [extraReplies, setExtraReplies] = useState({})
  const [likedComments, setLikedComments] = useState({})

  useEffect(() => {
    if (!shareOpen) return
    const onKey = (e) => e.key === 'Escape' && setShareOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shareOpen])

  const baseComments = useMemo(
    () => (post ? [...(DEMO_POST_COMMENTS[post.id] || []), ...extraComments] : []),
    [post, extraComments]
  )

  if (!post) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Nicht gefunden</h2>
        <p className="app-sub">Diesen Beispiel-Post gibt es nicht.</p>
        <Link to={comm ? `/t/${comm.id}` : '/app'} className="btn btn-ghost">
          <i className="fa-solid fa-arrow-left" /> Zurück
        </Link>
      </div>
    )
  }

  const cid = commIdOf(post)
  const shownComm = comm || COMMUNITIES.find((c) => c.id === cid)
  const shareUrl = `${window.location.origin}/t/${cid}/post/${post.id}`

  const repliesOf = (c) => [...(c.replies || []), ...(extraReplies[c.id] || [])]
  const commentLikes = (c) => c.likes + (likedComments[c.id] ? 1 : 0)
  const toggleCommentLike = (id) => setLikedComments((m) => ({ ...m, [id]: !m[id] }))

  const score = (c) => c.likes + repliesOf(c).length * 5
  const sortedBase = [...baseComments].sort((a, b) =>
    commentSort === 'beste' ? score(b) - score(a) : 0
  )
  const q = query.trim().toLowerCase()
  const visible = q
    ? sortedBase.filter(
        (c) => c.text.toLowerCase().includes(q) || c.author.toLowerCase().includes(q)
      )
    : sortedBase
  const totalCount =
    baseComments.reduce((n, c) => n + 1 + repliesOf(c).length, 0)

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* Demo: egal */ }
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const submitTop = (e) => {
    e.preventDefault()
    const text = topDraft.trim()
    if (!text) return
    setExtraComments((list) => [
      ...list,
      { id: `u-${Date.now()}`, author: 'du', time: 'jetzt', likes: 0, text, replies: [] },
    ])
    setTopDraft('')
  }

  const submitReply = (e, commentId) => {
    e.preventDefault()
    const text = replyDraft.trim()
    if (!text) return
    setExtraReplies((m) => ({
      ...m,
      [commentId]: [
        ...(m[commentId] || []),
        { id: `r-${Date.now()}`, author: 'du', time: 'jetzt', likes: 0, text },
      ],
    }))
    setReplyDraft('')
    setReplyTo(null)
  }

  const renderComment = (c, depth = 0) => (
    <div className="comment" key={c.id}>
      <span className="comment-ava" aria-hidden="true">
        <i className="fa-solid fa-circle-user" />
      </span>
      <div className="comment-main">
        <div className="comment-head">
          u/{c.author}
          {c.author === post.author && <span className="op-badge">OP</span>}
          <small>{c.time}</small>
        </div>
        <p className="comment-text">{c.text}</p>
        <div className="comment-actions">
          <button
            type="button"
            className={`comment-btn${likedComments[c.id] ? ' active' : ''}`}
            aria-pressed={!!likedComments[c.id]}
            onClick={() => toggleCommentLike(c.id)}
          >
            <i className={`${likedComments[c.id] ? 'fa-solid' : 'fa-regular'} fa-heart`} /> {commentLikes(c)}
          </button>
          {depth === 0 && (
            <button
              type="button"
              className="comment-btn"
              onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyDraft('') }}
            >
              <i className="fa-solid fa-reply" /> Antworten
            </button>
          )}
        </div>
        {replyTo === c.id && (
          <form className="reply-form" onSubmit={(e) => submitReply(e, c.id)}>
            <input
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder={`Antworten an u/${c.author} …`}
              aria-label="Antwort schreiben"
              maxLength={280}
              autoFocus
            />
            <button type="submit" className="btn btn-brand btn-sm" disabled={!replyDraft.trim()}>
              <i className="fa-solid fa-paper-plane" />
            </button>
          </form>
        )}
        {repliesOf(c).length > 0 && (
          <div className="replies">
            {repliesOf(c).map((r) => (
              <div className="comment" key={r.id}>
                <span className="comment-ava" aria-hidden="true">
                  <i className="fa-solid fa-circle-user" />
                </span>
                <div className="comment-main">
                  <div className="comment-head">
                    u/{r.author}
                    {r.author === post.author && <span className="op-badge">OP</span>}
                    <small>{r.time}</small>
                  </div>
                  <p className="comment-text">{r.text}</p>
                  <div className="comment-actions">
                    <button
                      type="button"
                      className={`comment-btn${likedComments[r.id] ? ' active' : ''}`}
                      aria-pressed={!!likedComments[r.id]}
                      onClick={() => toggleCommentLike(r.id)}
                    >
                      <i className={`${likedComments[r.id] ? 'fa-solid' : 'fa-regular'} fa-heart`} /> {commentLikes(r)}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="app-page">
      <div className="start-layout post-layout">
        <div className="feed-col">
          {/* Zurück + Meta wie bei Reddit */}
          <div className="backrow">
            <Link
              to={shownComm ? `/t/${shownComm.id}` : '/app'}
              className="iconbtn"
              aria-label="Zurück"
            >
              <i className="fa-solid fa-arrow-left" />
            </Link>
            <span className="postline">
              <Link to={`/t/${cid}`} className="comm-link">t/{post.community}</Link>
              <span className="dot" aria-hidden="true">·</span>
              <span className="posttime">{post.time}</span>
              <span className="dot" aria-hidden="true">·</span>
              <Link to={`/u/${post.author}`} className="postuser-link">u/{post.author}</Link>
            </span>
          </div>

          <h2 className="post-detail-title">{post.title || post.text}</h2>
          {post.title && <PostBody post={post} large />}

          <div className="post-toolbar detail-toolbar">
            <button
              type="button"
              className={`toolbtn sm${likedPost ? ' active' : ''}`}
              aria-pressed={likedPost}
              onClick={() => setLikedPost((v) => !v)}
            >
              <i className={`${likedPost ? 'fa-solid' : 'fa-regular'} fa-heart`} />
              {(post.likes + (likedPost ? 1 : 0)).toLocaleString('de-DE')}
            </button>
            <button type="button" className="toolbtn sm" onClick={() => setShareOpen(true)}>
              <i className="fa-solid fa-share-nodes" /> Teilen
            </button>
          </div>

          {/* Mitmachen (fixierte Eingabeleiste ganz unten, wie im Chat) */}
          <form className="composer" onSubmit={submitTop}>
            <div className="composer-inner">
              <span className="comment-ava" aria-hidden="true">
                <i className="fa-solid fa-circle-user" />
              </span>
              <input
                value={topDraft}
                onChange={(e) => setTopDraft(e.target.value)}
                placeholder="Beteilige dich an der Unterhaltung"
                aria-label="Kommentar schreiben"
                maxLength={280}
              />
              <button type="submit" className="btn btn-brand btn-sm" disabled={!topDraft.trim()} aria-label="Absenden">
                <i className="fa-solid fa-paper-plane" />
              </button>
            </div>
          </form>

          {/* Sortieren + Suchen */}
          <div className="comments-head" id="kommentare">
            <h3 className="comments-title">
              Kommentare <span className="comments-count">{totalCount}</span>
            </h3>
          </div>
          <div className="comments-bar">
            <div className="toolbar" role="tablist" aria-label="Kommentare sortieren">
              {COMMENT_SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={commentSort === s.id}
                  className={`toolbtn${commentSort === s.id ? ' active' : ''}`}
                  onClick={() => setCommentSort(s.id)}
                >
                  <i className={`fa-solid ${s.icon}`} /> {s.label}
                </button>
              ))}
            </div>
            <label className="mini-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kommentare durchsuchen"
                aria-label="Kommentare durchsuchen"
              />
            </label>
          </div>

          <div className="comments-list">
            {visible.map((c) => renderComment(c))}
            {visible.length === 0 && (
              <p className="feed-hint">Keine Kommentare gefunden – schreib den ersten!</p>
            )}
          </div>
        </div>

        {/* Community-Box rechts (sticky, wie überall) */}
        <aside className="start-side" aria-label="Community">
          {shownComm && (
            <CommunityCard
              comm={shownComm}
              stats={[
                { value: shownComm.members, label: 'Mitglieder' },
                { value: totalCount, label: 'Kommentare' },
              ]}
              showOpenLink
            />
          )}
        </aside>
      </div>

      {/* Teilen-Menü wie bei Shorts */}
      {shareOpen && (
        <ShareSheet
          sub={`t/${post.community} · ${post.title || post.text}`}
          url={shareUrl}
          copied={copied}
          onCopy={copyShareUrl}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  )
}
