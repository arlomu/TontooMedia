import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CommunityCard from '../../components/CommunityCard.jsx'
import PostBody from '../../components/PostBody.jsx'
import PostEditor from '../../components/PostEditor.jsx'
import {
  apiCreatePost,
  apiDeleteCommunity,
  apiDeleteCommunityPost,
  apiGetCommunity,
  apiListPosts,
  apiMe,
  apiToggleCommunityFollow,
  apiUpdateCommunity,
  apiVisitCommunity,
  avatarSrc,
  getToken,
  mediaSrc,
} from '../../lib/api.js'

const fmt = (n) => Number(n || 0).toLocaleString('de-DE')

// Blob-URL aus dem Editor -> File für den Multipart-Upload.
const blobUrlToFile = async (url, name) => {
  const res = await fetch(url)
  const blob = await res.blob()
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

// Community-Seite: /t/:name – Hero oben, echter Post-Feed,
// rechts die sticky Community-Box.
// Der Admin (Ersteller) sieht oben im Hero ein Zahnrad und darf dort
// Beschreibung, Regeln und Bild bearbeiten sowie Posts löschen.
export default function Community({ showToast }) {
  const { name } = useParams()
  const navigate = useNavigate()
  const toast = (msg) => showToast?.(msg)
  const [comm, setComm] = useState(null)
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  // Echte Posts
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postOpen, setPostOpen] = useState(false)
  const [posting, setPosting] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null) // Post zum Löschen
  const [deleting, setDeleting] = useState(false)
  // Admin-Einstellungen
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sDesc, setSDesc] = useState('')
  const [sRules, setSRules] = useState([])
  const [sPic, setSPic] = useState(null) // { url, file } – nur bei Änderung gesetzt
  const [sError, setSError] = useState('')
  const [sBusy, setSBusy] = useState(false)
  const [confirmCommDelete, setConfirmCommDelete] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (getToken()) apiMe().then(setMe).catch(() => setMe(null))
    else setMe(null)
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setNotFound(false)
    setError('')
    setComm(null)
    setPosts([])
    setSettingsOpen(false)
    setPostOpen(false)
    setDeleteTarget(null)
    setConfirmCommDelete(false)
    apiGetCommunity(name)
      .then((c) => {
        if (!alive) return
        setComm(c)
        // Besuch für die Sidebar-Historie merken (nur eingeloggt).
        if (getToken()) apiVisitCommunity(c.slug)
        return apiListPosts(c.slug).then((list) => {
          if (alive) setPosts(list)
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
          setPostsLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [name])

  useEffect(() => {
    if (!settingsOpen && !postOpen && !deleteTarget) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      closeSettings()
      setPostOpen(false)
      setDeleteTarget(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, postOpen, deleteTarget])

  const isAdmin = !!(me && comm && comm.creator && me.username === comm.creator)

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

  // ---- Posten (echt) ----

  const openPostEditor = () => {
    if (!getToken()) {
      toast('Bitte zuerst einloggen.')
      return
    }
    setPostOpen(true)
  }

  const submitPost = async (data) => {
    if (posting) return
    setPosting(true)
    try {
      const files = await Promise.all(
        (data.images || [])
          .filter((u) => typeof u === 'string' && u.startsWith('blob:'))
          .slice(0, 2)
          .map((u, i) => blobUrlToFile(u, `bild${i + 1}.jpg`))
      )
      const created = await apiCreatePost({
        slug: comm.slug,
        title: data.title,
        text: data.text,
        tags: data.tags,
        imageFiles: files,
      })
      setPosts((list) => [created, ...list])
      setPostOpen(false)
      toast('Post veröffentlicht.')
    } catch (e) {
      toast(/eingeloggt/i.test(e.message || '') ? 'Bitte zuerst einloggen.' : (e.message || 'Posten fehlgeschlagen.'))
    } finally {
      setPosting(false)
    }
  }

  const confirmDeletePost = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await apiDeleteCommunityPost(comm.slug, deleteTarget)
      setPosts((list) => list.filter((p) => p.id !== deleteTarget))
      setDeleteTarget(null)
      toast('Post gelöscht.')
    } catch (e) {
      toast(e.message || 'Löschen fehlgeschlagen.')
    } finally {
      setDeleting(false)
    }
  }

  // ---- Admin-Einstellungen ----

  const revokePic = (pic) => { if (pic?.url?.startsWith('blob:')) URL.revokeObjectURL(pic.url) }

  const openSettings = () => {
    setSDesc(comm.desc || '')
    setSRules([...(comm.rules || [])])
    revokePic(sPic)
    setSPic(null)
    setSError('')
    setConfirmCommDelete(false)
    setSettingsOpen(true)
  }

  const closeSettings = () => {
    setSettingsOpen(false)
    setSError('')
    setConfirmCommDelete(false)
    revokePic(sPic)
    setSPic(null)
  }

  const pickPic = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    revokePic(sPic)
    setSPic({ url: URL.createObjectURL(f), file: f })
  }

  const setRule = (i, v) => setSRules((list) => list.map((r, j) => (j === i ? v : r)))
  const addRule = () => {
    if (sRules.length >= 5) return
    setSRules((list) => [...list, ''])
  }
  const removeRule = (i) => {
    if (sRules.length <= 1) return
    setSRules((list) => list.filter((_, j) => j !== i))
  }

  const saveSettings = async (e) => {
    e.preventDefault()
    if (sBusy) return
    setSBusy(true)
    setSError('')
    try {
      const fresh = await apiUpdateCommunity({
        slug: comm.slug,
        description: sDesc.trim(),
        rules: sRules,
        imageFile: sPic?.file || null,
      })
      setComm(fresh)
      closeSettings()
      toast('Community gespeichert.')
    } catch (err) {
      setSError(err.message || 'Speichern fehlgeschlagen.')
    } finally {
      setSBusy(false)
    }
  }

  const deleteCommunity = async () => {
    if (sBusy) return
    setSBusy(true)
    setSError('')
    try {
      await apiDeleteCommunity(comm.slug)
      closeSettings()
      navigate('/app')
      toast(`t/${comm.slug} gelöscht.`)
    } catch (err) {
      setSError(err.message || 'Löschen fehlgeschlagen.')
    } finally {
      setSBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="app-page narrow">
        <p className="app-sub"><i className="fa-solid fa-circle-notch fa-spin" /> Wird geladen …</p>
      </div>
    )
  }

  if (notFound || (!comm && !error)) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Nicht gefunden</h2>
        <p className="app-sub">Diese Community gibt es nicht. Erstelle sie über das + in der Seitenleiste.</p>
        <Link to="/app" className="btn btn-ghost">
          <i className="fa-solid fa-arrow-left" /> Zurück zur Startseite
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-page narrow">
        <h2 className="app-title">Fehler</h2>
        <p className="app-sub">{error}</p>
        <Link to="/app" className="btn btn-ghost">
          <i className="fa-solid fa-arrow-left" /> Zurück zur Startseite
        </Link>
      </div>
    )
  }

  const img = comm.imageUrl ? mediaSrc(comm.imageUrl) : null
  const previewImg = sPic ? sPic.url : img

  return (
    <div className="app-page">
      {/* Hero */}
      <div className="comm-hero-card">
        {isAdmin && (
          <button
            type="button"
            className="comm-gear"
            aria-label="Community-Einstellungen"
            title="Community-Einstellungen"
            onClick={openSettings}
          >
            <i className="fa-solid fa-gear" />
          </button>
        )}
        <span className="comm-big" aria-hidden="true">
          {img ? (
            <img src={img} alt="" />
          ) : (
            <i className="fa-solid fa-users" />
          )}
        </span>
        <div className="comm-hero-main">
          <h2 className="comm-hero-name">t/{comm.name}</h2>
          <p className="comm-hero-meta">
            <i className="fa-solid fa-users" /> {fmt(comm.members)} {comm.members === 1 ? 'Mitglied' : 'Mitglieder'} · Öffentlich
          </p>
          {comm.desc ? <p className="comm-hero-desc">{comm.desc}</p> : null}
        </div>
      </div>

      <div className="start-layout">
        <div className="feed-col">
          <div className="feed-bar split">
            <button type="button" className="btn btn-brand" onClick={openPostEditor}>
              <i className="fa-solid fa-plus" /> Posten
            </button>
          </div>

          <div className="app-feed">
            {postsLoading ? (
              <p className="app-sub"><i className="fa-solid fa-circle-notch fa-spin" /> Beiträge werden geladen …</p>
            ) : posts.length === 0 ? (
              <div className="follow-empty">
                <i className="fa-solid fa-inbox big" aria-hidden="true" />
                <p>Noch keine Beiträge in t/{comm.name}.</p>
                <p className="app-sub">Sei der Erste und poste oben etwas.</p>
              </div>
            ) : (
              posts.map((p, i) => {
                const imgs = (p.images || []).map(mediaSrc)
                const open = !!expanded[p.id]
                const shown = open ? imgs : imgs.slice(0, 1)
                return (
                  <article
                    key={p.id}
                    className="post start-post"
                    style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                  >
                    <div className="posthead">
                      <Link to={`/u/${p.author.username}`} className="avatar" aria-label={`Profil von ${p.author.username}`}>
                        {p.author.avatarUrl
                          ? <img src={avatarSrc(p.author.avatarUrl)} alt="" />
                          : <i className="fa-solid fa-circle-user" />}
                      </Link>
                      <div className="postheada">
                        <div className="postline">
                          <Link to={`/u/${p.author.username}`} className="comm-link">u/{p.author.username}</Link>
                          <span className="dot" aria-hidden="true">·</span>
                          <span className="posttime">
                            <i className="fa-regular fa-clock" /> {p.date}
                          </span>
                        </div>
                      </div>
                      {p.canDelete && (
                        <button
                          type="button"
                          className="iconbtn sm"
                          title="Post löschen"
                          aria-label="Post löschen"
                          onClick={() => setDeleteTarget(p.id)}
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      )}
                    </div>

                    <h4 className="post-title">{p.title}</h4>
                    <PostBody post={{ ...p, images: shown }} />

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
              })
            )}
          </div>
        </div>

        {/* Sticky Seitenleiste – identisch zur Post-Ansicht */}
        <aside className="start-side" aria-label="Community">
          <CommunityCard
            comm={comm}
            followed={comm.followed}
            onToggleFollow={toggleFollow}
            stats={[
              { value: fmt(comm.members), label: 'Mitglieder' },
              { value: posts.length || '–', label: 'Beiträge' },
            ]}
          />
        </aside>
      </div>

      {/* Post erstellen – echter Editor, Community fest */}
      {postOpen && (
        <div className="sheet-backdrop" onClick={() => !posting && setPostOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Post erstellen" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><strong className="sheet-title">Post erstellen</strong></div>
            <PostEditor
              fixedCommunity={comm}
              submitLabel={posting ? 'Wird gepostet …' : 'Posten'}
              onSubmit={submitPost}
              onCancel={() => !posting && setPostOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Post löschen bestätigen */}
      {deleteTarget !== null && (
        <div className="sheet-backdrop" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="sheet sheet-slim" role="alertdialog" aria-modal="true" aria-label="Post löschen" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><strong className="sheet-title">Post löschen?</strong></div>
            <div className="sheet-body">
              <p className="sheet-sub">Der Post wird endgültig entfernt (inkl. Bilder).</p>
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" disabled={deleting} onClick={() => setDeleteTarget(null)}>Abbrechen</button>
              <button type="button" className="btn btn-danger" disabled={deleting} onClick={confirmDeletePost}>
                {deleting
                  ? <><i className="fa-solid fa-circle-notch fa-spin" /> Löschen …</>
                  : <><i className="fa-solid fa-trash" /> Löschen</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin-Einstellungen */}
      {settingsOpen && (
        <div className="sheet-backdrop" onClick={closeSettings}>
          <div className="sheet sheet-wide" role="dialog" aria-modal="true" aria-label="Community-Einstellungen" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={saveSettings} noValidate>
              <div className="sheet-head">
                <strong className="sheet-title">t/{comm.name} bearbeiten</strong>
                <button type="button" className="sheet-x" aria-label="Schließen" onClick={closeSettings}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <div className="sheet-body">
                <div className="create-label">Bild</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={pickPic}
                />
                <div className="pic-prev">
                  {previewImg ? <img src={previewImg} alt="Community-Bild" /> : <i className="fa-solid fa-users" />}
                  <span>{sPic ? 'Neues Bild gewählt.' : 'Aktuelles Bild.'}</span>
                  <button type="button" className="comment-btn" onClick={() => fileRef.current?.click()} aria-label="Bild ändern">
                    <i className="fa-solid fa-pen" />
                  </button>
                </div>
                <label className="field nomargin">
                  <span>Beschreibung</span>
                  <textarea
                    placeholder="Worum geht es in deinem Tontoo?"
                    value={sDesc}
                    rows={3}
                    maxLength={280}
                    onChange={(e) => setSDesc(e.target.value)}
                  />
                </label>
                <div className="create-label">Regeln ({sRules.length}/5)</div>
                {sRules.map((r, i) => (
                  <div key={i} className="rule-row">
                    <span className="rule-num" aria-hidden="true">{i + 1}.</span>
                    <input
                      type="text"
                      value={r}
                      maxLength={140}
                      placeholder={`Regel ${i + 1}`}
                      aria-label={`Regel ${i + 1}`}
                      onChange={(e) => setRule(i, e.target.value)}
                    />
                    <button
                      type="button"
                      className="comment-btn"
                      aria-label={`Regel ${i + 1} entfernen`}
                      onClick={() => removeRule(i)}
                      disabled={sRules.length <= 1}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                ))}
                {sRules.length < 5 && (
                  <button type="button" className="btn btn-ghost btn-block" onClick={addRule}>
                    <i className="fa-solid fa-plus" /> Regel hinzufügen
                  </button>
                )}
                {sError && (
                  <p className="formerror nomargin" role="alert">
                    <i className="fa-solid fa-circle-exclamation" /> {sError}
                  </p>
                )}
                {/* Danger Zone: Community löschen */}
                <div className="danger-zone">
                  <div className="danger-text">
                    <strong><i className="fa-solid fa-triangle-exclamation" /> Danger Zone</strong>
                    <small>Löscht t/{comm.name} mit allen Posts, Bildern und Follows – unwiderruflich.</small>
                  </div>
                  {!confirmCommDelete ? (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmCommDelete(true)}>
                      <i className="fa-solid fa-trash" /> Community löschen
                    </button>
                  ) : (
                    <div className="danger-confirm">
                      <span>Wirklich löschen?</span>
                      <button type="button" className="btn btn-ghost btn-sm" disabled={sBusy} onClick={() => setConfirmCommDelete(false)}>
                        Abbrechen
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" disabled={sBusy} onClick={deleteCommunity}>
                        {sBusy
                          ? <><i className="fa-solid fa-circle-notch fa-spin" /> Löschen …</>
                          : <><i className="fa-solid fa-trash" /> Endgültig löschen</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="sheet-foot">
                <button type="button" className="btn btn-ghost" onClick={closeSettings}>Abbrechen</button>
                <button type="submit" className="btn btn-brand" disabled={sBusy}>
                  {sBusy
                    ? <><i className="fa-solid fa-circle-notch fa-spin" /> Speichern …</>
                    : <><i className="fa-solid fa-check" /> Speichern</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
