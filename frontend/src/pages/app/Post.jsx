import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CommunityCard from '../../components/CommunityCard.jsx'
import PostBody from '../../components/PostBody.jsx'
import ShareSheet from '../../components/ShareSheet.jsx'
import {
  apiDeleteCommunityPost,
  apiGetPost,
  apiLikePostComment,
  apiPostComments,
  apiPostPostComment,
  apiToggleCommunityFollow,
  avatarSrc,
  mediaSrc,
} from '../../lib/api.js'

// Einzelner Post im Reddit-Stil: /t/:name/post/:postId
// Zurück-Pfeil, Titel, Body, Aktionen (Teilen + Löschen als Admin),
// echte Kommentare mit Replies + Likes, Composer unten, Community-Box rechts.
// Alles echt aus der DB.
export default function Post({ showToast }) {
  const { name, postId } = useParams()
  const navigate = useNavigate()
  const toast = (msg) => showToast?.(msg)
  const needLogin = (msg) => (/eingeloggt/i.test(msg || '') ? 'Bitte zuerst einloggen.' : msg)
  const [post, setPost] = useState(null)
  const [comm, setComm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Echte Kommentare
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentSort, setCommentSort] = useState('beste')
  const [query, setQuery] = useState('')
  const [topDraft, setTopDraft] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setNotFound(false)
    setError('')
    setPost(null)
    setComm(null)
    setComments([])
    setCommentsLoading(true)
    apiGetPost(name, postId)
      .then(({ post: p, community: c }) => {
        if (!alive) return
        setPost(p)
        setComm(c)
        return apiPostComments(p.id).then((list) => {
          if (alive) setComments(list)
        })
      })
      .catch((e) => {
        if (!alive) return
        if (/nicht gefunden|404/i.test(e.message || '')) setNotFound(true)
        else setError(e.message || 'Laden fehlgeschlagen.')
      })
      .finally(() => {
        if (alive) {
          setLoading(false)
          setCommentsLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [name, postId])

  useEffect(() => {
    if (!shareOpen && !deleteOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') {
        setShareOpen(false)
        setDeleteOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shareOpen, deleteOpen])

  const toggleFollow = async () => {
    try {
      const r = await apiToggleCommunityFollow(comm.slug)
      setComm((c) => (c ? { ...c, followed: !!r.followed, members: r.followers } : c))
      if (r.followed) toast(`t/${comm.slug} gefolgt.`)
      else toast(`t/${comm.slug} entfolgt.`)
    } catch (e) {
      toast(/eingeloggt/i.test(e.message || '') ? 'Bitte zuerst einloggen.' : (e.message || 'Folgen fehlgeschlagen.'))
    }
  }

  const confirmDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await apiDeleteCommunityPost(comm.slug, post.id)
      setDeleteOpen(false)
      navigate(`/t/${comm.slug}`)
      toast('Post gelöscht.')
    } catch (e) {
      toast(e.message || 'Löschen fehlgeschlagen.')
    } finally {
      setDeleting(false)
    }
  }

  // ---- Echte Kommentare (mit Replies + Likes) ----

  const updateComment = (id, fn) => {
    const walk = (list) => list.map((c) => {
      if (c.id === id) return fn(c)
      if (c.replies?.length) return { ...c, replies: walk(c.replies) }
      return c
    })
    setComments((list) => walk(list))
  }

  const toggleCommentLike = async (id) => {
    try {
      const r = await apiLikePostComment(id)
      updateComment(id, (c) => ({ ...c, liked: !!r.liked, likes: r.likes }))
    } catch (e) {
      toast(needLogin(e.message) || 'Liken fehlgeschlagen.')
    }
  }

  const submitTop = async (e) => {
    e.preventDefault()
    const text = topDraft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const created = await apiPostPostComment(post.id, text)
      setComments((list) => [...list, created])
      setTopDraft('')
    } catch (err) {
      toast(needLogin(err.message) || 'Kommentieren fehlgeschlagen.')
    } finally {
      setSending(false)
    }
  }

  const submitReply = async (e, commentId) => {
    e.preventDefault()
    const text = replyDraft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const created = await apiPostPostComment(post.id, text, commentId)
      updateComment(commentId, (c) => ({ ...c, replies: [...(c.replies || []), created] }))
      setReplyDraft('')
      setReplyTo(null)
    } catch (err) {
      toast(needLogin(err.message) || 'Antworten fehlgeschlagen.')
    } finally {
      setSending(false)
    }
  }

  const score = (c) => (c.likes || 0) + (c.replies || []).length * 5
  const sortedBase = [...comments].sort((a, b) =>
    commentSort === 'beste' ? score(b) - score(a) : 0
  )
  const q = query.trim().toLowerCase()
  const visible = q
    ? sortedBase.filter(
        (c) => c.text.toLowerCase().includes(q) || c.username.toLowerCase().includes(q)
      )
    : sortedBase
  const totalCount = comments.reduce((n, c) => n + 1 + (c.replies || []).length, 0)

  const renderComment = (c, depth = 0) => (
    <div className="comment" key={c.id}>
      <span className="comment-ava" aria-hidden="true">
        {c.avatarUrl
          ? <img src={avatarSrc(c.avatarUrl)} alt="" />
          : <i className="fa-solid fa-circle-user" />}
      </span>
      <div className="comment-main">
        <div className="comment-head">
          u/{c.username}
          {c.username === post.author.username && <span className="op-badge">OP</span>}
          <small>{c.date}</small>
        </div>
        <p className="comment-text">{c.text}</p>
        <div className="comment-actions">
          <button
            type="button"
            className={`comment-btn${c.liked ? ' active' : ''}`}
            aria-pressed={!!c.liked}
            onClick={() => toggleCommentLike(c.id)}
          >
            <i className={`${c.liked ? 'fa-solid' : 'fa-regular'} fa-heart`} /> {c.likes || 0}
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
              placeholder={`Antworten an u/${c.username} …`}
              aria-label="Antwort schreiben"
              maxLength={280}
              autoFocus
            />
            <button type="submit" className="btn btn-brand btn-sm" disabled={!replyDraft.trim() || sending}>
              <i className="fa-solid fa-paper-plane" />
            </button>
          </form>
        )}
        {(c.replies || []).length > 0 && (
          <div className="replies">
            {(c.replies || []).map((r) => renderComment(r, depth + 1))}
          </div>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="app-page narrow">
        <p className="app-sub"><i className="fa-solid fa-circle-notch fa-spin" /> Wird geladen …</p>
      </div>
    )
  }

  if (notFound || (!post && !error)) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Nicht gefunden</h2>
        <p className="app-sub">Diesen Post gibt es nicht.</p>
        <Link to={`/t/${name}`} className="btn btn-ghost">
          <i className="fa-solid fa-arrow-left" /> Zurück zur Community
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Fehler</h2>
        <p className="app-sub">{error}</p>
        <Link to={`/t/${name}`} className="btn btn-ghost">
          <i className="fa-solid fa-arrow-left" /> Zurück zur Community
        </Link>
      </div>
    )
  }

  const shareUrl = `${window.location.origin}/t/${comm.slug}/post/${post.id}`

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* egal */ }
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="app-page">
      <div className="start-layout post-layout">
        <div className="feed-col">
          {/* Zurück + Meta wie bei Reddit */}
          <div className="backrow">
            <Link
              to={`/t/${comm.slug}`}
              className="iconbtn"
              aria-label="Zurück"
            >
              <i className="fa-solid fa-arrow-left" />
            </Link>
            <span className="postline">
              <Link to={`/t/${comm.slug}`} className="comm-link">t/{comm.name}</Link>
              <span className="dot" aria-hidden="true">·</span>
              <span className="posttime">{post.date}</span>
              <span className="dot" aria-hidden="true">·</span>
              <Link to={`/u/${post.author.username}`} className="postuser-link">u/{post.author.username}</Link>
            </span>
          </div>

          <h2 className="post-detail-title">{post.title}</h2>
          <div className="post-detail-author">
            <Link to={`/u/${post.author.username}`} className="avatar" aria-label={`Profil von ${post.author.username}`}>
              {post.author.avatarUrl
                ? <img src={avatarSrc(post.author.avatarUrl)} alt="" />
                : <i className="fa-solid fa-circle-user" />}
            </Link>
          </div>
          <PostBody post={{ ...post, images: (post.images || []).map(mediaSrc) }} large />

          <div className="post-toolbar detail-toolbar">
            <button type="button" className="toolbtn sm" onClick={() => setShareOpen(true)}>
              <i className="fa-solid fa-share-nodes" /> Teilen
            </button>
            {post.canDelete && (
              <button type="button" className="toolbtn sm danger-tool" onClick={() => setDeleteOpen(true)}>
                <i className="fa-solid fa-trash" /> Löschen
              </button>
            )}
          </div>

          {/* Mitmachen (Eingabeleiste unten, wie im Chat) */}
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
              <button type="submit" className="btn btn-brand btn-sm" disabled={!topDraft.trim() || sending} aria-label="Absenden">
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
            {commentsLoading ? (
              <p className="feed-hint"><i className="fa-solid fa-circle-notch fa-spin" /> Kommentare werden geladen …</p>
            ) : (
              <>
                {visible.map((c) => renderComment(c))}
                {visible.length === 0 && (
                  <p className="feed-hint">Keine Kommentare gefunden – schreib den ersten!</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Community-Box rechts (sticky, wie überall) */}
        <aside className="start-side" aria-label="Community">
          <CommunityCard
            comm={comm}
            followed={comm.followed}
            onToggleFollow={toggleFollow}
            stats={[
              { value: Number(comm.members || 0).toLocaleString('de-DE'), label: 'Mitglieder' },
              { value: totalCount, label: 'Kommentare' },
            ]}
            showOpenLink
          />
        </aside>
      </div>

      {/* Teilen-Menü wie bei Shorts */}
      {shareOpen && (
        <ShareSheet
          sub={`t/${comm.name} · ${post.title}`}
          url={shareUrl}
          copied={copied}
          onCopy={copyShareUrl}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Post löschen bestätigen */}
      {deleteOpen && (
        <div className="sheet-backdrop" onClick={() => !deleting && setDeleteOpen(false)}>
          <div className="sheet sheet-slim" role="alertdialog" aria-modal="true" aria-label="Post löschen" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><strong className="sheet-title">Post löschen?</strong></div>
            <div className="sheet-body">
              <p className="sheet-sub">Der Post wird endgültig entfernt (inkl. Bilder).</p>
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" disabled={deleting} onClick={() => setDeleteOpen(false)}>Abbrechen</button>
              <button type="button" className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>
                {deleting
                  ? <><i className="fa-solid fa-circle-notch fa-spin" /> Löschen …</>
                  : <><i className="fa-solid fa-trash" /> Löschen</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
