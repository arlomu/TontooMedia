import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CommunityCard from '../../components/CommunityCard.jsx'
import PostBody from '../../components/PostBody.jsx'
import ShareSheet from '../../components/ShareSheet.jsx'
import {
  apiDeleteCommunityPost,
  apiGetPost,
  apiToggleCommunityFollow,
  avatarSrc,
  mediaSrc,
} from '../../lib/api.js'

// Einzelner Post im Reddit-Stil: /t/:name/post/:postId
// Zurück-Pfeil, Titel, Body, Aktionen (Teilen + Löschen als Admin),
// Community-Box rechts. Alles echt aus der DB – Kommentare kommen später.
export default function Post({ showToast }) {
  const { name, postId } = useParams()
  const navigate = useNavigate()
  const toast = (msg) => showToast?.(msg)
  const [post, setPost] = useState(null)
  const [comm, setComm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setNotFound(false)
    setError('')
    setPost(null)
    setComm(null)
    apiGetPost(name, postId)
      .then(({ post: p, community: c }) => {
        if (alive) {
          setPost(p)
          setComm(c)
        }
      })
      .catch((e) => {
        if (!alive) return
        if (/nicht gefunden|404/i.test(e.message || '')) setNotFound(true)
        else setError(e.message || 'Laden fehlgeschlagen.')
      })
      .finally(() => {
        if (alive) setLoading(false)
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

          {/* Kommentare kommen später */}
          <div className="follow-empty">
            <i className="fa-solid fa-comments big" aria-hidden="true" />
            <p>Kommentare kommen bald.</p>
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
              { value: '–', label: 'Beiträge' },
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
